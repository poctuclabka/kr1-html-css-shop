/* ============================================================
   Светлая / тёмная тема. Подключается в <head> до CSS,
   чтобы не было светлой вспышки при загрузке.
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'lhp-theme';
  var root = document.documentElement;
  var currentTheme = 'light';

  function readTheme() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      /* приватный режим — тема не сохранится */
    }
  }

  function updateButtons() {
    var isDark = currentTheme === 'dark';
    var buttons = document.querySelectorAll('.js-theme-toggle');
    var title = isDark ? 'Включить светлую тему' : 'Включить тёмную тему';

    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].textContent = isDark ? '☀️' : '🌙';
      buttons[i].setAttribute('title', title);
      buttons[i].setAttribute('aria-label', title);
      buttons[i].setAttribute('aria-pressed', isDark ? 'true' : 'false');
    }
  }

  function applyTheme(theme) {
    currentTheme = theme === 'dark' ? 'dark' : 'light';

    if (currentTheme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute(
        'content',
        currentTheme === 'dark' ? '#171c18' : '#fcfaf7'
      );
    }

    updateButtons();
  }

  function toggleTheme() {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    storeTheme(currentTheme);
  }

  function init() {
    updateButtons();
    var buttons = document.querySelectorAll('.js-theme-toggle');
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].addEventListener('click', toggleTheme);
    }
  }

  currentTheme = readTheme() === 'dark' ? 'dark' : 'light';
  applyTheme(currentTheme);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.LHPTheme = {
    get: function () {
      return currentTheme;
    },
    set: function (theme) {
      applyTheme(theme);
      storeTheme(currentTheme);
    },
  };
})();
