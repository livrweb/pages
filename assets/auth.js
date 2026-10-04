// Liver B — site-wide accounts stored in Firebase Realtime Database (no Firebase Auth, no SDK).
// Loaded on every page with: <script type="module" src="/assets/auth.js"></script>
//
// How it works: your password is stretched in the browser (PBKDF2) into a long key. Your data lives at
//   vault/<username>/<key>
// Nobody can list the keys under a username, so a vault only opens for someone who knows its key.
// The password itself is never sent or stored.

const DB = "https://randomass-d006a-default-rtdb.firebaseio.com";
export const configured = true;

/* ---------- storage helpers ---------- */
const ls = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
  del: k => { try { localStorage.removeItem(k); } catch (e) {} }
};
const SESSION = 'liverb-acct';
const SECRETS = { egg: ['eggFound', 'eggFoundAt'], bigshot: ['bigshotFound', 'bigshotFoundAt'] };
const FAVKEY = 'liverb-favs';
const localFavs = () => { try { const a = JSON.parse(ls.get(FAVKEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const err = code => Object.assign(new Error(code), { code });

export function localSecrets() {
  const o = {};
  for (const [k, [f, a]] of Object.entries(SECRETS)) o[k] = ls.get(f) === 'true' ? { found: true, at: +ls.get(a) || null } : { found: false };
  return o;
}

/* ---------- REST + crypto ---------- */
let session = null, rec = null;
try { session = JSON.parse(ls.get(SESSION)); } catch (e) {}

async function rest(method, u, key, body) {
  let r;
  try {
    r = await fetch(`${DB}/vault/${u}/${key}.json`, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  } catch (e) { throw err('NETWORK'); }
  if (!r.ok) throw err(r.status === 401 || r.status === 403 ? 'PERMISSION_DENIED' : 'NETWORK');
  return r.json();
}
async function deriveKey(u, pw) {
  if (!(window.crypto && crypto.subtle)) throw err('no-crypto');
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('liverb.v1:' + u), iterations: 210000 }, base, 256);
  return btoa(String.fromCharCode(...new Uint8Array(bits))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const normalize = s => String(s || '').trim().toLowerCase();
const validUser = u => /^[a-z0-9_]{3,20}$/.test(u);

/* ---------- state ---------- */
const subs = []; let ready = false;
const userObj = () => (session && rec ? { username: session.u, displayName: rec.name || session.u } : null);
export const user = userObj;
export const onUser = cb => { subs.push(cb); if (ready) cb(userObj()); };
const notify = () => { setNav(userObj()); subs.forEach(f => f(userObj())); };

/* ---------- actions ---------- */
async function open(u, key, record) {
  session = { u, key }; rec = record; ls.set(SESSION, JSON.stringify(session));
  try { await sync(); } catch (e) { console.warn('account sync failed:', e); }
  notify();
}
export async function signUp(username, pw, display) {
  const u = normalize(username);
  if (!validUser(u)) throw err('bad-username');
  if (!pw || pw.length < 6) throw err('weak-password');
  const key = await deriveKey(u, pw);
  const record = { name: (display || '').trim().slice(0, 30) || u, created: Date.now() };
  await rest('PUT', u, key, record);            // rules only allow this while the username is still free
  await open(u, key, record);
}
export async function signIn(username, pw) {
  const u = normalize(username);
  if (!validUser(u) || !pw) throw err('bad-login');
  const key = await deriveKey(u, pw);
  const record = await rest('GET', u, key);
  if (!record) throw err('bad-login');
  await open(u, key, record);
}
export function logout() { session = null; rec = null; ls.del(SESSION); ls.del(FAVKEY); notify(); }

export const profile = async () => (await rest('GET', session.u, session.key)) || {};
export const saveProfile = async patch => { await rest('PATCH', session.u, session.key, patch); };
export const rename = async name => { name = name.trim().slice(0, 30) || session.u; await saveProfile({ name }); rec.name = name; notify(); };
export const resetSecrets = async () => { Object.values(SECRETS).forEach(([f, a]) => { ls.del(f); ls.del(a); }); await saveProfile({ secrets: null }); };

/* ---------- favorite songs (stored on the account) ---------- */
export const favs = () => localFavs();
export async function setFavs(list) {
  if (!session || !rec) throw err('not-signed-in');
  ls.set(FAVKEY, JSON.stringify(list));
  rec.favs = list;
  await rest('PATCH', session.u, session.key, { favs: list.length ? list : null });
}

export function friendly(e) {
  const m = {
    'bad-username': 'Usernames are 3–20 letters, numbers or underscores.',
    'weak-password': 'Password needs at least 6 characters.',
    'bad-login': 'Wrong username or password.',
    'PERMISSION_DENIED': 'That username is taken, or the database rules aren\'t set up yet.',
    'NETWORK': 'Couldn\'t reach the database. Check your connection.',
    'no-crypto': 'Accounts need a secure (https) page.'
  };
  return m[e && e.code] || 'Something went wrong. Try again.';
}

/* ---------- nav link ---------- */
function setNav(u) {
  const ul = document.getElementById('nav-links'); if (!ul) return;
  let a = document.getElementById('acct-link');
  if (!a) {
    const li = document.createElement('li'); li.innerHTML = '<a href="/account/" id="acct-link"></a>';
    ul.insertBefore(li, ul.querySelector('.void-link') || ul.querySelector('.theme-btn-mobile'));
    a = li.firstChild;
  }
  a.textContent = u ? u.displayName.slice(0, 14) : 'Sign in';
  if (location.pathname.startsWith('/account')) a.classList.add('active');
}

/* ---------- sync: secrets union + favorites + theme ---------- */
async function sync() {
  const cloud = rec || {}, patch = {}, loc = localSecrets();
  for (const k of Object.keys(SECRETS)) {
    const c = (cloud.secrets || {})[k] || {};
    if (!loc[k].found && !c.found) continue;
    const ats = [loc[k].at, c.at].filter(Boolean), at = ats.length ? Math.min(...ats) : Date.now();
    if (!c.found || c.at !== at) { patch['secrets/' + k] = { found: true, at }; rec.secrets = { ...(rec.secrets || {}), [k]: { found: true, at } }; }
    if (!loc[k].found) { ls.set(SECRETS[k][0], 'true'); ls.set(SECRETS[k][1], String(at)); }
  }
  // favorites: the cloud copy wins; if the account has none yet, keep what's local
  if (Array.isArray(cloud.favs)) ls.set(FAVKEY, JSON.stringify(cloud.favs));
  else { const lf = localFavs(); if (lf.length) { patch.favs = lf; rec.favs = lf; } }
  const cur = document.documentElement.getAttribute('data-theme');
  if (cloud.theme && cloud.theme !== cur) {
    if (typeof window.applyTheme === 'function') window.applyTheme(cloud.theme);
    else { document.documentElement.setAttribute('data-theme', cloud.theme); ls.set('site-theme', cloud.theme); }
  } else if (!cloud.theme && cur) { patch.theme = cur; rec.theme = cur; }
  if (Object.keys(patch).length) await rest('PATCH', session.u, session.key, patch);
}

/* ---------- boot ---------- */
(async () => {
  if (session && session.u && session.key) {
    try {
      const record = await rest('GET', session.u, session.key);
      if (record) { rec = record; await sync().catch(e => console.warn('account sync failed:', e)); }
      else { session = null; ls.del(SESSION); }
    } catch (e) { /* offline or rules not set: stay signed out for this load, keep the session */ }
  }
  ready = true; notify();
  // keep the account theme in step with the nav theme button
  new MutationObserver(() => {
    const t = document.documentElement.getAttribute('data-theme');
    if (session && rec && t && rec.theme !== t) { rec.theme = t; rest('PATCH', session.u, session.key, { theme: t }).catch(() => {}); }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
