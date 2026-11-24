/* ============================================================
   «Недавно просмотренные»: запоминаем открытые товары
   и показываем до четырёх последних в каталоге.
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'lhp-recent-v2';
  var MAX_ITEMS = 4;

  function readItems() {
    try {
      var data = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(data)) return [];
      return data.filter(function (item) {
        return item && item.slug && item.name && Number(item.price) > 0;
      });
    } catch (error) {
      return [];
    }
  }

  function saveItems(items) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(items.slice(0, MAX_ITEMS))
      );
    } catch (error) {
      /* хранилище недоступно — блок не запомнит просмотры */
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[character];
    });
  }

  function money(value) {
    if (window.LHP && window.LHP.formatPrice) {
      return window.LHP.formatPrice(value);
    }
    return String(value) + ' ₽';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var body = document.body;

    if (body.dataset.productSlug) {
      var product = {
        slug: body.dataset.productSlug,
        name: body.dataset.productName || 'Товар',
        price: Number(body.dataset.productPrice) || 0,
        image: body.dataset.productImage || 'images/placeholder-product.jpg',
      };

      if (product.price > 0) {
        var items = readItems().filter(function (item) {
          return item.slug !== product.slug;
        });
        items.unshift(product);
        saveItems(items);
      }
    }

    var section = document.getElementById('recently-viewed');
    var grid = document.getElementById('recent-grid');
    if (!section || !grid) return;

    var clear = document.getElementById('recent-clear');
    var items = readItems();

    function render() {
      if (!items.length) {
        section.classList.add('d-none');
        grid.innerHTML = '';
        return;
      }

      section.classList.remove('d-none');
      grid.innerHTML = items
        .map(function (item) {
          return (
            '<div class="col-6 col-md-3">' +
            '<a class="recent-card" href="product-' +
            escapeHtml(item.slug) +
            '.html">' +
            '<img src="' +
            escapeHtml(item.image) +
            '" alt="' +
            escapeHtml(item.name) +
            '" loading="lazy">' +
            '<span class="recent-card__body">' +
            '<span class="recent-card__name">' +
            escapeHtml(item.name) +
            '</span>' +
            '<span class="recent-card__price">' +
            money(item.price) +
            '</span>' +
            '</span></a></div>'
          );
        })
        .join('');
    }

    if (clear) {
      clear.addEventListener('click', function () {
        items = [];
        saveItems(items);
        render();
        if (window.LHP && window.LHP.showToast) {
          window.LHP.showToast('История просмотров очищена', false);
        }
      });
    }

    render();
  });
})();
