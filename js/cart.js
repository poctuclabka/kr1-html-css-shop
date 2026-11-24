/* ============================================================
   Корзина, калькулятор доставки и оформление заказа.
   Данные хранятся в localStorage, поэтому работают между
   страницами без сервера.
   ============================================================ */
(function () {
  'use strict';

  var CART_KEY = 'lhp-cart-v2';
  var DELIVERY_KEY = 'lhp-delivery-v1';
  var PLACEHOLDER_IMAGE = 'images/placeholder-product.jpg';
  var FILE_CART_PREFIX = 'LHP_CART:';
  var PRODUCT_IMAGES = {
    'cat-food-murlyka': 'images/cat-food.jpg',
    'cat-bed-cloud': 'images/cat-bed.jpg',
    'cat-toy-feather': 'images/cat-toy.avif',
    'dog-food-friend': 'images/dog-food.jpg',
    'dog-toys-set': 'images/dog-set.webp',
    'dog-bed-ortho': 'images/dog-bed.jpg',
    'bird-food-grain': 'images/bird-food.jpg',
    'bird-cage-comfort': 'images/bird-house.jpg',
    'fish-food-flakes': 'images/fish-food.jpg',
    'fish-aquarium-60': 'images/fish-aquarium.webp',
    'rodent-food-grain': 'images/mouse-food.jpeg',
    'rodent-wheel': 'images/mouse-wheel.jpg'
  };

  var CITIES = [
    { id: 'moscow', label: 'Москва', base: 299, freeFrom: 3000 },
    { id: 'spb', label: 'Санкт-Петербург', base: 399, freeFrom: 5000 },
    { id: 'russia', label: 'Другой город', base: 499, freeFrom: null },
  ];

  var METHODS = [
    { id: 'courier', label: 'Курьером до двери', extra: 0 },
    { id: 'pvz', label: 'Пункт выдачи', extra: 150 },
    { id: 'pickup', label: 'Самовывоз из магазина', extra: 0 },
  ];

  function money(value) {
    if (window.LHP && window.LHP.formatPrice) {
      return window.LHP.formatPrice(value);
    }
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  }

  function toast(message, success) {
    if (window.LHP && window.LHP.showToast) {
      window.LHP.showToast(message, success);
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

  function clampQuantity(value) {
    return Math.min(99, Math.max(1, Math.round(Number(value) || 1)));
  }

  /* ---------- корзина ---------- */
  // На file:// localStorage может быть отдельным для каждого HTML-файла.
  // window.name переживает переходы в той же вкладке, поэтому используем
  // его как запасной канал, чтобы корзина работала и без локального сервера.
  function readWindowCart() {
    try {
      if (!window.name || window.name.indexOf(FILE_CART_PREFIX) !== 0) return null;
      var parsed = JSON.parse(
        decodeURIComponent(window.name.slice(FILE_CART_PREFIX.length))
      );
      return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function writeWindowCart(items) {
    try {
      window.name =
        FILE_CART_PREFIX +
        encodeURIComponent(JSON.stringify(items));
    } catch (error) {
      /* не критично */
    }
  }

  function normalizeCart(data) {
    if (!Array.isArray(data)) return [];
    return data
      .filter(function (item) {
        return item && item.slug && Number(item.price) > 0;
      })
      .map(function (item) {
        return {
          slug: String(item.slug),
          name: String(item.name || 'Товар'),
          price: Number(item.price) || 0,
          image: PRODUCT_IMAGES[String(item.slug)] || String(item.image || PLACEHOLDER_IMAGE),
          category: String(item.category || ''),
          type: String(item.type || ''),
          qty: clampQuantity(item.qty),
        };
      });
  }

  function readCart() {
    var data = null;
    try {
      data = JSON.parse(window.localStorage.getItem(CART_KEY) || '[]');
    } catch (error) {
      data = null;
    }
    // Если localStorage пуст или недоступен, пробуем резервное
    // хранилище в window.name (переживает переходы в одной вкладке).
    if (!Array.isArray(data) || data.length === 0) {
      var fallback = readWindowCart();
      if (fallback) data = fallback;
    }
    return normalizeCart(data);
  }

  function saveCart(items) {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch (error) {
      /* приватный режим — корзина проживёт до перезагрузки */
    }
    writeWindowCart(items);
    updateBadges();
    document.dispatchEvent(new CustomEvent('lhp:cart-changed'));
  }

  function cartCount(items) {
    return items.reduce(function (sum, item) {
      return sum + item.qty;
    }, 0);
  }

  function updateBadges() {
    var count = cartCount(readCart());
    var badges = document.querySelectorAll('.js-cart-count');
    Array.prototype.forEach.call(badges, function (badge) {
      badge.textContent = String(count);
      if (count === 0) {
        badge.setAttribute('hidden', 'hidden');
      } else {
        badge.removeAttribute('hidden');
      }
    });
  }

  function productFromButton(button) {
    return {
      slug: button.dataset.slug,
      name: button.dataset.name,
      price: Number(button.dataset.price) || 0,
      image: button.dataset.image || PLACEHOLDER_IMAGE,
      category: button.dataset.category || '',
      type: button.dataset.type || '',
    };
  }

  function addToCart(product, qty) {
    if (!product || !product.slug || !product.price) return;

    var items = readCart();
    var existing = items.find(function (item) {
      return item.slug === product.slug;
    });

    if (existing) {
      existing.qty = clampQuantity(existing.qty + clampQuantity(qty));
    } else {
      items.push({
        slug: product.slug,
        name: product.name || 'Товар',
        price: product.price,
        image: product.image || PLACEHOLDER_IMAGE,
        category: product.category || '',
        type: product.type || '',
        qty: clampQuantity(qty),
      });
    }

    saveCart(items);
    toast('«' + product.name + '» добавлен в корзину');
  }

  function initAddButtons() {
    document.addEventListener('click', function (event) {
      var addButton = event.target.closest('[data-add-to-cart]');
      if (addButton) {
        event.preventDefault();
        var qtyInput = addButton.dataset.qtySource
          ? document.querySelector(addButton.dataset.qtySource)
          : null;
        addToCart(
          productFromButton(addButton),
          qtyInput ? qtyInput.value : 1
        );
        return;
      }

      var buyButton = event.target.closest('[data-buy-now]');
      if (buyButton) {
        event.preventDefault();
        var buyQty = buyButton.dataset.qtySource
          ? document.querySelector(buyButton.dataset.qtySource)
          : null;
        addToCart(
          productFromButton(buyButton),
          buyQty ? buyQty.value : 1
        );
        window.location.href = 'order.html';
      }
    });
  }

  /* ---------- доставка ---------- */
  function getCity(id) {
    return (
      CITIES.find(function (city) {
        return city.id === id;
      }) || CITIES[0]
    );
  }

  function getMethod(id) {
    return (
      METHODS.find(function (method) {
        return method.id === id;
      }) || METHODS[0]
    );
  }

  function readDelivery() {
    try {
      var saved = JSON.parse(
        window.localStorage.getItem(DELIVERY_KEY) || '{}'
      );
      var city = getCity(saved.city);
      var method = getMethod(saved.method);

      if (city.id !== 'moscow' && method.id === 'pickup') {
        method = getMethod('courier');
      }

      return { city: city.id, method: method.id };
    } catch (error) {
      return { city: 'moscow', method: 'courier' };
    }
  }

  function saveDelivery(state) {
    try {
      window.localStorage.setItem(DELIVERY_KEY, JSON.stringify(state));
    } catch (error) {
      /* состояние не сохранится */
    }
  }

  function calcDelivery(subtotal, state) {
    if (subtotal <= 0) return 0;
    var city = getCity(state.city);
    var method = getMethod(state.method);

    if (method.id === 'pickup') return 0;
    if (city.freeFrom && subtotal >= city.freeFrom) return 0;

    return city.base + method.extra;
  }

  function getTotals() {
    var items = readCart();
    var subtotal = items.reduce(function (sum, item) {
      return sum + item.price * item.qty;
    }, 0);
    var state = readDelivery();
    var delivery = calcDelivery(subtotal, state);

    return {
      items: items,
      count: cartCount(items),
      subtotal: subtotal,
      delivery: delivery,
      total: subtotal + delivery,
      state: state,
    };
  }

  function setText(selector, value) {
    var elements = document.querySelectorAll(selector);
    Array.prototype.forEach.call(elements, function (element) {
      element.textContent = value;
    });
  }

  function updateTotalsUI() {
    var totals = getTotals();
    var city = getCity(totals.state.city);

    setText('[data-cart-count]', String(totals.count));
    setText('[data-cart-subtotal]', money(totals.subtotal));
    setText('[data-order-subtotal]', money(totals.subtotal));
    setText(
      '[data-cart-delivery]',
      totals.delivery === 0 ? 'Бесплатно' : money(totals.delivery)
    );
    setText(
      '[data-order-delivery]',
      totals.delivery === 0 ? 'Бесплатно' : money(totals.delivery)
    );
    setText('[data-cart-total]', money(totals.total));
    setText('[data-order-total]', money(totals.total));
    setText(
      '[data-delivery-cost]',
      totals.delivery === 0 ? 'Бесплатно' : money(totals.delivery)
    );

    var free = document.querySelector('[data-free-delivery]');
    if (free) {
      var left =
        city.freeFrom && totals.subtotal > 0
          ? Math.max(0, city.freeFrom - totals.subtotal)
          : null;

      if (totals.state.method === 'pickup') {
        free.classList.add('free-delivery--done');
        free.textContent = 'Самовывоз бесплатный';
      } else if (left === null) {
        free.classList.remove('free-delivery--done');
        free.textContent = 'Стоимость доставки рассчитывается по тарифу города';
      } else if (left === 0) {
        free.classList.add('free-delivery--done');
        free.textContent = 'Доставка бесплатная';
      } else {
        free.classList.remove('free-delivery--done');
        free.textContent = 'До бесплатной доставки — ' + money(left);
      }
    }

    var note = document.querySelector('[data-delivery-note]');
    if (note) {
      if (!city.freeFrom) {
        note.textContent =
          'Для этого города действует фиксированный тариф. Самовывоз доступен только в Москве.';
      } else {
        var leftForNote = Math.max(0, city.freeFrom - totals.subtotal);
        note.textContent =
          leftForNote > 0
            ? 'До бесплатной доставки осталось ' + money(leftForNote) + '.'
            : 'Бесплатная доставка уже действует.';
      }
    }
  }

  function fillDeliverySelects(state) {
    var citySelects = document.querySelectorAll('.js-delivery-city');
    var methodSelects = document.querySelectorAll('.js-delivery-method');
    var city = getCity(state.city);

    Array.prototype.forEach.call(citySelects, function (select) {
      if (!select.options.length) {
        select.innerHTML = CITIES.map(function (item) {
          return (
            '<option value="' +
            item.id +
            '">' +
            escapeHtml(item.label) +
            '</option>'
          );
        }).join('');
      }
      select.value = state.city;
    });

    var available = METHODS.filter(function (method) {
      return method.id !== 'pickup' || city.id === 'moscow';
    });

    if (
      !available.some(function (method) {
        return method.id === state.method;
      })
    ) {
      state.method = 'courier';
      saveDelivery(state);
    }

    Array.prototype.forEach.call(methodSelects, function (select) {
      select.innerHTML = available
        .map(function (method) {
          return (
            '<option value="' +
            method.id +
            '">' +
            escapeHtml(method.label) +
            '</option>'
          );
        })
        .join('');
      select.value = state.method;
    });
  }

  function syncAddressField() {
    var address = document.getElementById('order-address');
    if (!address) return;
    var state = readDelivery();
    var pickup = state.method === 'pickup';

    address.disabled = pickup;
    address.required = !pickup;
    if (pickup) {
      address.value = '';
      address.placeholder = 'Самовывоз: ул. Зоологическая, д. 12';
    } else {
      address.placeholder = 'Улица, дом, квартира';
    }
  }

  function initDelivery() {
    var citySelects = document.querySelectorAll('.js-delivery-city');
    var methodSelects = document.querySelectorAll('.js-delivery-method');
    if (!citySelects.length && !methodSelects.length) return;

    var state = readDelivery();

    function sync() {
      fillDeliverySelects(state);
      saveDelivery(state);
      updateTotalsUI();
      syncAddressField();
    }

    Array.prototype.forEach.call(citySelects, function (select) {
      select.addEventListener('change', function () {
        state.city = select.value;
        if (state.city !== 'moscow' && state.method === 'pickup') {
          state.method = 'courier';
        }
        sync();
      });
    });

    Array.prototype.forEach.call(methodSelects, function (select) {
      select.addEventListener('change', function () {
        state.method = select.value;
        sync();
      });
    });

    sync();
  }

  /* ---------- страница корзины ---------- */
  function cartItemHtml(item) {
    var meta = [item.category, item.type].filter(Boolean).join(' · ');
    return (
      '<article class="cart-item" data-cart-row data-slug="' +
      escapeHtml(item.slug) +
      '">' +
      '<a class="cart-item__media" href="product-' +
      escapeHtml(item.slug) +
      '.html">' +
      '<img src="' +
      escapeHtml(item.image) +
      '" alt="' +
      escapeHtml(item.name) +
      '" loading="lazy">' +
      '</a>' +
      '<div>' +
      '<h2 class="cart-item__title"><a href="product-' +
      escapeHtml(item.slug) +
      '.html">' +
      escapeHtml(item.name) +
      '</a></h2>' +
      '<p class="cart-item__meta">' +
      escapeHtml(meta || 'Зоотовары') +
      '</p>' +
      '<div class="cart-item__controls">' +
      '<div class="qty-control" role="group" aria-label="Количество">' +
      '<button type="button" data-qty-minus aria-label="Уменьшить количество">−</button>' +
      '<input type="number" min="1" max="99" value="' +
      item.qty +
      '" data-cart-qty aria-label="Количество товара">' +
      '<button type="button" data-qty-plus aria-label="Увеличить количество">+</button>' +
      '</div>' +
      '<button type="button" class="cart-item__remove" data-remove>Удалить</button>' +
      '</div>' +
      '</div>' +
      '<div class="cart-item__price"><strong>' +
      money(item.price * item.qty) +
      '</strong><span>' +
      money(item.price) +
      ' / шт.</span></div>' +
      '</article>'
    );
  }

  function changeCartQuantity(slug, delta) {
    var items = readCart();
    var item = items.find(function (entry) {
      return entry.slug === slug;
    });
    if (!item) return;

    item.qty = clampQuantity(item.qty + delta);
    saveCart(items);
    renderCartPage();
  }

  function setCartQuantity(slug, value) {
    var items = readCart();
    var item = items.find(function (entry) {
      return entry.slug === slug;
    });
    if (!item) return;

    item.qty = clampQuantity(value);
    saveCart(items);
    renderCartPage();
  }

  function removeCartItem(slug) {
    var items = readCart().filter(function (item) {
      return item.slug !== slug;
    });
    saveCart(items);
    renderCartPage();
    toast('Товар удалён из корзины', false);
  }

  function renderCartPage() {
    var list = document.getElementById('cart-items');
    if (!list) return;

    var empty = document.getElementById('cart-empty');
    var content = document.getElementById('cart-content');
    var items = readCart();

    if (!items.length) {
      if (empty) empty.classList.remove('d-none');
      if (content) content.classList.add('d-none');
      list.innerHTML = '';
      updateTotalsUI();
      return;
    }

    if (empty) empty.classList.add('d-none');
    if (content) content.classList.remove('d-none');
    list.innerHTML = items.map(cartItemHtml).join('');
    updateTotalsUI();
  }

  function initCartPage() {
    var list = document.getElementById('cart-items');
    if (!list) return;

    list.addEventListener('click', function (event) {
      var row = event.target.closest('[data-cart-row]');
      if (!row) return;
      var slug = row.dataset.slug;

      if (event.target.closest('[data-qty-minus]')) {
        changeCartQuantity(slug, -1);
        return;
      }
      if (event.target.closest('[data-qty-plus]')) {
        changeCartQuantity(slug, 1);
        return;
      }
      if (event.target.closest('[data-remove]')) {
        removeCartItem(slug);
      }
    });

    list.addEventListener('change', function (event) {
      if (!event.target.matches('[data-cart-qty]')) return;
      var row = event.target.closest('[data-cart-row]');
      if (!row) return;
      setCartQuantity(row.dataset.slug, event.target.value);
    });

    var clear = document.getElementById('clear-cart');
    if (clear) {
      clear.addEventListener('click', function () {
        saveCart([]);
        renderCartPage();
        toast('Корзина очищена', false);
      });
    }

    renderCartPage();
  }

  /* ---------- оформление заказа ---------- */
  function renderOrderPage() {
    var form = document.getElementById('order-form');
    if (!form) return;

    var items = readCart();
    var empty = document.getElementById('order-empty');
    var content = document.getElementById('order-content');
    var list = document.getElementById('order-items');

    if (!items.length) {
      if (empty) empty.classList.remove('d-none');
      if (content) content.classList.add('d-none');
      return;
    }

    if (empty) empty.classList.add('d-none');
    if (content) content.classList.remove('d-none');

    if (list) {
      list.innerHTML = items
        .map(function (item) {
          return (
            '<li><span>' +
            escapeHtml(item.name) +
            ' × ' +
            item.qty +
            '</span><strong>' +
            money(item.price * item.qty) +
            '</strong></li>'
          );
        })
        .join('');
    }

    var date = document.getElementById('order-date');
    if (date && !date.value) {
      date.value = new Date().toISOString().slice(0, 10);
    }

    updateTotalsUI();
  }

  function initOrderPage() {
    var form = document.getElementById('order-form');
    if (!form) return;

    renderOrderPage();
    syncAddressField();

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      syncAddressField();

      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        toast(
          'Проверьте выделенные поля — не хватает данных для заказа.',
          false
        );
        return;
      }

      var totals = getTotals();
      var city = getCity(totals.state.city);
      var method = getMethod(totals.state.method);
      var number = 'LHP-' + String(Date.now()).slice(-6);

      var success = document.getElementById('order-success');
      var content = document.getElementById('order-content');
      var numberElement = document.getElementById('order-success-number');
      var totalElement = document.getElementById('order-success-total');
      var methodElement = document.getElementById('order-success-method');
      var countElement = document.getElementById('order-success-count');

      if (numberElement) numberElement.textContent = number;
      if (totalElement) totalElement.textContent = money(totals.total);
      if (countElement) countElement.textContent = String(totals.count);
      if (methodElement) {
        methodElement.textContent = method.label + ', ' + city.label;
      }

      if (content) content.classList.add('d-none');
      if (success) success.classList.remove('d-none');

      saveCart([]);
      toast('Заказ ' + number + ' оформлен. Мы свяжемся с вами!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var initialCart = readCart();
    if (initialCart.length) writeWindowCart(initialCart);
    updateBadges();
    initAddButtons();
    initDelivery();
    initCartPage();
    initOrderPage();

    window.addEventListener('storage', function (event) {
      if (event.key !== CART_KEY) return;
      updateBadges();
      renderCartPage();
      renderOrderPage();
    });

    document.addEventListener('lhp:cart-changed', function () {
      updateBadges();
    });

    window.addEventListener('load', function () {
      updateBadges();
      renderCartPage();
      renderOrderPage();
    });

    window.addEventListener('pageshow', function (event) {
      if (!event.persisted) return;
      updateBadges();
      renderCartPage();
      renderOrderPage();
    });
  });
})();
