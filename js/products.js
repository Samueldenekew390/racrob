/**
 * RACROB Water Pump Supplier - Products Catalog Controller
 * Pure Vanilla JavaScript & Supabase Client
 */

import { getProducts, getSiteSettings, submitPaymentOrder } from './supabase.js';
import {
  getSelectedLanguage,
  setSelectedLanguage,
  applyLanguage,
  t,
  getFieldInLanguage,
  showToast,
  formatCurrency,
  escapeHTML,
  validateReceiptFile
} from './utils.js';

let currentPage = 1;
const PAGE_LIMIT = 12; // Mobile requirement: 2 columns, up to 6 rows = 12 items
let currentCategory = 'all';
let searchQuery = '';
let totalPages = 1;
let siteSettingsData = {};
let activeBuyProduct = null;

document.addEventListener('DOMContentLoaded', async () => {
  const initialLang = getSelectedLanguage();
  applyLanguage(initialLang);
  setupLanguageSelector();
  setupMobileNav();

  siteSettingsData = await getSiteSettings();
  updateSettingsUI();

  // Search input with debounce
  const searchInput = document.getElementById('catalog-search-input');
  let searchTimer = null;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = e.target.value.trim();
      currentPage = 1;
      loadCatalogProducts();
    }, 300);
  });

  // Category filter chips
  document.querySelectorAll('.cat-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.cat-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      currentCategory = chip.getAttribute('data-cat') || 'all';
      currentPage = 1;
      loadCatalogProducts();
    });
  });

  setupBuyModal();
  await loadCatalogProducts();

  window.addEventListener('racrob_language_changed', () => {
    loadCatalogProducts();
    updateSettingsUI();
  });
});

function setupLanguageSelector() {
  const langBtn = document.getElementById('lang-selector-btn');
  const langMenu = document.getElementById('lang-selector-menu');
  if (langBtn && langMenu) {
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langMenu.classList.toggle('active');
    });
    document.addEventListener('click', () => langMenu.classList.remove('active'));
    langMenu.querySelectorAll('.lang-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        const lang = opt.getAttribute('data-lang');
        if (lang) {
          setSelectedLanguage(lang);
          langMenu.classList.remove('active');
          const labelEl = document.getElementById('current-lang-label');
          if (labelEl) labelEl.textContent = lang.toUpperCase();
        }
      });
    });
  }
}

function setupMobileNav() {
  const hamburger = document.getElementById('hamburger-btn');
  const drawer = document.getElementById('mobile-nav-drawer');
  const overlay = document.getElementById('mobile-drawer-overlay');
  const closeBtn = document.getElementById('mobile-drawer-close');

  hamburger?.addEventListener('click', () => {
    drawer?.classList.add('active');
    overlay?.classList.add('active');
  });
  const closeDrawer = () => {
    drawer?.classList.remove('active');
    overlay?.classList.remove('active');
  };
  closeBtn?.addEventListener('click', closeDrawer);
  overlay?.addEventListener('click', closeDrawer);
}

function updateSettingsUI() {
  const phone = siteSettingsData.phone_number || '0940414141';
  document.querySelectorAll('.phone-val-text').forEach((el) => { el.textContent = phone; });
  document.querySelectorAll('.phone-tel-link').forEach((el) => { el.setAttribute('href', `tel:${phone}`); });
  const address = siteSettingsData.address || 'Wereda 03, H.NO. 1263, Office NO.201, Ethio China St, Addis Abeba, Ethiopia';
  document.querySelectorAll('.address-val-text').forEach((el) => { el.textContent = address; });

  const fb = document.getElementById('facebook-link');
  const tw = document.getElementById('twitter-link');
  const inEl = document.getElementById('linkedin-link');
  const ig = document.getElementById('instagram-link');
  const tt = document.getElementById('tiktok-link');

  if (fb) fb.href = siteSettingsData.facebook_url || 'https://www.facebook.com/share/1FaYKw8d7y/';
  if (tw) tw.href = siteSettingsData.twitter_url || 'https://twitter.com/racrob_et';
  if (inEl) inEl.href = siteSettingsData.linkedin_url || 'https://www.linkedin.com/company/racrob';
  if (ig) ig.href = siteSettingsData.instagram_url || 'https://www.instagram.com/racrob_et';
  if (tt) tt.href = siteSettingsData.tiktok_url || 'https://www.tiktok.com/@racrob_et';
}

async function loadCatalogProducts() {
  const grid = document.getElementById('catalog-products-grid');
  const pagination = document.getElementById('catalog-pagination');
  if (!grid) return;

  grid.innerHTML = `
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
  `;

  try {
    const res = await getProducts({
      category: currentCategory,
      search: searchQuery,
      page: currentPage,
      limit: PAGE_LIMIT,
      onlyActive: true
    });

    totalPages = res.totalPages;
    renderProducts(grid, res.products);
    renderPagination(pagination, res.page, res.totalPages);
  } catch (err) {
    console.error('Failed to load products:', err);
    grid.innerHTML = `<div class="empty-state-box">${t('noProductsFound')}</div>`;
  }
}

function renderProducts(grid, products) {
  if (!products.length) {
    grid.innerHTML = `<div class="empty-state-box">${t('noProductsFound')}</div>`;
    return;
  }

  grid.innerHTML = '';
  products.forEach((product) => {
    const title = getFieldInLanguage(product, 'name');
    const desc = getFieldInLanguage(product, 'description');
    const priceStr = formatCurrency(product.price);

    const card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-img-box">
        <img src="${product.image_url}" alt="${escapeHTML(title)}" class="product-img" loading="lazy">
        <span class="product-category-tag">${escapeHTML(product.category || 'Product')}</span>
      </div>
      <div class="product-body">
        <h3 class="product-title">${escapeHTML(title)}</h3>
        <p class="product-desc">${escapeHTML(desc)}</p>
        <div class="product-footer">
          <span class="product-price">${priceStr}</span>
          <div class="product-card-actions">
            <a href="product.html?id=${product.id}" class="btn btn-secondary btn-sm">${t('btnViewDetails')}</a>
            <button class="btn btn-success btn-sm btn-buy-trigger" data-product-id="${product.id}">${t('btnBuy')}</button>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll('.btn-buy-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-product-id');
      const prod = products.find((p) => String(p.id) === String(id));
      if (prod) openBuyModal(prod);
    });
  });
}

function renderPagination(container, page, total) {
  if (!container) return;
  if (total <= 1) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = '';

  // Prev Button
  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.textContent = t('prevBtn');
  prevBtn.disabled = page <= 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadCatalogProducts();
      window.scrollTo({ top: 200, behavior: 'smooth' });
    }
  });
  container.appendChild(prevBtn);

  // Numeric Buttons
  for (let i = 1; i <= total; i++) {
    const numBtn = document.createElement('button');
    numBtn.className = `page-btn ${i === page ? 'active' : ''}`;
    numBtn.textContent = i;
    numBtn.addEventListener('click', () => {
      currentPage = i;
      loadCatalogProducts();
      window.scrollTo({ top: 200, behavior: 'smooth' });
    });
    container.appendChild(numBtn);
  }

  // Next Button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.textContent = t('nextBtn');
  nextBtn.disabled = page >= total;
  nextBtn.addEventListener('click', () => {
    if (currentPage < total) {
      currentPage++;
      loadCatalogProducts();
      window.scrollTo({ top: 200, behavior: 'smooth' });
    }
  });
  container.appendChild(nextBtn);
}

function setupBuyModal() {
  const modal = document.getElementById('buy-payment-modal');
  const closeBtn = document.getElementById('buy-modal-close');
  const cancelBtn = document.getElementById('buy-modal-cancel');
  const form = document.getElementById('buy-payment-form');

  const close = () => {
    modal?.classList.remove('active');
    activeBuyProduct = null;
    form?.reset();
  };

  closeBtn?.addEventListener('click', close);
  cancelBtn?.addEventListener('click', close);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const customerName = document.getElementById('buy-customer-name')?.value.trim();
    const phone = document.getElementById('buy-customer-phone')?.value.trim();
    const note = document.getElementById('buy-customer-note')?.value.trim();
    const fileInput = document.getElementById('buy-receipt-file');
    const submitBtn = document.getElementById('buy-submit-btn');

    if (!customerName || !phone) {
      showToast('Please fill in name and phone.', 'warning');
      return;
    }

    const receiptFile = fileInput?.files?.[0];
    const validation = validateReceiptFile(receiptFile);
    if (!validation.valid) {
      showToast(validation.error, 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
    }

    try {
      await submitPaymentOrder({
        productId: activeBuyProduct?.id || null,
        productName: activeBuyProduct ? getFieldInLanguage(activeBuyProduct, 'name') : 'Pump Product',
        customerName,
        phone,
        receiptFile,
        note
      });

      showToast(t('orderSubmittedSuccess'), 'success', 6000);
      close();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Payment submission failed.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = t('btnSubmit');
      }
    }
  });
}

function openBuyModal(product) {
  activeBuyProduct = product;
  const modal = document.getElementById('buy-payment-modal');
  if (!modal) return;

  const titleEl = document.getElementById('buy-modal-prod-title');
  const priceEl = document.getElementById('buy-modal-prod-price');
  const accountEl = document.getElementById('buy-modal-bank-account');
  const bankNameEl = document.getElementById('buy-modal-bank-name');

  const prodName = product ? getFieldInLanguage(product, 'name') : 'Water Pump Order';
  if (titleEl) titleEl.textContent = prodName;
  if (priceEl && product.price) priceEl.textContent = formatCurrency(product.price);

  accountEl.textContent = siteSettingsData.payment_account || '1000';
  bankNameEl.textContent = siteSettingsData.bank_name || 'Commercial Bank of Ethiopia (CBE)';

  modal.classList.add('active');
}
