/**
 * RACROB Water Pump Supplier - Booking Page Controller
 * Pure Vanilla JavaScript & Supabase Client
 */

import { submitBooking, getSiteSettings } from './supabase.js';
import {
  getSelectedLanguage,
  setSelectedLanguage,
  applyLanguage,
  t,
  showToast
} from './utils.js';

let siteSettingsData = {};

document.addEventListener('DOMContentLoaded', async () => {
  const initialLang = getSelectedLanguage();
  applyLanguage(initialLang);
  setupLanguageSelector();
  setupMobileNav();

  siteSettingsData = await getSiteSettings();
  updateSettingsUI();

  // Set minimum date to tomorrow
  const dateInput = document.getElementById('booking-date');
  if (dateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];
  }

  setupBookingForm();

  window.addEventListener('racrob_language_changed', () => {
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

      const resultBox = document.getElementById('booking-result-box');
      if (resultBox) {
        resultBox.style.display = 'block';
        resultBox.innerHTML = `
          <div style="background:#DCFCE7;border:1px solid #86EFAC;color:#15803D;padding:24px;border-radius:12px;text-align:center;">
            <svg style="width:48px;height:48px;margin:0 auto 12px auto;color:#16A34A;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
            </svg>
            <h3 style="font-weight:900;font-size:1.4rem;margin-bottom:8px;color:#14532D;">Consultation Scheduled!</h3>
            <p style="margin-bottom:12px;font-size:1rem;color:#166534;">Your reference code for tracking and showroom check-in:</p>
            <div style="font-size:1.8rem;font-weight:900;letter-spacing:3px;color:#15803D;background:#FFFFFF;display:inline-block;padding:8px 24px;border-radius:8px;border:1px dashed #86EFAC;">
              ${result.referenceCode}
            </div>
            <p style="margin-top:14px;font-size:0.9rem;color:#166534;">We will contact you via phone (${phone}) prior to your scheduled time.</p>
          </div>
        `;
        resultBox.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Booking error:', err);
      showToast(err.message || 'Could not schedule booking.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = t('btnSubmit');
      }
    }
  });
}
