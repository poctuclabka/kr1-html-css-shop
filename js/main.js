/* ============================================================
   Общие скрипты: тосты, высота шапки, кнопка «Наверх»,
   фильтры каталога, отзывы, быстрый заказ, сбор корма.
   ============================================================ */
(function () {
  'use strict';

  window.LHP = window.LHP || {};

  function formatPrice(value) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  }

  function pluralize(count, one, few, many) {
    var abs = Math.abs(count) % 100;
    var last = abs % 10;
    if (abs > 10 && abs < 20) return many;
    if (last > 1 && last < 5) return few;
    if (last === 1) return one;
    return many;
  }

  function reviewsLabel(count) {
    return count + ' ' + pluralize(count, 'отзыв', 'отзыва', 'отзывов');
  }

  function formatDate(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  function starsFor(rating) {
    var filled = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    var result = '';
    for (var i = 0; i < 5; i += 1) {
      result += i < filled ? '★' : '☆';
    }
    return result;
  }

  function getToastStack() {
    var stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      stack.setAttribute('aria-live', 'polite');
      stack.setAttribute('aria-atomic', 'true');
      document.body.appendChild(stack);
    }
    return stack;
  }

  function showToast(message, isSuccess) {
    var success = isSuccess !== false;
    var stack = getToastStack();
    var toast = document.createElement('div');
    toast.className = 'toast app-toast' + (success ? '' : ' app-toast--danger');
    toast.setAttribute('role', 'alert');
    toast.innerHTML =
      '<span class="app-toast__icon" aria-hidden="true">' +
      (success ? '✅' : '⚠️') +
      '</span><div class="app-toast__text"></div>' +
      '<button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Закрыть уведомление"></button>';

    toast.querySelector('.app-toast__text').textContent = message;
    stack.appendChild(toast);

    if (window.bootstrap && window.bootstrap.Toast) {
      var instance = new window.bootstrap.Toast(toast, { delay: 4500 });
      toast.addEventListener('hidden.bs.toast', function () {
        toast.remove();
      });
      instance.show();
    } else {
      toast.classList.add('show');
      window.setTimeout(function () {
        toast.remove();
      }, 4500);
    }
  }

  window.LHP.formatPrice = formatPrice;
  window.LHP.pluralize = pluralize;
  window.LHP.reviewsLabel = reviewsLabel;
  window.LHP.formatDate = formatDate;
  window.LHP.starsFor = starsFor;
  window.LHP.showToast = showToast;

  /* ---------- высота шапки для sticky-блоков ---------- */
  function initNavbarHeight() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    function update() {
      var height = header.offsetHeight;
      if (height > 0) {
        document.documentElement.style.setProperty(
          '--navbar-height',
          height + 'px'
        );
      }
    }

    update();
    window.addEventListener('resize', update);
    window.addEventListener('load', update);

    if (typeof ResizeObserver !== 'undefined') {
      var observer = new ResizeObserver(update);
      observer.observe(header);
    }
  }

  /* ---------- кнопка «Наверх» ---------- */
  function initScrollTop() {
    var button = document.getElementById('scroll-top');
    if (!button) return;

    function toggle() {
      if (window.scrollY > 320) {
        button.classList.add('scroll-top--visible');
      } else {
        button.classList.remove('scroll-top--visible');
      }
    }

    toggle();
    window.addEventListener('scroll', toggle, { passive: true });
    button.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- счётчики количества на странице товара ---------- */
  function initQuantityControls() {
    var controls = document.querySelectorAll('[data-qty-control]');
    Array.prototype.forEach.call(controls, function (control) {
      var input = control.querySelector('[data-qty-input]');
      var minus = control.querySelector('[data-qty-minus]');
      var plus = control.querySelector('[data-qty-plus]');
      if (!input) return;

      function clamp(value) {
        var min = Number(input.min) || 1;
        var max = Number(input.max) || 99;
        return Math.min(max, Math.max(min, Number(value) || min));
      }

      function sync() {
        input.value = clamp(input.value);
        if (minus) minus.disabled = Number(input.value) <= Number(input.min || 1);
        if (plus) plus.disabled = Number(input.value) >= Number(input.max || 99);
      }

      if (minus) {
        minus.addEventListener('click', function () {
          input.value = clamp(Number(input.value) - 1);
          sync();
        });
      }
      if (plus) {
        plus.addEventListener('click', function () {
          input.value = clamp(Number(input.value) + 1);
          sync();
        });
      }
      input.addEventListener('change', sync);
      sync();
    });
  }

  /* ---------- фильтры и сортировка каталога ---------- */
  function initCatalog() {
    var grid = document.getElementById('catalog-grid');
    var form = document.getElementById('filter-form');
    if (!grid || !form) return;

    var wrappers = Array.prototype.slice.call(grid.children);
    var entries = wrappers
      .map(function (wrapper) {
        return {
          wrapper: wrapper,
          card: wrapper.querySelector('.product-card'),
        };
      })
      .filter(function (entry) {
        return Boolean(entry.card);
      });
    var search = document.getElementById('catalog-search');
    var sort = document.getElementById('catalog-sort');
    var count = document.getElementById('catalog-count');
    var noResults = document.getElementById('no-results');
    var reset = document.getElementById('reset-filters');

    function getFilters() {
      var checked = form.querySelector('input[name="category"]:checked');
      return {
        category: checked ? checked.value : 'all',
        type: document.getElementById('filter-type').value,
        minPrice:
          Number(document.getElementById('filter-price-min').value) || 0,
        maxPrice:
          Number(document.getElementById('filter-price-max').value) ||
          Number.POSITIVE_INFINITY,
        inStock: document.getElementById('filter-stock').checked,
        search: (search.value || '').trim().toLowerCase(),
        sort: sort.value,
      };
    }

    function sortCards(mode) {
      var sorted = entries.slice();
      sorted.sort(function (a, b) {
        var priceA = Number(a.card.dataset.price);
        var priceB = Number(b.card.dataset.price);
        var ratingA = Number(a.card.dataset.rating);
        var ratingB = Number(b.card.dataset.rating);
        var hitA = a.card.dataset.badge === 'hit' ? 1 : 0;
        var hitB = b.card.dataset.badge === 'hit' ? 1 : 0;
        var stockA = a.card.dataset.stock === '1' ? 1 : 0;
        var stockB = b.card.dataset.stock === '1' ? 1 : 0;

        if (mode === 'price-asc') return priceA - priceB;
        if (mode === 'price-desc') return priceB - priceA;
        if (mode === 'rating') return ratingB - ratingA;
        return (
          hitB - hitA || stockB - stockA || ratingB - ratingA || priceA - priceB
        );
      });

      sorted.forEach(function (entry) {
        grid.appendChild(entry.wrapper);
      });
    }

    function applyFilters() {
      var filters = getFilters();
      var visible = 0;

      entries.forEach(function (entry) {
        var card = entry.card;
        var categoryMatch =
          filters.category === 'all' ||
          card.dataset.category === filters.category;
        var typeMatch =
          filters.type === 'all' || card.dataset.type === filters.type;
        var price = Number(card.dataset.price);
        var priceMatch =
          price >= filters.minPrice && price <= filters.maxPrice;
        var stockMatch =
          !filters.inStock || card.dataset.stock === '1';
        var searchMatch =
          !filters.search ||
          (card.dataset.name || '').toLowerCase().indexOf(filters.search) !==
            -1;

        var isVisible =
          categoryMatch && typeMatch && priceMatch && stockMatch && searchMatch;
        entry.wrapper.classList.toggle('d-none', !isVisible);
        if (isVisible) visible += 1;
      });

      sortCards(filters.sort);

      if (count) {
        count.textContent =
          visible + ' ' + pluralize(visible, 'товар', 'товара', 'товаров');
      }
      if (noResults) {
        noResults.classList.toggle('d-none', visible !== 0);
      }
    }

    function updateUrl(category) {
      var url = new URL(window.location.href);
      if (category === 'all') {
        url.searchParams.delete('category');
      } else {
        url.searchParams.set('category', category);
      }
      window.history.replaceState({}, '', url);
    }

    var initialCategory = new URLSearchParams(window.location.search).get(
      'category'
    );
    if (initialCategory) {
      Array.prototype.forEach.call(
        form.querySelectorAll('input[name="category"]'),
        function (radio) {
          if (radio.value === initialCategory) radio.checked = true;
        }
      );
    }

    form.addEventListener('change', function (event) {
      applyFilters();
      if (event.target.name === 'category') {
        updateUrl(event.target.value);
      }
    });
    form.addEventListener('input', function (event) {
      if (event.target.type === 'number') applyFilters();
    });
    if (search) search.addEventListener('input', applyFilters);
    if (sort) sort.addEventListener('change', applyFilters);

    if (reset) {
      reset.addEventListener('click', function () {
        form.reset();
        if (search) search.value = '';
        if (sort) sort.value = 'popular';
        var all = form.querySelector('input[name="category"][value="all"]');
        if (all) all.checked = true;
        applyFilters();
        updateUrl('all');
      });
    }

    var noResultsReset = document.getElementById('no-results-reset');
    if (noResultsReset) {
      noResultsReset.addEventListener('click', function () {
        if (reset) reset.click();
      });
    }

    applyFilters();
  }

  /* ---------- отзывы на странице товара ---------- */
  function initReviews() {
    var section = document.getElementById('reviews');
    if (!section) return;

    var slug = section.dataset.productSlug;
    var list = document.getElementById('reviews-list');
    var form = document.getElementById('review-form');
    var nameInput = document.getElementById('review-name');
    var textInput = document.getElementById('review-text');
    var ratingInput = document.getElementById('review-rating');
    var starButtons = Array.prototype.slice.call(
      section.querySelectorAll('#star-picker [data-rating]')
    );
    var storageKey = 'lhp-reviews-' + slug;

    if (!slug || !list || !form) return;

    function readSaved() {
      try {
        var data = JSON.parse(
          window.localStorage.getItem(storageKey) || '[]'
        );
        if (!Array.isArray(data)) return [];
        return data.filter(function (review) {
          return (
            review &&
            typeof review.author === 'string' &&
            typeof review.text === 'string' &&
            Number(review.rating) >= 1
          );
        });
      } catch (error) {
        return [];
      }
    }

    function saveSaved(reviews) {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(reviews));
      } catch (error) {
        /* хранилище недоступно — отзыв останется только на странице */
      }
    }

    function setRating(value) {
      var rating = Math.max(1, Math.min(5, Number(value) || 5));
      if (ratingInput) ratingInput.value = String(rating);
      starButtons.forEach(function (button) {
        var active = Number(button.dataset.rating) <= rating;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }

    function createReview(review) {
      var article = document.createElement('article');
      article.className = 'review-item';
      article.dataset.rating = String(review.rating);

      var head = document.createElement('div');
      head.className = 'review-item__head';

      var meta = document.createElement('div');
      var author = document.createElement('span');
      author.className = 'review-item__author';
      author.textContent = review.author;

      var date = document.createElement('span');
      date.className = 'review-item__date';
      date.textContent = ' · ' + formatDate(review.date);

      var stars = document.createElement('span');
      stars.className = 'review-item__stars';
      stars.setAttribute(
        'aria-label',
        'Оценка ' + review.rating + ' из 5'
      );
      stars.textContent = starsFor(review.rating);

      meta.appendChild(author);
      meta.appendChild(date);
      head.appendChild(meta);
      head.appendChild(stars);

      var text = document.createElement('p');
      text.className = 'review-item__text';
      text.textContent = review.text;

      article.appendChild(head);
      article.appendChild(text);
      list.appendChild(article);
    }

    function updateSummary() {
      var items = Array.prototype.slice.call(
        list.querySelectorAll('.review-item')
      );
      var ratings = items.map(function (item) {
        return Number(item.dataset.rating) || 0;
      });
      var count = ratings.length;
      var average =
        count > 0
          ? Math.round(
              (ratings.reduce(function (sum, value) {
                return sum + value;
              }, 0) /
                count) *
                10
            ) / 10
          : 0;

      var averageElement = document.getElementById('reviews-average');
      var countElement = document.getElementById('reviews-count');
      var starsElement = document.getElementById('reviews-stars');
      var topValue = document.getElementById('product-rating-value');
      var topCount = document.getElementById('product-rating-count');

      if (averageElement) averageElement.textContent = average.toFixed(1);
      if (countElement) countElement.textContent = reviewsLabel(count);
      if (starsElement) starsElement.textContent = starsFor(average);
      if (topValue) topValue.textContent = average.toFixed(1);
      if (topCount) topCount.textContent = reviewsLabel(count);
    }

    var saved = readSaved();
    saved.forEach(createReview);
    updateSummary();

    starButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        setRating(button.dataset.rating);
      });
    });
    setRating(5);

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var name = nameInput.value.trim();
      var text = textInput.value.trim();
      var rating = Number(ratingInput.value);
      var valid = true;

      if (name.length < 2) {
        nameInput.classList.add('is-invalid');
        valid = false;
      } else {
        nameInput.classList.remove('is-invalid');
      }

      if (text.length < 10) {
        textInput.classList.add('is-invalid');
        valid = false;
      } else {
        textInput.classList.remove('is-invalid');
      }

      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        valid = false;
      }

      if (!valid) {
        showToast(
          'Проверьте имя и текст отзыва — чего-то не хватает.',
          false
        );
        return;
      }

      var review = {
        id: 'user-' + Date.now(),
        author: name,
        rating: rating,
        date: new Date().toISOString().slice(0, 10),
        text: text,
      };

      createReview(review);
      saved.unshift(review);
      saveSaved(saved);
      updateSummary();
      form.reset();
      setRating(5);

      showToast('Спасибо! Ваш отзыв опубликован.');
    });
  }

  /* ---------- быстрый заказ ---------- */
  function initQuickOrder() {
    var form = document.getElementById('quick-order-form');
    if (!form) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        showToast('Проверьте имя и телефон — чего-то не хватает.', false);
        return;
      }

      var modalElement = document.getElementById('quickOrderModal');
      var modal =
        window.bootstrap && window.bootstrap.Modal
          ? window.bootstrap.Modal.getInstance(modalElement)
          : null;

      if (modal) modal.hide();

      form.reset();
      form.classList.remove('was-validated');
      showToast(
        'Быстрый заказ принят. Мы позвоним в течение 15 минут.'
      );
    });
  }

  /* ---------- сбор корма для приюта ---------- */
  function initCharity() {
    var section = document.querySelector('[data-charity]');
    if (!section) return;

    var BASE_RAISED = 23500;
    var GOAL = 40000;
    var STORAGE_KEY = 'lhp-charity-donated';
    var form = document.getElementById('charity-form');
    var input = document.getElementById('charity-amount');
    var quickButtons = Array.prototype.slice.call(
      section.querySelectorAll('[data-charity-amount]')
    );

    function readDonated() {
      try {
        var value = Number(
          window.localStorage.getItem(STORAGE_KEY) || 0
        );
        return Number.isFinite(value) && value > 0 ? value : 0;
      } catch (error) {
        return 0;
      }
    }

    var donated = readDonated();

    function render() {
      var total = Math.min(BASE_RAISED + donated, GOAL);
      var percent = Math.min(
        100,
        Math.round(((BASE_RAISED + donated) / GOAL) * 100)
      );

      var raised = section.querySelector('[data-charity-raised]');
      var percentElement = section.querySelector('[data-charity-percent]');
      var progress = section.querySelector('[data-charity-bar]');
      var progressWrap = section.querySelector('[data-charity-progress]');

      if (raised) raised.textContent = formatPrice(total);
      if (percentElement) percentElement.textContent = percent + '%';
      if (progress) progress.style.width = percent + '%';
      if (progressWrap) {
        progressWrap.setAttribute('aria-valuenow', String(percent));
      }
    }

    quickButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        if (input) input.value = button.dataset.charityAmount;
      });
    });

    if (form && input) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var amount = Math.round(Number(input.value));

        if (!Number.isFinite(amount) || amount < 100) {
          showToast('Минимальная сумма помощи — 100 ₽.', false);
          return;
        }

        donated += amount;
        try {
          window.localStorage.setItem(STORAGE_KEY, String(donated));
        } catch (error) {
          /* сумма не сохранится, но прогресс обновится */
        }

        input.value = '';
        render();
        showToast(
          'Спасибо! Вы помогли приюту на ' + formatPrice(amount) + '.'
        );
      });
    }

    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNavbarHeight();
    initScrollTop();
    initQuantityControls();
    initCatalog();
    initReviews();
    initQuickOrder();
    initCharity();
  });
})();
