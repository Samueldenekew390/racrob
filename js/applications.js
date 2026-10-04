/**
 * RACROB Water Pump Supplier - Applications Controller
 * Pure Vanilla JavaScript & Supabase Client
 */

import { getApplications, getSiteSettings } from './supabase.js';
import {
  getSelectedLanguage,
  setSelectedLanguage,
  applyLanguage,
  t,
  getFieldInLanguage,
  escapeHTML
} from './utils.js';

let siteSettingsData = {};
let allApplications = [];

document.addEventListener('DOMContentLoaded', async () => {
  const initialLang = getSelectedLanguage();
  applyLanguage(initialLang);
  setupLanguageSelector();
  setupMobileNav();

  siteSettingsData = await getSiteSettings();
  updateSettingsUI();

  await loadApplications();

  window.addEventListener('racrob_language_changed', () => {
    renderApplications(allApplications);
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

async function loadApplications() {
  const container = document.getElementById('applications-page-grid');
  if (!container) return;

  try {
    allApplications = await getApplications(true);
    renderApplications(allApplications);
  } catch (err) {
    console.error('Error fetching applications:', err);
    container.innerHTML = `<div class="empty-state-box">${t('noApplicationsFound')}</div>`;
  }
}

function renderApplications(apps) {
  const container = document.getElementById('applications-page-grid');
  if (!container) return;

  if (!apps.length) {
    container.innerHTML = `<div class="empty-state-box">${t('noApplicationsFound')}</div>`;
    return;
  }

  container.innerHTML = '';
  apps.forEach((app) => {
    const title = getFieldInLanguage(app, 'name');
    const desc = getFieldInLanguage(app, 'description');

    const card = document.createElement('article');
    card.className = 'app-card';
    card.innerHTML = `
      <div class="app-thumb-box" data-video="${app.video_url}">
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
        <div style="margin-top: 16px;">
          <a href="booking.html" class="btn btn-secondary btn-sm" style="width: 100%;">Book Consultation</a>
        </div>
      </div>
    `;
    container.appendChild(card);

    card.querySelector('.app-thumb-box')?.addEventListener('click', () => {
      openVideoModal(title, app.video_url);
    });
  });
}

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

    modal.querySelector('#video-modal-close')?.addEventListener('click', () => {
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
