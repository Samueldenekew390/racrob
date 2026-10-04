/**
 * RACROB Water Pump Supplier - Admin Authentication Controller
 * Pure Vanilla JavaScript & Supabase Auth API
 */

import { loginAdmin, getCurrentAdmin } from './supabase.js';
import {
  getSelectedLanguage,
  applyLanguage,
  showToast
} from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  applyLanguage(getSelectedLanguage());

  // Check if admin is already signed in; if so, redirect immediately to admin.html
  try {
    const admin = await getCurrentAdmin();
    if (admin) {
      window.location.href = 'admin.html';
      return;
    }
  } catch (err) {
    console.warn('Session check:', err);
  }

  const form = document.getElementById('admin-login-form');
  const errorMsgEl = document.getElementById('login-error-message');
  const submitBtn = document.getElementById('login-submit-btn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (errorMsgEl) {
      errorMsgEl.style.display = 'none';
      errorMsgEl.textContent = '';
    }

    const email = document.getElementById('admin-email')?.value.trim();
    const password = document.getElementById('admin-password')?.value;

    if (!email || !password) {
      if (errorMsgEl) {
        errorMsgEl.textContent = 'Please enter both email and password.';
        errorMsgEl.style.display = 'block';
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Authenticating...';
    }

    try {
      const res = await loginAdmin(email, password);
      showToast('Authentication successful. Redirecting...', 'success', 2000);
      setTimeout(() => {
        window.location.href = 'admin.html';
      }, 700);
    } catch (err) {
      console.error('Login error:', err);
      if (errorMsgEl) {
        errorMsgEl.textContent = err.message || 'Invalid credentials or non-admin account.';
        errorMsgEl.style.display = 'block';
      }
      showToast(err.message || 'Login failed.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In to Dashboard';
      }
    }
  });
});
