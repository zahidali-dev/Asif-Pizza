(function () {
    // Helpers
    const $ = (s, ctx = document) => ctx.querySelector(s);
    const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));
    const format = n => Number(n).toFixed(2);

    // DOM targets
    const addButtons = $$('.add-to-cart');
    const cartItemsEl = $('.cart-items');
    const cartTotalEl = $('.cart-total');
    const cartCountEl = $('.cart-count');
    const checkoutBtn = $('.checkout-btn');
    const clearBtn = $('.clear-cart-btn');
    const categoryBtns = $$('.category-btn');
    const menuItems = $$('.menu-item');
    const searchInput = $('#search-input');
    const cartSidebar = $('#cart-sidebar');
    const cartBtn = $('#cart-btn');
    const closeCartBtn = $('#close-cart');
    const searchBtn = $('#search-btn');
    const searchBar = $('.search-bar');
    const barsBtn = $('#bars');
    const navbar = $('.navbar');
    const locationBtn = $('#location-btn');
    const locationModal = $('#location-modal');
    const closeLocationBtn = $('#close-location');
    const backToTopBtn = $('.back-to-top') || document.createElement('button'); // Create if not in HTML

    // Cart state
    const STORAGE_KEY = 'pizza_cart_v1';
    let cart = loadCart();

    // Initialize
    renderCart();
    bindAddButtons();
    bindCartEvents();
    bindFilters();
    bindSearch();
    bindCheckoutClear();
    bindCartToggle();
    bindSearchToggle();
    bindMenuToggle();
    bindLocationToggle();
    bindBackToTop();

    // Functions
    function loadCart() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Failed to load cart', e);
            return [];
        }
    }

    function saveCart() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
        } catch (e) {
            console.error('Failed to save cart', e);
        }
    }

    function bindAddButtons() {
        addButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const name = btn.getAttribute('data-name') || btn.closest('.menu-item')?.querySelector('h2')?.textContent || 'Pizza';
                const price = parseFloat(btn.getAttribute('data-price') || '0') || 0;
                addToCart({ id, name, price, qty: 1 });
            });
        });
    }

    function addToCart(item) {
        const existing = cart.find(i => i.id === item.id);
        if (existing) existing.qty += item.qty;
        else cart.push({ ...item });
        saveCart();
        renderCart();
    }

    function renderCart() {
        if (!cartItemsEl) return;
        cartItemsEl.innerHTML = '';
        if (cart.length === 0) {
            cartItemsEl.innerHTML = '<div class="empty">Your cart is empty</div>';
            updateTotals();
            return;
        }

        cart.forEach(item => {
            const row = document.createElement('div');
            row.className = 'cart-row';
            row.dataset.id = item.id;
            row.innerHTML = `
                <div class="cart-name">${escapeHtml(item.name)}</div>
                <div class="cart-price">$${format(item.price)}</div>
                <div class="cart-qty">
                    <button class="qty-decrease" aria-label="Decrease">−</button>
                    <input class="qty-input" type="number" min="1" value="${item.qty}">
                    <button class="qty-increase" aria-label="Increase">+</button>
                </div>
                <div class="cart-sub">$${format(item.qty * item.price)}</div>
                <button class="remove-item" aria-label="Remove">✕</button>
            `;
            cartItemsEl.appendChild(row);
        });

        updateTotals();
    }

    function updateTotals() {
        const total = cart.reduce((s, i) => s + i.qty * i.price, 0);
        const count = cart.reduce((s, i) => s + i.qty, 0);
        if (cartTotalEl) cartTotalEl.textContent = `$${format(total)}`;
        if (cartCountEl) cartCountEl.textContent = count;
    }

    function bindCartEvents() {
        if (!cartItemsEl) return;
        cartItemsEl.addEventListener('click', e => {
            const row = e.target.closest('.cart-row');
            if (!row) return;
            const id = row.dataset.id;
            if (e.target.matches('.remove-item')) {
                removeFromCart(id);
            } else if (e.target.matches('.qty-increase')) {
                changeQty(id, 1);
            } else if (e.target.matches('.qty-decrease')) {
                changeQty(id, -1);
            }
        });

        cartItemsEl.addEventListener('input', e => {
            if (e.target.matches('.qty-input')) {
                const row = e.target.closest('.cart-row');
                const id = row?.dataset.id;
                const val = parseInt(e.target.value, 10);
                if (!id || isNaN(val) || val < 1) {
                    e.target.value = 1;
                    return;
                }
                setQty(id, val);
            }
        });
    }

    function changeQty(id, delta) {
        const item = cart.find(i => i.id === id);
        if (!item) return;
        item.qty = Math.max(1, item.qty + delta);
        saveCart();
        renderCart();
    }

    function setQty(id, qty) {
        const item = cart.find(i => i.id === id);
        if (!item) return;
        item.qty = Math.max(1, qty);
        saveCart();
        renderCart();
    }

    function removeFromCart(id) {
        cart = cart.filter(i => i.id !== id);
        saveCart();
        renderCart();
    }

    function bindFilters() {
        if (!categoryBtns.length || !menuItems.length) return;
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const cat = btn.getAttribute('data-category') || 'all';
                categoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterMenu(cat, (searchInput && searchInput.value) || '');
            });
        });
    }

    function bindSearch() {
        if (!searchInput) return;
        searchInput.addEventListener('input', () => {
            const term = searchInput.value.trim();
            const activeBtn = categoryBtns.find(b => b.classList.contains('active'));
            const cat = activeBtn ? activeBtn.getAttribute('data-category') : 'all';
            filterMenu(cat, term);
        });
    }

    function filterMenu(category, term) {
        const q = (term || '').toLowerCase();
        menuItems.forEach(item => {
            const itemCat = item.getAttribute('data-category') || 'all';
            const name = (item.querySelector('h2')?.textContent || '').toLowerCase();
            const showByCat = category === 'all' || itemCat === category;
            const showBySearch = !q || name.includes(q);
            item.style.display = showByCat && showBySearch ? '' : 'none';
        });
    }

    function bindCheckoutClear() {
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                if (cart.length === 0) {
                    alert('Your cart is empty.');
                    return;
                }
                alert(`Thanks! You ordered ${cart.reduce((s, i) => s + i.qty, 0)} items. Total: ${cartTotalEl ? cartTotalEl.textContent : ''}`);
                cart = [];
                saveCart();
                renderCart();
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (!confirm('Clear the cart?')) return;
                cart = [];
                saveCart();
                renderCart();
            });
        }
    }

    function bindCartToggle() {
        if (cartBtn) {
            cartBtn.addEventListener('click', () => {
                cartSidebar.classList.toggle('active');
                cartSidebar.setAttribute('aria-hidden', !cartSidebar.classList.contains('active'));
            });
        }
        if (closeCartBtn) {
            closeCartBtn.addEventListener('click', () => {
                cartSidebar.classList.remove('active');
                cartSidebar.setAttribute('aria-hidden', 'true');
            });
        }
    }

    function bindSearchToggle() {
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                searchBar.classList.toggle('active');
                navbar.classList.remove('active');
                searchBar.setAttribute('aria-hidden', String(!searchBar.classList.contains('active')));
            });
        }
    }

    function bindMenuToggle() {
        if (barsBtn) {
            barsBtn.addEventListener('click', () => {
                navbar.classList.toggle('active');
                searchBar.classList.remove('active');
                searchBar.setAttribute('aria-hidden', 'true');
            });
        }

        window.addEventListener('scroll', () => {
            navbar.classList.remove('active');
            searchBar.classList.remove('active');
            searchBar.setAttribute('aria-hidden', 'true');
        });
    }

    function bindLocationToggle() {
        if (locationBtn) {
            locationBtn.addEventListener('click', () => {
                locationModal.classList.add('active');
                locationModal.setAttribute('aria-hidden', 'false');
            });
        }
        if (closeLocationBtn) {
            closeLocationBtn.addEventListener('click', () => {
                locationModal.classList.remove('active');
                locationModal.setAttribute('aria-hidden', 'true');
            });
        }
        locationModal.addEventListener('click', e => {
            if (e.target === locationModal) {
                locationModal.classList.remove('active');
                locationModal.setAttribute('aria-hidden', 'true');
            }
        });
    }

    function bindBackToTop() {
        if (!backToTopBtn) return;
        backToTopBtn.className = 'back-to-top';
        backToTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        document.body.appendChild(backToTopBtn);

        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Utility to avoid XSS
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
})();