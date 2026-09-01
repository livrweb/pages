// Liver B — site.js : shared behavior across all pages
// (theme switching, nav, easter eggs, gallery fetch, etc.)

// --- THEME SWITCHER ---
const themes = ['darkroom', 'purple', 'terminal'];
const themeLabels = { darkroom: 'Darkroom', purple: 'Purple', terminal: 'Terminal' };
const htmlEl = document.documentElement;
const themeBtn = document.getElementById('theme-btn');
const themeBtnMobile = document.getElementById('theme-btn-mobile');
const themeLabel = document.getElementById('theme-label');
const themeLabelMobile = document.getElementById('theme-label-mobile');

function applyTheme(name) {
  htmlEl.setAttribute('data-theme', name);
  if (themeLabel) themeLabel.textContent = themeLabels[name];
  if (themeLabelMobile) themeLabelMobile.textContent = themeLabels[name];
  try { localStorage.setItem('site-theme', name); } catch(e) {}
}
function cycleTheme() {
  const current = htmlEl.getAttribute('data-theme') || 'darkroom';
  const next = themes[(themes.indexOf(current) + 1) % themes.length];
  applyTheme(next);
}
let savedTheme = null;
try { savedTheme = localStorage.getItem('site-theme'); } catch(e) {}
if (savedTheme && themes.includes(savedTheme)) applyTheme(savedTheme);

if (themeBtn) themeBtn.addEventListener('click', cycleTheme);
if (themeBtnMobile) themeBtnMobile.addEventListener('click', cycleTheme);

// --- TOAST HELPER ---
const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
}

// --- COPY EMAIL (contact page only) ---
const copyBtn = document.getElementById('copy-email-btn');
if (copyBtn) {
  copyBtn.addEventListener('click', async () => {
    const email = document.getElementById('contact-email').textContent.trim();
    try {
      await navigator.clipboard.writeText(email);
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      showToast('Email copied to clipboard');
    } catch (e) {
      showToast('Copy failed — select it manually');
    }
    setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 1800);
  });
}

// --- EXPERIMENT SEARCH + FILTER (experiments page only) ---
const expSearch = document.getElementById('exp-search');
if (expSearch) {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const expCards = document.querySelectorAll('.exp-card');
  const expEmpty = document.getElementById('exp-empty');
  const expCount = document.getElementById('exp-count');
  let activeFilter = 'all';

  function refreshExperiments() {
    const query = expSearch.value.trim().toLowerCase();
    let visible = 0;
    expCards.forEach(card => {
      const matchesFilter = activeFilter === 'all' || card.dataset.tag === activeFilter;
      const matchesQuery = card.dataset.name.includes(query);
      const show = matchesFilter && matchesQuery;
      card.classList.toggle('hidden', !show);
      if (show) visible++;
    });
    if (expEmpty) expEmpty.style.display = visible === 0 ? 'block' : 'none';
    if (expCount) expCount.textContent = String(visible).padStart(2, '0') + ' project' + (visible === 1 ? '' : 's');
  }

  expSearch.addEventListener('input', refreshExperiments);
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      refreshExperiments();
    });
  });

  document.querySelectorAll('.details-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.exp-card');
      const expanded = card.classList.toggle('expanded');
      btn.textContent = expanded ? 'Hide' : 'Details';
    });
  });
}

// --- SCROLL PROGRESS BAR ---
const progressBar = document.getElementById('scroll-progress');
function updateProgress() {
  if (!progressBar) return;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  progressBar.style.width = pct + '%';
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

// --- ACTIVE NAV LINK: highlight whichever nav link points to this page ---
(function highlightActiveNav() {
  const here = location.pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const target = a.getAttribute('href');
    if (!target || target.startsWith('#')) return;
    const targetPath = target.split('#')[0].replace(/\/index\.html$/, '/').replace(/\/$/, '') || '/';
    a.classList.toggle('active', targetPath === here);
  });
})();

// --- REVEAL ON SCROLL ---
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
}

// --- MOBILE NAV TOGGLE ---
const navToggle = document.getElementById('nav-toggle');
const navLinksEl = document.getElementById('nav-links');
const navBackdrop = document.getElementById('nav-backdrop');

function closeNav() {
  if (!navToggle) return;
  navToggle.classList.remove('open');
  navLinksEl.classList.remove('open');
  navBackdrop.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
}
function openNav() {
  navToggle.classList.add('open');
  navLinksEl.classList.add('open');
  navBackdrop.classList.add('open');
  navToggle.setAttribute('aria-expanded', 'true');
}
if (navToggle) {
  navToggle.addEventListener('click', () => {
    navLinksEl.classList.contains('open') ? closeNav() : openNav();
  });
  navBackdrop.addEventListener('click', closeNav);
  navLinksEl.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });
}

// --- LIGHTBOX (photos page only) ---
const lightbox = document.getElementById('lightbox');
let openLightbox = () => {};
let closeLightbox = () => {};
if (lightbox) {
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCap = document.getElementById('lightbox-cap');
  const lightboxClose = document.getElementById('lightbox-close');

  openLightbox = function (src, caption) {
    lightboxImg.src = src;
    lightboxCap.textContent = caption || '';
    lightbox.classList.add('open');
  };
  closeLightbox = function () {
    lightbox.classList.remove('open');
    lightboxImg.src = '';
  };
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
}

// --- ONCE THE EGG HAS BEEN FOUND, THINGS ARE A LITTLE OFF ---
(function () {
  let found = false;
  try { found = localStorage.getItem('eggFound') === 'true'; } catch (e) {}
  if (!found) return;

  document.body.classList.add('egg-found');

  const whisperLines = [
    'he knows you found him.',
    "you're not alone here.",
    'he remembers you.',
    "he's still under the tree.",
    "he's looking for freedom.",
    "he still wants to be a big shot.",
    "don't run.",
    "don't look behind you."
  ];
  const whisper = document.getElementById('whisper');
  if (whisper) whisper.textContent = whisperLines[Math.floor(Math.random() * whisperLines.length)];

  // a quiet extra line by the photo stream — only once he's been found
  const photosLabel = document.querySelector('#photos .section-head span');
  if (photosLabel) photosLabel.textContent += ' · he\u2019s in some of these.';

  // tab title changes while you're away, reverts when you come back
  const originalTitle = document.title;
  const awayTitles = ['...come back.', 'still here.', "don't go.", "please.... stay.", "...help..."];
  window.addEventListener('blur', () => {
    document.title = awayTitles[Math.floor(Math.random() * awayTitles.length)];
  });
  window.addEventListener('focus', () => {
    document.title = originalTitle;
  });

  // a rare, brief flicker — checked occasionally, fires occasionally
  function maybeFlicker() {
    if (Math.random() < 0.1) {
      const flash = document.createElement('div');
      flash.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;z-index:9999;pointer-events:none;transition:opacity .08s ease;';
      document.body.appendChild(flash);
      requestAnimationFrame(() => { flash.style.opacity = '0.88'; });
      setTimeout(() => {
        flash.style.opacity = '0';
        setTimeout(() => flash.remove(), 250);
      }, 90);
    }
    setTimeout(maybeFlicker, 20000 + Math.random() * 40000);
  }
  setTimeout(maybeFlicker, 10000);

  // a quiet line that only shows up if you sit still for a while
  const idleWhisperEl = document.getElementById('idle-whisper');
  const idleLines = ['still there?', "he's still here.", "...he's waiting."];
  let idleTimer;
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(showIdleWhisper, 90000 + Math.random() * 60000);
  }
  function showIdleWhisper() {
    if (!idleWhisperEl) return;
    idleWhisperEl.textContent = idleLines[Math.floor(Math.random() * idleLines.length)];
    idleWhisperEl.classList.add('show');
    setTimeout(() => idleWhisperEl.classList.remove('show'), 6000);
    resetIdle();
  }
  ['mousemove', 'keydown', 'scroll', 'click'].forEach(evt => {
    window.addEventListener(evt, resetIdle, { passive: true });
  });
  resetIdle();

  console.log('%cyou shouldn\'t have opened this.', 'color:#c8341f;font-family:monospace;font-size:13px;');
})();

// --- SHARED GUARD: ignore keyword buffers while typing in a field ---
function isTypingContext(e) {
  const t = e.target;
  return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable));
}

// note to self: stop leaving these in. someone's going to read them.
// (you did it again.)
function _doNotCall() {
  // if you're calling this from the console, you already know too much
  return atob('SGUgd2FzIHdhdGNoaW5nIHlvdSByZWFkIHRoaXMu');
}

// --- VOID / ADMIN VAULT: works from any page, lives on studio.html ---
// typing the code anywhere unlocks it site-wide (Void shows up in every
// nav) and takes you to where the vault actually lives if you're not
// already there.
function unlockVoid() {
  try { sessionStorage.setItem('voidUnlocked', '1'); } catch (e) {}
  document.body.classList.add('admin-mode-active');
  const vault = document.getElementById('admin-vault');
  if (vault) {
    vault.style.display = 'block';
    showToast('Void unlocked');
    vault.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    showToast('Void unlocked');
    window.location.href = '/studio.html#admin-vault';
  }
}
(function restoreVoidState() {
  let unlocked = false;
  try { unlocked = sessionStorage.getItem('voidUnlocked') === '1'; } catch (e) {}
  if (!unlocked) return;
  document.body.classList.add('admin-mode-active');
  const vault = document.getElementById('admin-vault');
  if (vault) vault.style.display = 'block';
})();

// ================= UNIFIED CODE WATCHER =================
// every typed-word easter egg on the page runs through this one buffer +
// dispatch table instead of a pile of duplicate listeners. codes get
// checked longest-first so "iddqd" doesn't get shadowed by a shorter code
// sitting earlier in the array, etc.

const RICKROLL_URL = atob('aHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g/dj1kUXc0dzlXZ1hjUQ==');

function rickroll() {
  window.location.href = RICKROLL_URL;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = a[i - 1] === b[j - 1]
        ? d[i - 1][j - 1]
        : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
    }
  }
  return d[m][n];
}

const codeWatchers = [
  // old admin code, replaced — left here on purpose.
  // he changed the locks. this one doesn't lead where you think.
  { code: 'letmein', typoTolerant: true, action: rickroll },

  { code: 'adminpasswordlmao', action: unlockVoid },

  { code: 'egg', action: () => { window.location.href = '/egg/'; } },
  { code: 'bigshot', action: () => { window.location.href = '/bigshot/'; } },

  { code: 'party', typoTolerant: true, action: () => togglePartyMode() },
  { code: 'rave', typoTolerant: true, action: () => togglePartyMode() },

  { code: 'idkfa', typoTolerant: true, action: () => activateDoomCheat('cursor') },
  { code: 'iddqd', typoTolerant: true, action: () => activateDoomCheat('god') },
];

// longest codes first so a long code's tail can't be swallowed by a
// shorter one still sitting in the buffer check loop
codeWatchers.sort((a, b) => b.code.length - a.code.length);
const maxCodeLen = Math.max(...codeWatchers.map(w => w.code.length));

let codeBuffer = "";
let lastFiredAt = 0;

document.addEventListener('keydown', (e) => {
  if (isTypingContext(e)) return;
  if (e.key.length !== 1) return; // ignore Shift, Escape, arrow keys, etc.

  codeBuffer += e.key.toLowerCase();
  if (codeBuffer.length > maxCodeLen) {
    codeBuffer = codeBuffer.slice(codeBuffer.length - maxCodeLen);
  }

  for (const watcher of codeWatchers) {
    const tail = codeBuffer.slice(codeBuffer.length - watcher.code.length);
    if (tail === watcher.code) {
      watcher.action();
      codeBuffer = "";
      lastFiredAt = Date.now();
      return;
    }
  }

  // typo net: if nothing matched exactly, see if the buffer's tail is
  // *one keystroke off* from a typo-tolerant code. miss the code, still
  // get got.
  if (Date.now() - lastFiredAt < 400) return; // don't double-fire mid-buffer
  for (const watcher of codeWatchers) {
    if (!watcher.typoTolerant) continue;
    // only compare once the buffer has reached (or passed by one) the
    // code's own length — checking shorter windows would flag someone
    // who is simply *mid-way through typing the correct word* as a typo
    // (e.g. "letmei" reads as "letmein" minus a letter).
    for (const len of [watcher.code.length, watcher.code.length + 1]) {
      if (codeBuffer.length < len) continue;
      const tail = codeBuffer.slice(codeBuffer.length - len);
      if (levenshtein(tail, watcher.code) === 1) {
        rickroll();
        lastFiredAt = Date.now();
        return;
      }
    }
  }
});

// --- party / rave ---
let partyActive = false;
const partyAudio = new Audio('https://t4.bcbits.com/stream/441347e0d89e69b03162c9f0c6771d5f/mp3-128/1307221412?p=0&ts=1788307682&t=755f039a3c106d68b3929989b25a766a4ed6d1e0&token=1788307682_1b9df4b029281ddbc16fb29f394f06e4a9b37c51');

// Optional: loop audio while party mode is on
partyAudio.loop = true;

function togglePartyMode() {
  partyActive = !partyActive;
  document.body.classList.toggle('party-mode', partyActive);
  const disco = document.getElementById('disco-ball');
  if (disco) disco.classList.toggle('show', partyActive);
  showToast(partyActive ? "it's a party." : 'party over. lights on.');
}

// --- doom cheats ---
function activateDoomCheat(kind) {
  if (kind === 'cursor') {
    document.body.classList.toggle('doom-cursor');
    showToast(document.body.classList.contains('doom-cursor') ? 'idkfa — full arsenal.' : 'weapons stowed.');
  } else {
    document.body.classList.toggle('god-mode');
    showToast(document.body.classList.contains('god-mode') ? 'iddqd — god mode.' : 'god mode off.');
  }
}

// --- BONUS EASTER EGG: KONAMI CODE ---
const konami = ['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright','b','a'];
let konamiBuffer = [];
document.addEventListener('keydown', (e) => {
  if (isTypingContext(e)) return;
  konamiBuffer.push(e.key.toLowerCase());
  if (konamiBuffer.length > konami.length) konamiBuffer.shift();
  if (konamiBuffer.join(',') === konami.join(',')) {
    document.body.style.transition = 'filter .4s ease';
    document.body.style.filter = 'invert(1) hue-rotate(180deg)';
    showToast('Konami code — nice.');
    setTimeout(() => { document.body.style.filter = 'none'; }, 2200);
    konamiBuffer = [];
  }
});

// --- DRAGGABLE PIN: drag it off the photo to find what's underneath (home page only) ---
(function setupDecoPin() {
  const pin = document.getElementById('deco-pin');
  const note = document.getElementById('hidden-note');
  if (!pin || !note) return;
  let dragging = false, revealed = false, startX = 0, startY = 0;

  pin.addEventListener('pointerdown', (e) => {
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    pin.setPointerCapture(e.pointerId);
  });
  pin.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    pin.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 2}deg)`;
    if (!revealed && Math.hypot(dx, dy) > 26) {
      revealed = true;
      note.classList.add('show');
      showToast('found something under the pin.');
    }
  });
  function release() {
    dragging = false;
    pin.style.transition = 'transform .3s ease';
    pin.style.transform = '';
    setTimeout(() => { pin.style.transition = ''; }, 300);
  }
  pin.addEventListener('pointerup', release);
  pin.addEventListener('pointercancel', release);
})();

// --- LOGO: 7 clicks detaches it into a draggable, flingable ball ---
(function setupLogoBall() {
  const logo = document.getElementById('site-logo');
  if (!logo) return;
  let clicks = 0, clickTimer = null;

  logo.addEventListener('click', (e) => {
    clicks++;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { clicks = 0; }, 1200);
    if (clicks < 7) return;
    e.preventDefault();
    clicks = 0;
    spawnLogoBall(logo);
  });

  function spawnLogoBall(sourceEl) {
    const rect = sourceEl.getBoundingClientRect();
    sourceEl.classList.add('spin-out');
    showToast('the logo has had enough.');

    const ball = document.createElement('div');
    ball.id = 'logo-ball';
    ball.textContent = 'B';
    ball.style.left = rect.left + rect.width / 2 - 23 + 'px';
    ball.style.top = rect.top + rect.height / 2 - 23 + 'px';
    document.body.appendChild(ball);

    let x = rect.left, y = rect.top;
    let vx = (Math.random() - 0.5) * 14, vy = -6;
    const gravity = 0.55, damping = 0.72, floor = window.innerHeight - 46;
    let dragging = false, lastMove = { x: 0, y: 0, t: 0 };

    function physicsStep() {
      if (!dragging) {
        vy += gravity;
        x += vx; y += vy;
        if (y > floor) { y = floor; vy *= -damping; vx *= 0.85; }
        if (x < 0) { x = 0; vx *= -damping; }
        if (x > window.innerWidth - 46) { x = window.innerWidth - 46; vx *= -damping; }
        ball.style.left = x + 'px'; ball.style.top = y + 'px';
      }
      requestAnimationFrame(physicsStep);
    }
    requestAnimationFrame(physicsStep);

    ball.addEventListener('pointerdown', (e) => {
      dragging = true;
      ball.setPointerCapture(e.pointerId);
      lastMove = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    ball.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      x = e.clientX - 23; y = e.clientY - 23;
      ball.style.left = x + 'px'; ball.style.top = y + 'px';
      const now = performance.now();
      const dt = Math.max(now - lastMove.t, 1);
      vx = (e.clientX - lastMove.x) / dt * 16;
      vy = (e.clientY - lastMove.y) / dt * 16;
      lastMove = { x: e.clientX, y: e.clientY, t: now };
    });
    ball.addEventListener('pointerup', () => { dragging = false; });
    ball.addEventListener('pointercancel', () => { dragging = false; });

    setTimeout(() => { sourceEl.style.visibility = 'hidden'; }, 600);
  }
})();

// --- CONSOLE MESSAGE FOR FELLOW DEVS ---
console.log('%cLooking for the source? It is right here — view-source is right there in the menu.', 'color:#e8542c;font-family:monospace;font-size:12px;');

// --- BACKUP CAPTION DICTIONARY ---
const backupPhotoCaptions = {
  "AP1GczObmw5Uy_FA1FyPL": "Took downtown Rochester NY",
  "AP1GczPHMyF8zrcPZcste": "Caught at lakeside diner",
  "AP1GczMeIrqT8_uNV4K_RxhM": "Boat in Sodus NY"
};

// fetchLatestData powers both the hero profile photo (home page) and the
// gallery (photos page). each page only has one of the two elements, so
// this only fills in whichever one is actually present.
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById('gallery-container');
  const pfpElement = document.getElementById('dynamic-pfp');
  if (container || pfpElement) fetchLatestData(container, pfpElement);
});

// Google Photos share URLs sometimes come back from the Worker with a
// stacked/duplicated size suffix (e.g. "...GDg=w54-h72-no=w1000-no-tmp"),
// which Google's CDN rejects outright (NS_ERROR_DOM_NETWORK_ERR in Firefox,
// a broken image in Chrome). Strip every "=w###-h###[-no][-tmp]" suffix and
// re-append one clean one so the browser always gets a valid URL.
//
// This ONLY applies to lh3.googleusercontent.com (Google Photos) URLs. The
// YouTube avatar (yt3.googleusercontent.com) uses a different suffix scheme
// entirely (e.g. "=s900-c-k-c0x00ffffff-no-rj") — running this same regex
// on that would find nothing to strip but still tack "=w1000" onto the end,
// producing a malformed URL that fails to load. So: bail out early for
// anything that isn't the lh3 host.
//
// Also bail out if the URL already has a "?" query string — that's a sign
// it's already a complete, ready-to-use URL (e.g. the egg-swap replacement
// photos, which look like "...=w477-h634-s-no?authuser=0") rather than a
// bare Google Photos ID that needs a size suffix appended. Running the
// regex on one of those partially matches (it doesn't recognize the "-s-no"
// shape) and then appends "=w1000" onto the end of the existing query
// string, producing "...?authuser=0=w1000" — also malformed.
function sanitizeGooglePhotoUrl(url) {
  if (!url) return url;
  if (!url.startsWith('https://lh3.googleusercontent.com/')) return url;
  if (url.includes('?')) return url;
  return url.replace(/=w\d+(-h\d+)?(-no)?(-tmp)?/g, '') + '=w1000';
}

async function fetchLatestData(container, pfpElement) {
  let eggFound = false;
  try { eggFound = localStorage.getItem('eggFound') === 'true'; } catch (e) {}

  const WORKER_URL = eggFound
    ? 'https://photoapi.kcanada6031-6d9.workers.dev/?egg=true'
    : 'https://photoapi.kcanada6031-6d9.workers.dev/';

  try {
    const response = await fetch(WORKER_URL);
    if (!response.ok) throw new Error("API response error");

    const data = await response.json();

    if (data.pfpUrl && pfpElement) {
      pfpElement.src = sanitizeGooglePhotoUrl(data.pfpUrl);
    }

    if (!container) return;

    const images = data.images;
    container.innerHTML = '';

    if (!images || images.length === 0) {
      container.innerHTML = '<div class="loading-text">No photos found in the album.</div>';
      return;
    }

    images.forEach(imgData => {
      const cleanUrl = sanitizeGooglePhotoUrl(imgData.url);
      const item = document.createElement('div');
      item.className = 'gallery-item';

      const img = document.createElement('img');
      img.src = cleanUrl;
      img.alt = imgData.caption || 'Google Photos Update';
      img.loading = 'lazy';

      // Google's CDN occasionally drops a request when many images load in
      // parallel (rate limiting / transient network blip), leaving the
      // browser showing alt text instead of the photo. Retry a couple of
      // times with a short delay before giving up, since a plain reload
      // almost always succeeds.
      let retries = 0;
      img.addEventListener('error', () => {
        if (retries >= 2) return;
        retries += 1;
        setTimeout(() => {
          img.src = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}retry=${retries}-${Date.now()}`;
        }, 600 * retries);
      });

      item.appendChild(img);

      const urlMatch = cleanUrl.match(/\/pw\/([a-zA-Z0-9\-_=]{20})/);
      if (urlMatch && urlMatch[1]) {
        const snippetDiv = document.createElement('div');
        snippetDiv.className = 'admin-snippet';
        snippetDiv.textContent = urlMatch[1];
        item.appendChild(snippetDiv);
      }

      let finalCaption = imgData.caption;
      if (!finalCaption) {
        for (const urlSnippet in backupPhotoCaptions) {
          if (cleanUrl.includes(urlSnippet)) {
            finalCaption = backupPhotoCaptions[urlSnippet];
            break;
          }
        }
      }

      if (finalCaption) {
        const captionDiv = document.createElement('div');
        captionDiv.className = 'caption-overlay';
        captionDiv.textContent = finalCaption;
        item.appendChild(captionDiv);
      }

      item.addEventListener('click', () => openLightbox(cleanUrl, finalCaption || ''));

      container.appendChild(item);
    });

  } catch (error) {
    console.error("Failed to fetch data:", error);
    if (container) container.innerHTML = '<div class="loading-text">Unable to load live data. Showing fallback mode.</div>';
  }
}
