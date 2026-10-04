/**
 * RACROB Water Pump Supplier - Utility Functions & UI Helpers
 */

import { translations } from './translations.js';

// Language persistence & management
const LANG_KEY = 'racrob_selected_lang';

export function getSelectedLanguage() {
  const stored = localStorage.getItem(LANG_KEY);
  if (stored && translations[stored]) {
    return stored;
  }
  return 'en';
}

export function setSelectedLanguage(lang) {
  if (translations[lang]) {
    localStorage.setItem(LANG_KEY, lang);
    applyLanguage(lang);
    window.dispatchEvent(new CustomEvent('racrob_language_changed', { detail: { lang } }));
  }
}

export function t(key) {
  const lang = getSelectedLanguage();
  const dict = translations[lang] || translations.en;
  return dict[key] || translations.en[key] || key;
}

export function getFieldInLanguage(item, fieldPrefix) {
  const lang = getSelectedLanguage();
  return item[`${fieldPrefix}_${lang}`] || item[`${fieldPrefix}_en`] || item[fieldPrefix] || '';
}

export function applyLanguage(lang) {
  const dict = translations[lang] || translations.en;
  document.documentElement.lang = lang;
  document.documentElement.dir = dict.dir || 'ltr';

  if (dict.dir === 'rtl') {
    document.body.classList.add('rtl-layout');
  } else {
    document.body.classList.remove('rtl-layout');
  }

  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key && dict[key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.setAttribute('placeholder', dict[key]);
      } else {
        el.textContent = dict[key];
      }
    }
  });

  // Update elements with data-i18n-attr (e.g. data-i18n-attr="placeholder:searchPlaceholder")
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    const raw = el.getAttribute('data-i18n-attr');
    if (raw) {
      const parts = raw.split(':');
      if (parts.length === 2) {
        const attr = parts[0].trim();
        const key = parts[1].trim();
        if (dict[key]) {
          el.setAttribute(attr, dict[key]);
        }
      }
    }
  });
}

// Accessible Toast Notification System
export function showToast(message, type = 'info', duration = 4500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Notifications');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  toast.setAttribute('role', 'status');

  const iconSvg = {
    success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
    error: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  }[type] || '';

  toast.innerHTML = `
    <div class="toast-content">
      ${iconSvg}
      <span class="toast-text">${escapeHTML(message)}</span>
    </div>
    <button class="toast-close" aria-label="Close notification">&times;</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  const removeToast = () => {
    toast.classList.add('toast-fadeout');
    setTimeout(() => toast.remove(), 250);
  };

  closeBtn.addEventListener('click', removeToast);

  container.appendChild(toast);
  setTimeout(removeToast, duration);
}

// Confirmation Dialog Helper (Safety against accidental deletion)
export function confirmAction(message, onConfirm, title = 'Confirm Action') {
  let modal = document.getElementById('confirmation-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'confirmation-modal';
    modal.className = 'modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="modal-box modal-confirm">
        <h3 class="modal-title" id="confirm-modal-title">Confirm Action</h3>
        <p class="modal-body" id="confirm-modal-body"></p>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="confirm-modal-cancel">Cancel</button>
          <button class="btn btn-danger" id="confirm-modal-accept">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const titleEl = modal.querySelector('#confirm-modal-title');
  const bodyEl = modal.querySelector('#confirm-modal-body');
  const cancelBtn = modal.querySelector('#confirm-modal-cancel');
  const acceptBtn = modal.querySelector('#confirm-modal-accept');

  titleEl.textContent = title;
  bodyEl.textContent = message;

  modal.classList.add('active');

  const cleanup = () => {
    modal.classList.remove('active');
    cancelBtn.onclick = null;
    acceptBtn.onclick = null;
  };

  cancelBtn.onclick = () => cleanup();
  acceptBtn.onclick = () => {
    cleanup();
    if (typeof onConfirm === 'function') onConfirm();
  };

  modal.onclick = (e) => {
    if (e.target === modal) cleanup();
  };
}

// Safe DOM escaping
export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// Format ETB Currency
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Price upon request';
  return Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' ETB';
}

// Format human friendly date
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Generate unique, clean reference code for booking requests
export function generateReferenceCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let random = '';
  for (let i = 0; i < 5; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `RCB-${random}`;
}

// Validate file for receipt uploads
export function validateReceiptFile(file) {
  if (!file) return { valid: false, error: 'Please choose a receipt file to upload.' };
  
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
  const ext = file.name.split('.').pop().toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    return { valid: false, error: 'Only JPG, JPEG, PNG, WEBP or PDF receipt files are supported.' };
  }

  // 10MB limit
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'Receipt file size must be under 10MB.' };
  }

  return { valid: true };
}
