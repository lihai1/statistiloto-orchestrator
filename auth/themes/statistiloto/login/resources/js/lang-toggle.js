/**
 * Statistiloto Keycloak login theme — toolbar script.
 *
 * Creates a fixed top toolbar with two buttons matching the ui-fable
 * topbar actions:
 *  - Theme toggle (sun/moon icon) — adds/removes .app-dark on <html>
 *  - Language toggle (EN / עב) — fetches the other locale's page and
 *    swaps the DOM content in-place (no page reload)
 *
 * The toolbar position respects RTL/LTR:
 *  - Hebrew (RTL): top-left
 *  - English (LTR): top-right
 */
(function () {
  var THEME_KEY = 'statistiloto-theme';
  var toolbar = null;
  var langBtn = null;
  var themeBtn = null;
  var currentLocale = null;

  // SVG icons (Feather-style, matching PrimeIcons sun/moon)
  var SUN_SVG = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  var MOON_SVG = '<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function loadTheme() {
    try {
      return localStorage.getItem(THEME_KEY) || 'light';
    } catch (e) {
      return 'light';
    }
  }

  function saveTheme(mode) {
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch (e) { /* ignore */ }
  }

  function applyTheme(mode) {
    var html = document.documentElement;
    if (mode === 'dark') {
      html.classList.add('app-dark');
    } else {
      html.classList.remove('app-dark');
    }
    if (themeBtn) {
      themeBtn.innerHTML = mode === 'dark' ? SUN_SVG : MOON_SVG;
      themeBtn.setAttribute('aria-label', mode === 'dark' ? 'switch to light mode' : 'switch to dark mode');
    }
  }

  function toggleTheme() {
    var isDark = document.documentElement.classList.contains('app-dark');
    var next = isDark ? 'light' : 'dark';
    saveTheme(next);
    applyTheme(next);
  }

  function initTheme() {
    applyTheme(loadTheme());
  }

  function ensureDir() {
    var lang = document.documentElement.lang || 'he';
    if (!document.documentElement.dir) {
      document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    }
  }

  function getOtherLocaleUrl() {
    var select = document.getElementById('login-select-toggle');
    if (!select) return null;
    var options = Array.prototype.slice.call(select.options);
    if (options.length < 2) return null;
    return options[options.length - 1].value || null;
  }

  function buildToolbar() {
    // Don't rebuild if already present
    if (document.querySelector('.statistiloto-toolbar')) return;

    currentLocale = document.documentElement.lang || 'he';

    toolbar = document.createElement('div');
    toolbar.className = 'statistiloto-toolbar';

    // Theme button
    themeBtn = document.createElement('button');
    themeBtn.type = 'button';
    themeBtn.className = 'statistiloto-toolbar-btn statistiloto-theme-toggle';
    themeBtn.setAttribute('aria-label', 'toggle dark mode');
    themeBtn.addEventListener('click', toggleTheme);
    toolbar.appendChild(themeBtn);

    // Language button
    langBtn = document.createElement('button');
    langBtn.type = 'button';
    langBtn.className = 'statistiloto-toolbar-btn statistiloto-lang-toggle';
    langBtn.setAttribute('aria-label', 'toggle language');
    langBtn.textContent = currentLocale === 'he' ? 'EN' : '\u05E2\u05D1';
    langBtn.addEventListener('click', toggleLanguage);
    toolbar.appendChild(langBtn);

    document.body.appendChild(toolbar);

    // Set the theme icon now that the button exists
    applyTheme(loadTheme());
  }

  function hideSelectDropdown() {
    var select = document.getElementById('login-select-toggle');
    if (!select) return;
    var wrapper = select.closest('.pf-v5-c-form-control') || select.parentElement;
    if (wrapper) wrapper.style.display = 'none';
    else select.style.display = 'none';
  }

  function toggleLanguage() {
    var otherUrl = getOtherLocaleUrl();
    if (!otherUrl || !langBtn) return;
    langBtn.disabled = true;
    langBtn.style.opacity = '0.6';

    fetch(otherUrl, { credentials: 'same-origin' })
      .then(function (res) { return res.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');

        // Update <html> attributes
        document.documentElement.lang = doc.documentElement.lang;
        var newLang = doc.documentElement.lang || 'he';
        document.documentElement.dir = newLang === 'he' ? 'rtl' : 'ltr';

        // Update <title>
        document.title = doc.title;

        // Swap the login main content (header, body, footer)
        var newMain = doc.querySelector('.pf-v5-c-login__main');
        var oldMain = document.querySelector('.pf-v5-c-login__main');
        if (newMain && oldMain) {
          oldMain.innerHTML = newMain.innerHTML;
        }

        // Hide the new select dropdown
        hideSelectDropdown();

        // Update button text for the new locale
        currentLocale = newLang;
        langBtn.textContent = currentLocale === 'he' ? 'EN' : '\u05E2\u05D1';
      })
      .catch(function (err) {
        console.error('lang-toggle fetch failed:', err);
        window.location.href = otherUrl;
      })
      .finally(function () {
        langBtn.disabled = false;
        langBtn.style.opacity = '';
      });
  }

  function init() {
    ensureDir();
    initTheme();
    buildToolbar();
    hideSelectDropdown();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
