/**
 * RACROB Water Pump Supplier - Main Homepage Controller
 * Pure Vanilla JavaScript & Supabase Client
 */

import {
  getSiteSettings,
  getSlides,
  getProducts,
  getApplications,
  submitPaymentOrder,
  submitBooking
} from './supabase.js';

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

// DOM Elements & State
let currentSlideIndex = 0;
let slideInterval = null;
let slidesData = [];
let siteSettingsData = {};
let activeBuyProduct = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Language System
  const initialLang = getSelectedLanguage();
  applyLanguage(initialLang);
  setupLanguageSelector();
  setupMobileNav();

  // 2. Load Site Settings & Content
  await loadSettingsAndInit();

  // 3. Load & Initialize Hero Slideshow
  await loadAndInitSlideshow();

  // 4. Load Featured Products for Homepage
  await loadHomepageProducts();

  // 5. Load Applications for Homepage (4 items: 2x2 grid on mobile)
  await loadHomepageApplications();

  // 6. Setup Buy / Payment Modal
  setupBuyModal();

  // 7. Setup Consultation Booking Form
  setupBookingForm();

  // Listen for language changes to re-render dynamic content
  window.addEventListener('racrob_language_changed', () => {
    renderCurrentSlide();
    renderHomepageProducts();
    renderHomepageApplications();
    updateSettingsUI();
  });
});

// ----------------------------------------------------------------
// LANGUAGE SELECTOR
// ----------------------------------------------------------------
function setupLanguageSelector() {
  const langBtn = document.getElementById('lang-selector-btn');
  const langMenu = document.getElementById('lang-selector-menu');

  if (langBtn && langMenu) {
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langMenu.classList.toggle('active');
    });

    document.addEventListener('click', () => {
      langMenu.classList.remove('active');
    });

    langMenu.querySelectorAll('.lang-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        const lang = opt.getAttribute('data-lang');
        if (lang) {
          setSelectedLanguage(lang);
          langMenu.classList.remove('active');
          updateLangButtonLabel(lang);
        }
      });
    });

    updateLangButtonLabel(getSelectedLanguage());
  }
}

function updateLangButtonLabel(lang) {
  const labelEl = document.getElementById('current-lang-label');
  const labels = {
    en: 'EN',
    am: 'አማ',
    om: 'Oromoo',
    ti: 'ትግርኛ',
    sid: 'Sidaamu',
    ar: 'العربية'
  };
  if (labelEl) {
    labelEl.textContent = labels[lang] || 'EN';
  }
}

// ----------------------------------------------------------------
// MOBILE NAVIGATION DRAWER
// ----------------------------------------------------------------
function setupMobileNav() {
  const hamburger = document.getElementById('hamburger-btn');
  const drawer = document.getElementById('mobile-nav-drawer');
  const overlay = document.getElementById('mobile-drawer-overlay');
  const closeBtn = document.getElementById('mobile-drawer-close');

  const openDrawer = () => {
    drawer.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    drawer.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  if (hamburger) hamburger.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (overlay) overlay.addEventListener('click', closeDrawer);

  drawer?.querySelectorAll('.mobile-nav-link').forEach((link) => {
    link.addEventListener('click', closeDrawer);
  });
}

// ----------------------------------------------------------------
// SITE SETTINGS
// ----------------------------------------------------------------
async function loadSettingsAndInit() {
  try {
    siteSettingsData = await getSiteSettings();
    updateSettingsUI();
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

function updateSettingsUI() {
  // Update phone numbers
  const phone = siteSettingsData.phone_number || siteSettingsData.phone || '0940414141';
  document.querySelectorAll('.phone-val-text').forEach((el) => {
    el.textContent = phone;
  });
  document.querySelectorAll('.phone-tel-link').forEach((el) => {
    el.setAttribute('href', `tel:${phone}`);
  });

  // Update hero intro text if not customized in translations
  const heroHeadingEl = document.getElementById('hero-intro-heading');
  const heroDescEl = document.getElementById('hero-intro-desc');
  if (heroHeadingEl && siteSettingsData.hero_heading) {
    heroHeadingEl.textContent = siteSettingsData.hero_heading;
  }
  if (heroDescEl && siteSettingsData.hero_description) {
    heroDescEl.textContent = siteSettingsData.hero_description;
  }

  // Update address
  const address = siteSettingsData.address || 'Wereda 03, H.NO. 1263, Office NO.201, Ethio China St, Addis Abeba, Ethiopia';
  document.querySelectorAll('.address-val-text').forEach((el) => {
    el.textContent = address;
  });

  // Update Google Maps Link
  const mapsLink = siteSettingsData.google_maps_url || 'https://maps.google.com/?q=Ethio+China+St+Addis+Ababa';
  document.querySelectorAll('.map-view-link').forEach((el) => {
    el.setAttribute('href', mapsLink);
  });

  // Update Social Links (Facebook, Twitter, LinkedIn, Instagram, TikTok)
  const fbUrl = siteSettingsData.facebook_url || 'https://www.facebook.com/share/1FaYKw8d7y/';
  const twUrl = siteSettingsData.twitter_url || 'https://twitter.com/racrob_et';
  const inUrl = siteSettingsData.linkedin_url || 'https://www.linkedin.com/company/racrob';
  const igUrl = siteSettingsData.instagram_url || 'https://www.instagram.com/racrob_et';
  const ttUrl = siteSettingsData.tiktok_url || 'https://www.tiktok.com/@racrob_et';

  updateSocialLink('facebook-link', fbUrl);
  updateSocialLink('twitter-link', twUrl);
  updateSocialLink('linkedin-link', inUrl);
  updateSocialLink('instagram-link', igUrl);
  updateSocialLink('tiktok-link', ttUrl);
}

function updateSocialLink(id, url) {
  const el = document.getElementById(id);
  if (!el) return;
  if (url && url.trim() !== '') {
    el.setAttribute('href', url);
    el.style.display = 'inline-flex';
  } else {
    el.style.display = 'inline-flex';
  }
}

// ----------------------------------------------------------------
// HERO SLIDESHOW
// Order rule strictly verified:
// 1. u.jpg as FIRST slide
// 2. o.jpg as SECOND slide
// 3. p.jpg as THIRD slide
// 4. Remaining images follow. Never include sami.jpg (logo).
// ----------------------------------------------------------------
async function loadAndInitSlideshow() {
  const container = document.getElementById('hero-slides-container');
  const dotsContainer = document.getElementById('hero-slide-dots');
  const prevBtn = document.getElementById('slide-prev-btn');
  const nextBtn = document.getElementById('slide-next-btn');

  if (!container) return;

  try {
    const rawSlides = await getSlides(true);
    // Filter out sami.jpg if accidentally present
    slidesData = rawSlides.filter((s) => !s.image_url.includes('sami.jpg'));

    container.innerHTML = '';
    if (dotsContainer) dotsContainer.innerHTML = '';

    slidesData.forEach((slide, idx) => {
      const slideEl = document.createElement('div');
      slideEl.className = `slide-item ${idx === 0 ? 'active' : ''}`;
      slideEl.id = `slide-item-${idx}`;

      const title = getFieldInLanguage(slide, 'title');
      const desc = getFieldInLanguage(slide, 'description');

      slideEl.innerHTML = `
        <img src="${slide.image_url}" alt="${escapeHTML(title)}" class="slide-img" loading="${idx === 0 ? 'eager' : 'lazy'}">
        <div class="slide-overlay">
          <div class="container">
            <div class="slide-content-box">
              <span class="slide-badge">${t('heroBadge')}</span>
              <h2 class="slide-title" id="slide-title-${idx}">${escapeHTML(title)}</h2>
              <p class="slide-desc" id="slide-desc-${idx}">${escapeHTML(desc)}</p>
            </div>
          </div>
        </div>
      `;
      container.appendChild(slideEl);

      // Create Dot
      if (dotsContainer) {
        const dot = document.createElement('button');
        dot.className = `slide-dot ${idx === 0 ? 'active' : ''}`;
        dot.setAttribute('aria-label', `Go to slide ${idx + 1}`);
        dot.addEventListener('click', () => goToSlide(idx));
        dotsContainer.appendChild(dot);
      }
    });

    // Controls
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);

    // Touch Swipe Gestures for Mobile
    let touchStartX = 0;
    let touchEndX = 0;
    container.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      if (touchStartX - touchEndX > 50) {
        nextSlide();
      } else if (touchEndX - touchStartX > 50) {
        prevSlide();
      }
    }, { passive: true });

    // Autoplay & Pause on Hover
    startSlideAutoplay();
    container.addEventListener('mouseenter', stopSlideAutoplay);
    container.addEventListener('mouseleave', startSlideAutoplay);

  } catch (err) {
    console.error('Error initializing slideshow:', err);
  }
}

function goToSlide(index) {
  if (!slidesData.length) return;
  const slides = document.querySelectorAll('.slide-item');
  const dots = document.querySelectorAll('.slide-dot');

  slides.forEach((s) => s.classList.remove('active'));
  dots.forEach((d) => d.classList.remove('active'));

  currentSlideIndex = (index + slidesData.length) % slidesData.length;

  slides[currentSlideIndex]?.classList.add('active');
  dots[currentSlideIndex]?.classList.add('active');
}

function nextSlide() {
  goToSlide(currentSlideIndex + 1);
}

function prevSlide() {
  goToSlide(currentSlideIndex - 1);
}

function startSlideAutoplay() {
  stopSlideAutoplay();
  slideInterval = setInterval(nextSlide, 5000);
}

function stopSlideAutoplay() {
  if (slideInterval) clearInterval(slideInterval);
}

function renderCurrentSlide() {
  slidesData.forEach((slide, idx) => {
    const titleEl = document.getElementById(`slide-title-${idx}`);
    const descEl = document.getElementById(`slide-desc-${idx}`);
    if (titleEl) titleEl.textContent = getFieldInLanguage(slide, 'title');
    if (descEl) descEl.textContent = getFieldInLanguage(slide, 'description');
  });
}

// ----------------------------------------------------------------
// HOMEPAGE PRODUCTS
// ----------------------------------------------------------------
let homepageProducts = [];

async function loadHomepageProducts() {
  const container = document.getElementById('homepage-products-grid');
  if (!container) return;

  container.innerHTML = `
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
  `;

  try {
    const res = await getProducts({ page: 1, limit: 8, onlyActive: true });
    homepageProducts = res.products;
    renderHomepageProducts();
  } catch (err) {
    console.error('Error loading homepage products:', err);
    container.innerHTML = `<div class="empty-state-box">${t('noProductsFound')}</div>`;
  }
}

function renderHomepageProducts() {
  const container = document.getElementById('homepage-products-grid');
  if (!container) return;

  if (!homepageProducts.length) {
    container.innerHTML = `<div class="empty-state-box">${t('noProductsFound')}</div>`;
    return;
  }

  container.innerHTML = '';
  homepageProducts.forEach((product) => {
    const title = getFieldInLanguage(product, 'name');
    const desc = getFieldInLanguage(product, 'description');
    const priceStr = formatCurrency(product.price);

    const card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-img-box">
        <img src="${product.image_url}" alt="${escapeHTML(title)}" class="product-img" loading="lazy">
        <span class="product-category-tag">${escapeHTML(product.category || 'Pumps')}</span>
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
    container.appendChild(card);
  });

  // Attach Buy triggers
  container.querySelectorAll('.btn-buy-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const prodId = btn.getAttribute('data-product-id');
      const prod = homepageProducts.find((p) => String(p.id) === String(prodId));
      if (prod) openBuyModal(prod);
    });
  });
}

// ----------------------------------------------------------------
// HOMEPAGE APPLICATIONS (4 items initially: 2x2 on mobile)
// ----------------------------------------------------------------
let homepageApps = [];

async function loadHomepageApplications() {
  const container = document.getElementById('homepage-applications-grid');
  if (!container) return;

  try {
    homepageApps = await getApplications(true, 4);
    renderHomepageApplications();
  } catch (err) {
    console.error('Error loading applications:', err);
    container.innerHTML = `<div class="empty-state-box">${t('noApplicationsFound')}</div>`;
  }
}

function renderHomepageApplications() {
  const container = document.getElementById('homepage-applications-grid');
  if (!container) return;

  if (!homepageApps.length) {
    container.innerHTML = `<div class="empty-state-box">${t('noApplicationsFound')}</div>`;
    return;
  }

  container.innerHTML = '';
  homepageApps.forEach((app) => {
    const title = getFieldInLanguage(app, 'name');
    const desc = getFieldInLanguage(app, 'description');

    const card = document.createElement('div');
    card.className = 'app-card';
    card.innerHTML = `
      <div class="app-thumb-box" data-video-url="${app.video_url}">
        <img src="${app.thumbnail_url || 'assets/images/u.jpg'}" alt="${escapeHTML(title)}" class="app-thumb-img" loading="lazy">
        <div class="play-badge">
          <div class="play-icon-circle">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
        </div>
      </div>
      <div class="app-body">
        <h3 class="app-title">${escapeHTML(title)}</h3>
        <p class="app-desc">${escapeHTML(desc)}</p>
      </div>
    `;
    container.appendChild(card);

    // Click to open video modal
    card.querySelector('.app-thumb-box')?.addEventListener('click', () => {
      openVideoModal(title, app.video_url);
    });
  });
}

// ----------------------------------------------------------------
// VIDEO MODAL
// ----------------------------------------------------------------
function openVideoModal(title, videoUrl) {
  let modal = document.getElementById('video-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'video-modal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-box modal-lg">
        <button class="modal-close-btn" id="video-modal-close">&times;</button>
        <h3 class="modal-title" id="video-modal-title"></h3>
        <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin-top:16px;border-radius:8px;">
          <iframe id="video-modal-iframe" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen></iframe>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#video-modal-close').addEventListener('click', () => {
      closeVideoModal();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeVideoModal();
    });
  }

  modal.querySelector('#video-modal-title').textContent = title;
  const iframe = modal.querySelector('#video-modal-iframe');
  iframe.src = videoUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ';
  modal.classList.add('active');
}

function closeVideoModal() {
  const modal = document.getElementById('video-modal');
  if (modal) {
    const iframe = modal.querySelector('#video-modal-iframe');
    if (iframe) iframe.src = '';
    modal.classList.remove('active');
  }
}

// ----------------------------------------------------------------
// BUY & PAYMENT MODAL
// ----------------------------------------------------------------
function setupBuyModal() {
  const modal = document.getElementById('buy-payment-modal');
  const closeBtn = document.getElementById('buy-modal-close');
  const cancelBtn = document.getElementById('buy-modal-cancel');
  const form = document.getElementById('buy-payment-form');

  const close = () => {
    if (modal) modal.classList.remove('active');
    activeBuyProduct = null;
    form?.reset();
    const progress = document.getElementById('upload-progress-bar');
    if (progress) progress.style.display = 'none';
  };

  if (closeBtn) closeBtn.addEventListener('click', close);
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
  }

  // Handle Form Submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const customerName = document.getElementById('buy-customer-name')?.value.trim();
      const phone = document.getElementById('buy-customer-phone')?.value.trim();
      const note = document.getElementById('buy-customer-note')?.value.trim();
      const fileInput = document.getElementById('buy-receipt-file');
      const submitBtn = document.getElementById('buy-submit-btn');

      if (!customerName || !phone) {
        showToast(t('bookingFullName') + ' & ' + t('bookingPhone') + ' required', 'warning');
        return;
      }

      const receiptFile = fileInput?.files?.[0];
      const validation = validateReceiptFile(receiptFile);
      if (!validation.valid) {
        showToast(validation.error, 'error');
        return;
      }

      // Progress animation
      const progressBar = document.getElementById('upload-progress-bar');
      const progressFill = document.getElementById('upload-progress-fill');
      if (progressBar && progressFill) {
        progressBar.style.display = 'block';
        progressFill.style.width = '35%';
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
      }

      try {
        if (progressFill) progressFill.style.width = '70%';

        await submitPaymentOrder({
          productId: activeBuyProduct?.id || null,
          productName: activeBuyProduct ? getFieldInLanguage(activeBuyProduct, 'name') : 'General Order',
          customerName,
          phone,
          receiptFile,
          note
        });

        if (progressFill) progressFill.style.width = '100%';

        showToast(t('orderSubmittedSuccess'), 'success', 6000);
        close();
      } catch (err) {
        console.error('Order submit error:', err);
        showToast(err.message || 'Payment submission failed. Please try again.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = t('btnSubmit');
        }
      }
    });
  }
}

export function openBuyModal(product) {
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

  // Bank account: load from settings (default "1000" per prompt specification)
  const bankAcc = siteSettingsData.payment_account || '1000';
  const bankName = siteSettingsData.bank_name || 'Commercial Bank of Ethiopia (CBE)';
  if (accountEl) accountEl.textContent = bankAcc;
  if (bankNameEl) bankNameEl.textContent = bankName;

  modal.classList.add('active');
}

// ----------------------------------------------------------------
// BOOKING FORM
// ----------------------------------------------------------------
function setupBookingForm() {
  const form = document.getElementById('consultation-booking-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const customerName = document.getElementById('booking-name')?.value.trim();
    const phone = document.getElementById('booking-phone')?.value.trim();
    const email = document.getElementById('booking-email')?.value.trim();
    const preferredDate = document.getElementById('booking-date')?.value;
    const preferredTime = document.getElementById('booking-time')?.value;
    const serviceType = document.getElementById('booking-service')?.value;
    const message = document.getElementById('booking-message')?.value.trim();
    const submitBtn = document.getElementById('booking-submit-btn');

    if (!customerName || !phone || !preferredDate || !preferredTime || !serviceType) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
    }

    try {
      const result = await submitBooking({
        customerName,
        phone,
        email,
        preferredDate,
        preferredTime,
        serviceType,
        message
      });

      form.reset();
      showToast(`${t('bookingSuccess')} ${result.referenceCode}`, 'success', 8000);

      // Show friendly confirmation box
      const resultBox = document.getElementById('booking-result-box');
      if (resultBox) {
        resultBox.style.display = 'block';
        resultBox.innerHTML = `
          <div style="background:#DCFCE7;border:1px solid #86EFAC;color:#15803D;padding:20px;border-radius:10px;text-align:center;">
            <h4 style="font-weight:800;font-size:1.2rem;margin-bottom:8px;">Booking Confirmed!</h4>
            <p style="margin-bottom:8px;">Your consultation request has been submitted. Our engineering team will contact you shortly.</p>
            <div style="font-size:1.4rem;font-weight:900;letter-spacing:2px;color:#166534;">${result.referenceCode}</div>
          </div>
        `;
      }
    } catch (err) {
      console.error('Booking submission error:', err);
      showToast(err.message || 'Could not submit booking.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = t('btnSubmit');
      }
    }
  });
}
