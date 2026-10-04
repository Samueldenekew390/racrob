/**
 * RACROB Water Pump Supplier - Product Detail Controller
 * Pure Vanilla JavaScript & Supabase Client
 */

import { getProductById, getSiteSettings, submitPaymentOrder } from './supabase.js';
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

let currentProduct = null;
let siteSettingsData = {};

document.addEventListener('DOMContentLoaded', async () => {
  const initialLang = getSelectedLanguage();
  applyLanguage(initialLang);
  setupLanguageSelector();
  setupMobileNav();

  siteSettingsData = await getSiteSettings();
  updateSettingsUI();

  // Parse product ID from URL (?id=...)
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId) {
    window.location.href = 'products.html';
    return;
  }

  await loadProductDetail(productId);
  setupBuyModal();

  window.addEventListener('racrob_language_changed', () => {
    if (currentProduct) renderProductDetail(currentProduct);
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

async function loadProductDetail(id) {
  const container = document.getElementById('product-detail-container');
  if (!container) return;

  try {
    const product = await getProductById(id);
    if (!product) {
      container.innerHTML = `<div class="empty-state-box">Product not found. <a href="products.html" class="btn btn-primary" style="margin-top:16px;">Back to Catalog</a></div>`;
      return;
    }
    currentProduct = product;
    renderProductDetail(product);
  } catch (err) {
    console.error('Error fetching product:', err);
    container.innerHTML = `<div class="empty-state-box">Failed to load product details.</div>`;
  }
}

function renderProductDetail(product) {
  const container = document.getElementById('product-detail-container');
  if (!container) return;

  const title = getFieldInLanguage(product, 'name');
  const desc = getFieldInLanguage(product, 'description');
  const priceStr = formatCurrency(product.price);

  // Format specifications table
  let specsHtml = '';
  if (product.specifications) {
    let specs = product.specifications;
    if (typeof specs === 'string') {
      try { specs = JSON.parse(specs); } catch (e) { specs = {}; }
    }
    const entries = Object.entries(specs);
    if (entries.length > 0) {
      specsHtml = `
        <div style="margin-top: 24px;">
          <h4 style="font-weight: 800; font-size: 1.1rem; margin-bottom: 12px; color: var(--primary-navy);">Technical Specifications</h4>
          <table style="width: 100%; border-collapse: collapse; background: #FFFFFF; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color);">
            <tbody>
              ${entries.map(([k, v]) => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 10px 16px; font-weight: 600; color: var(--text-muted); width: 40%; background: #F8FAFC;">${escapeHTML(k)}</td>
                  <td style="padding: 10px 16px; font-weight: 700; color: var(--primary-navy);">${escapeHTML(v)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 48px; align-items: start;">
      <!-- Product Large Image -->
      <div style="background: #0F172A; border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-lg); border: 1px solid var(--border-color);">
        <img src="${product.image_url}" alt="${escapeHTML(title)}" style="width: 100%; height: auto; object-fit: contain; aspect-ratio: 4/3;">
      </div>

      <!-- Product Meta & Actions -->
      <div style="background: #FFFFFF; padding: 36px; border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); border: 1px solid var(--border-color);">
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <span style="background: #E0F2FE; color: var(--accent-blue); padding: 4px 12px; border-radius: 4px; font-size: 0.8rem; font-weight: 700;">${escapeHTML(product.category || 'Pumps')}</span>
          ${product.model ? `<span style="background: #F1F5F9; color: var(--text-muted); padding: 4px 12px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">Model: ${escapeHTML(product.model)}</span>` : ''}
        </div>

        <h1 style="font-size: 2rem; font-weight: 900; color: var(--primary-navy); line-height: 1.25; margin-bottom: 16px;">${escapeHTML(title)}</h1>
        <div style="font-size: 1.75rem; font-weight: 900; color: var(--brand-green-dark); margin-bottom: 24px;">${priceStr}</div>

        <p style="font-size: 1.05rem; line-height: 1.7; color: var(--text-muted); margin-bottom: 28px;">${escapeHTML(desc)}</p>

        <!-- CTA Buttons -->
        <div style="display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 32px;">
          <button class="btn btn-success" id="detail-buy-btn" style="flex: 1; min-width: 180px;">${t('btnBuy')}</button>
          <a href="tel:0940414141" class="btn btn-primary" style="flex: 1; min-width: 180px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            ${t('btnCallNow')}
          </a>
          <a href="booking.html" class="btn btn-secondary" style="width: 100%;">${t('btnBookConsultation')}</a>
        </div>

        ${specsHtml}
      </div>
    </div>
  `;

  document.getElementById('detail-buy-btn')?.addEventListener('click', () => {
    openBuyModal(product);
  });
}

function setupBuyModal() {
  const modal = document.getElementById('buy-payment-modal');
  const closeBtn = document.getElementById('buy-modal-close');
  const cancelBtn = document.getElementById('buy-modal-cancel');
  const form = document.getElementById('buy-payment-form');

  const close = () => {
    modal?.classList.remove('active');
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
        productId: currentProduct?.id || null,
        productName: currentProduct ? getFieldInLanguage(currentProduct, 'name') : 'Pump Product',
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
