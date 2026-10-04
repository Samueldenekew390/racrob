/**
 * RACROB Water Pump Supplier - Comprehensive Admin Dashboard Controller
 * Pure Vanilla JavaScript & Supabase Client
 */

import {
  getCurrentAdmin,
  logoutAdmin,
  getSiteSettings,
  updateSiteSetting,
  getSlides,
  saveSlide,
  deleteSlide,
  getProducts,
  saveProduct,
  deleteProduct,
  getApplications,
  saveApplication,
  deleteApplication,
  getOrders,
  updateOrderStatus,
  deleteOrder,
  getReceiptSignedUrl,
  getBookings,
  updateBookingStatus,
  deleteBooking,
  updateAdminEmail,
  updateAdminPassword,
  uploadPublicAsset
} from './supabase.js';

import {
  showToast,
  confirmAction,
  formatCurrency,
  formatDate,
  escapeHTML
} from './utils.js';

// State
let currentTab = 'overview';
let cachedProducts = [];
let cachedSlides = [];
let cachedApps = [];
let cachedOrders = [];
let cachedBookings = [];
let cachedSettings = {};

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Session Guard: Ensure current user is an authorized admin
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      window.location.href = 'login.html';
      return;
    }
    const adminEmailEl = document.getElementById('admin-user-email');
    if (adminEmailEl) adminEmailEl.textContent = admin.email || 'Admin';
  } catch (err) {
    console.error('Admin session validation failed:', err);
    window.location.href = 'login.html';
    return;
  }

  // 2. Setup Navigation Tabs
  setupAdminNavigation();

  // 3. Setup Mobile Sidebar Toggle
  setupAdminSidebar();

  // 4. Setup Logout
  setupLogout();

  // 5. Initial Data Load
  await refreshDashboardData();

  // 6. Setup Form Submissions
  setupForms();
});

// ----------------------------------------------------------------
// NAVIGATION & SIDEBAR
// ----------------------------------------------------------------
function setupAdminNavigation() {
  document.querySelectorAll('.admin-nav-item button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab === 'logout') return;

      switchTab(tab);
    });
  });
}

function switchTab(tabId) {
  currentTab = tabId;

  // Update nav item active states
  document.querySelectorAll('.admin-nav-item').forEach((item) => {
    const btn = item.querySelector('button');
    if (btn?.getAttribute('data-tab') === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update tab panels
  document.querySelectorAll('.admin-tab-panel').forEach((panel) => {
    panel.classList.remove('active');
  });

  const activePanel = document.getElementById(`panel-${tabId}`);
  if (activePanel) activePanel.classList.add('active');

  // Update Topbar Title
  const titles = {
    overview: 'Dashboard Overview',
    products: 'Products Management',
    applications: 'Applications & Videos',
    slideshow: 'Hero Slideshow Manager',
    orders: 'Customer Orders & Payment Receipts',
    bookings: 'Consultation Bookings',
    settings: 'Website Settings',
    social: 'Social Media Links',
    account: 'Admin Account & Security'
  };
  const titleEl = document.getElementById('admin-header-title');
  if (titleEl) titleEl.textContent = titles[tabId] || 'Dashboard';

  // Close sidebar on mobile
  document.getElementById('admin-sidebar')?.classList.remove('open');
}

function setupAdminSidebar() {
  const toggleBtn = document.getElementById('admin-hamburger-btn');
  const sidebar = document.getElementById('admin-sidebar');
  toggleBtn?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
  });
}

function setupLogout() {
  const logoutBtn = document.getElementById('admin-logout-btn');
  logoutBtn?.addEventListener('click', async () => {
    confirmAction('Are you sure you want to log out of the admin panel?', async () => {
      await logoutAdmin();
      showToast('Logged out successfully.', 'info', 1500);
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 500);
    }, 'Confirm Logout');
  });
}

// ----------------------------------------------------------------
// DATA REFRESH & OVERVIEW
// ----------------------------------------------------------------
async function refreshDashboardData() {
  try {
    const [settings, slides, prodRes, apps, orders, bookings] = await Promise.all([
      getSiteSettings(),
      getSlides(false),
      getProducts({ page: 1, limit: 100, onlyActive: false }),
      getApplications(false),
      getOrders(),
      getBookings()
    ]);

    cachedSettings = settings;
    cachedSlides = slides;
    cachedProducts = prodRes.products;
    cachedApps = apps;
    cachedOrders = orders;
    cachedBookings = bookings;

    renderOverviewMetrics();
    renderProductsTable();
    renderSlidesTable();
    renderApplicationsTable();
    renderOrdersTable();
    renderBookingsTable();
    populateSettingsForm();
    populateSocialForm();
  } catch (err) {
    console.error('Error refreshing admin data:', err);
    showToast('Failed to load dashboard data. Check database connection.', 'error');
  }
}

function renderOverviewMetrics() {
  const totalProds = cachedProducts.length;
  const activeProds = cachedProducts.filter((p) => p.is_active).length;
  const pendingOrders = cachedOrders.filter((o) => o.status === 'pending').length;
  const approvedOrders = cachedOrders.filter((o) => o.status === 'approved').length;
  const pendingBookings = cachedBookings.filter((b) => b.status === 'pending').length;
  const totalApps = cachedApps.length;

  setText('metric-total-products', totalProds);
  setText('metric-active-products', activeProds);
  setText('metric-pending-orders', pendingOrders);
  setText('metric-approved-orders', approvedOrders);
  setText('metric-pending-bookings', pendingBookings);
  setText('metric-total-apps', totalApps);

  // Update notification badges in sidebar
  const orderBadge = document.getElementById('badge-orders-count');
  if (orderBadge) {
    orderBadge.textContent = pendingOrders;
    orderBadge.style.display = pendingOrders > 0 ? 'inline-block' : 'none';
  }

  const bookingBadge = document.getElementById('badge-bookings-count');
  if (bookingBadge) {
    bookingBadge.textContent = pendingBookings;
    bookingBadge.style.display = pendingBookings > 0 ? 'inline-block' : 'none';
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ----------------------------------------------------------------
// PRODUCTS MANAGEMENT
// ----------------------------------------------------------------
function renderProductsTable() {
  const tbody = document.getElementById('admin-products-tbody');
  if (!tbody) return;

  if (!cachedProducts.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;">No products in database yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  cachedProducts.forEach((p) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <img src="${p.image_url}" alt="${escapeHTML(p.name_en)}" style="width:48px;height:48px;object-fit:cover;border-radius:4px;background:#0F172A;">
      </td>
      <td>
        <strong>${escapeHTML(p.name_en)}</strong>
        ${p.model ? `<div style="font-size:0.8rem;color:var(--text-muted);">${escapeHTML(p.model)}</div>` : ''}
      </td>
      <td>${escapeHTML(p.category || 'General')}</td>
      <td><strong>${formatCurrency(p.price)}</strong></td>
      <td>
        <span class="badge ${p.is_active ? 'badge-approved' : 'badge-rejected'}">
          ${p.is_active ? 'Active' : 'Hidden'}
        </span>
      </td>
      <td>${p.sort_order || 0}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon btn-edit-product" data-id="${p.id}" title="Edit Product">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="btn-icon btn-icon-danger btn-delete-product" data-id="${p.id}" title="Delete Product">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Action listeners
  tbody.querySelectorAll('.btn-edit-product').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const prod = cachedProducts.find((p) => String(p.id) === String(id));
      if (prod) openProductModal(prod);
    });
  });

  tbody.querySelectorAll('.btn-delete-product').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const prod = cachedProducts.find((p) => String(p.id) === String(id));
      confirmAction(`Are you sure you want to permanently delete "${prod?.name_en || 'this product'}"?`, async () => {
        try {
          await deleteProduct(id);
          showToast('Product deleted.', 'success');
          await refreshDashboardData();
        } catch (err) {
          showToast(err.message || 'Failed to delete product', 'error');
        }
      }, 'Delete Product');
    });
  });
}

function openProductModal(prod = null) {
  const modal = document.getElementById('product-form-modal');
  const form = document.getElementById('admin-product-form');
  const titleEl = document.getElementById('product-modal-title');
  if (!modal || !form) return;

  form.reset();
  document.getElementById('prod-id').value = prod ? prod.id : '';
  titleEl.textContent = prod ? 'Edit Product' : 'Add New Product';

  if (prod) {
    document.getElementById('prod-name-en').value = prod.name_en || '';
    document.getElementById('prod-name-am').value = prod.name_am || '';
    document.getElementById('prod-desc-en').value = prod.description_en || '';
    document.getElementById('prod-desc-am').value = prod.description_am || '';
    document.getElementById('prod-price').value = prod.price || '';
    document.getElementById('prod-category').value = prod.category || 'Pumps';
    document.getElementById('prod-model').value = prod.model || '';
    document.getElementById('prod-image-url').value = prod.image_url || '';
    document.getElementById('prod-sort').value = prod.sort_order || 0;
    document.getElementById('prod-active').checked = prod.is_active !== false;
    document.getElementById('prod-img-preview').src = prod.image_url || 'assets/images/u.jpg';
  } else {
    document.getElementById('prod-active').checked = true;
    document.getElementById('prod-image-url').value = 'assets/images/u.jpg';
    document.getElementById('prod-img-preview').src = 'assets/images/u.jpg';
  }

  modal.classList.add('active');
}

// ----------------------------------------------------------------
// SLIDESHOW MANAGEMENT
// ----------------------------------------------------------------
function renderSlidesTable() {
  const tbody = document.getElementById('admin-slides-tbody');
  if (!tbody) return;

  if (!cachedSlides.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;">No hero slides found.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  cachedSlides.forEach((slide) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${slide.sort_order || 0}</td>
      <td>
        <img src="${slide.image_url}" alt="${escapeHTML(slide.title_en)}" style="width:70px;height:45px;object-fit:cover;border-radius:4px;">
      </td>
      <td>
        <strong>${escapeHTML(slide.title_en)}</strong>
        <div style="font-size:0.8rem;color:var(--text-muted);">${escapeHTML(slide.title_am || '')}</div>
      </td>
      <td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
        ${escapeHTML(slide.description_en || '')}
      </td>
      <td>
        <span class="badge ${slide.is_active ? 'badge-approved' : 'badge-rejected'}">
          ${slide.is_active ? 'Active' : 'Disabled'}
        </span>
      </td>
      <td>
        <div class="table-actions">
          <button class="btn-icon btn-edit-slide" data-id="${slide.id}" title="Edit Slide">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="btn-icon btn-icon-danger btn-delete-slide" data-id="${slide.id}" title="Delete Slide">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-edit-slide').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const slide = cachedSlides.find((s) => String(s.id) === String(id));
      if (slide) openSlideModal(slide);
    });
  });

  tbody.querySelectorAll('.btn-delete-slide').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      confirmAction('Are you sure you want to delete this slide from the homepage slideshow?', async () => {
        try {
          await deleteSlide(id);
          showToast('Slide deleted.', 'success');
          await refreshDashboardData();
        } catch (err) {
          showToast(err.message || 'Failed to delete slide', 'error');
        }
      }, 'Delete Slide');
    });
  });
}

function openSlideModal(slide = null) {
  const modal = document.getElementById('slide-form-modal');
  const form = document.getElementById('admin-slide-form');
  const titleEl = document.getElementById('slide-modal-title');
  if (!modal || !form) return;

  form.reset();
  document.getElementById('slide-id').value = slide ? slide.id : '';
  titleEl.textContent = slide ? 'Edit Slide' : 'Add New Slide';

  if (slide) {
    document.getElementById('slide-title-en').value = slide.title_en || '';
    document.getElementById('slide-title-am').value = slide.title_am || '';
    document.getElementById('slide-desc-en').value = slide.description_en || '';
    document.getElementById('slide-desc-am').value = slide.description_am || '';
    document.getElementById('slide-image-url').value = slide.image_url || '';
    document.getElementById('slide-sort').value = slide.sort_order || 0;
    document.getElementById('slide-active').checked = slide.is_active !== false;
    document.getElementById('slide-img-preview').src = slide.image_url || 'assets/images/u.jpg';
  } else {
    document.getElementById('slide-active').checked = true;
    document.getElementById('slide-sort').value = cachedSlides.length + 1;
    document.getElementById('slide-image-url').value = 'assets/images/u.jpg';
    document.getElementById('slide-img-preview').src = 'assets/images/u.jpg';
  }

  modal.classList.add('active');
}

// ----------------------------------------------------------------
// APPLICATIONS MANAGEMENT
// ----------------------------------------------------------------
function renderApplicationsTable() {
  const tbody = document.getElementById('admin-apps-tbody');
  if (!tbody) return;

  if (!cachedApps.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;">No applications added yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  cachedApps.forEach((app) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${app.sort_order || 0}</td>
      <td>
        <img src="${app.thumbnail_url || 'assets/images/u.jpg'}" alt="${escapeHTML(app.name_en)}" style="width:60px;height:40px;object-fit:cover;border-radius:4px;">
      </td>
      <td>
        <strong>${escapeHTML(app.name_en)}</strong>
        <div style="font-size:0.8rem;color:var(--text-muted);">${escapeHTML(app.name_am || '')}</div>
      </td>
      <td style="font-size:0.85rem;color:var(--accent-blue);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
        ${escapeHTML(app.video_url || 'N/A')}
      </td>
      <td>
        <span class="badge ${app.is_active ? 'badge-approved' : 'badge-rejected'}">
          ${app.is_active ? 'Active' : 'Disabled'}
        </span>
      </td>
      <td>
        <div class="table-actions">
          <button class="btn-icon btn-edit-app" data-id="${app.id}" title="Edit Application">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="btn-icon btn-icon-danger btn-delete-app" data-id="${app.id}" title="Delete Application">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-edit-app').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const app = cachedApps.find((a) => String(a.id) === String(id));
      if (app) openAppModal(app);
    });
  });

  tbody.querySelectorAll('.btn-delete-app').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      confirmAction('Are you sure you want to delete this application record?', async () => {
        try {
          await deleteApplication(id);
          showToast('Application deleted.', 'success');
          await refreshDashboardData();
        } catch (err) {
          showToast(err.message || 'Failed to delete application', 'error');
        }
      }, 'Delete Application');
    });
  });
}

function openAppModal(app = null) {
  const modal = document.getElementById('app-form-modal');
  const form = document.getElementById('admin-app-form');
  const titleEl = document.getElementById('app-modal-title');
  if (!modal || !form) return;

  form.reset();
  document.getElementById('app-id').value = app ? app.id : '';
  titleEl.textContent = app ? 'Edit Application' : 'Add New Application';

  if (app) {
    document.getElementById('app-name-en').value = app.name_en || '';
    document.getElementById('app-name-am').value = app.name_am || '';
    document.getElementById('app-desc-en').value = app.description_en || '';
    document.getElementById('app-desc-am').value = app.description_am || '';
    document.getElementById('app-video-url').value = app.video_url || '';
    document.getElementById('app-thumb-url').value = app.thumbnail_url || '';
    document.getElementById('app-sort').value = app.sort_order || 0;
    document.getElementById('app-active').checked = app.is_active !== false;
  } else {
    document.getElementById('app-active').checked = true;
    document.getElementById('app-sort').value = cachedApps.length + 1;
    document.getElementById('app-thumb-url').value = 'assets/images/o.jpg';
  }

  modal.classList.add('active');
}

// ----------------------------------------------------------------
// ORDERS / PAYMENTS MANAGEMENT
// ----------------------------------------------------------------
function renderOrdersTable() {
  const tbody = document.getElementById('admin-orders-tbody');
  if (!tbody) return;

  if (!cachedOrders.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;">No customer payment submissions yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  cachedOrders.forEach((o) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHTML(o.product_name)}</strong></td>
      <td>
        <div>${escapeHTML(o.customer_name)}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);">${escapeHTML(o.note || '')}</div>
      </td>
      <td><a href="tel:${o.phone}" style="color:var(--accent-blue);font-weight:600;">${escapeHTML(o.phone)}</a></td>
      <td>
        <button class="btn btn-secondary btn-sm btn-view-receipt" data-receipt="${o.receipt_url}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          View Receipt
        </button>
      </td>
      <td>${formatDate(o.created_at)}</td>
      <td>
        <span class="badge badge-${o.status}">
          ${o.status.toUpperCase()}
        </span>
      </td>
      <td>
        <div class="table-actions">
          ${o.status !== 'approved' ? `
            <button class="btn-icon btn-icon-success btn-approve-order" data-id="${o.id}" title="Approve Payment">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
            </button>
          ` : ''}
          ${o.status !== 'rejected' ? `
            <button class="btn-icon btn-icon-danger btn-reject-order" data-id="${o.id}" title="Reject Payment">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </button>
          ` : ''}
          <button class="btn-icon btn-icon-danger btn-delete-order" data-id="${o.id}" title="Delete Record">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Receipt viewer modal
  tbody.querySelectorAll('.btn-view-receipt').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const receiptPath = btn.getAttribute('data-receipt');
      try {
        const signedUrl = await getReceiptSignedUrl(receiptPath);
        if (signedUrl) {
          openReceiptViewerModal(signedUrl);
        } else {
          showToast('Could not load receipt file from storage.', 'warning');
        }
      } catch (e) {
        showToast('Storage error loading receipt', 'error');
      }
    });
  });

  // Approve
  tbody.querySelectorAll('.btn-approve-order').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      confirmAction('Approve this customer payment receipt as verified?', async () => {
        try {
          await updateOrderStatus(id, 'approved');
          showToast('Order payment approved.', 'success');
          await refreshDashboardData();
        } catch (err) {
          showToast(err.message || 'Failed to update order status', 'error');
        }
      }, 'Approve Payment');
    });
  });

  // Reject
  tbody.querySelectorAll('.btn-reject-order').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      confirmAction('Reject this payment receipt (invalid or unverified deposit)?', async () => {
        try {
          await updateOrderStatus(id, 'rejected');
          showToast('Order marked as rejected.', 'warning');
          await refreshDashboardData();
        } catch (err) {
          showToast(err.message || 'Failed to update order status', 'error');
        }
      }, 'Reject Payment');
    });
  });

  // Delete
  tbody.querySelectorAll('.btn-delete-order').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      confirmAction('Permanently delete this order record? This action cannot be undone.', async () => {
        try {
          await deleteOrder(id);
          showToast('Order deleted.', 'success');
          await refreshDashboardData();
        } catch (err) {
          showToast(err.message || 'Failed to delete order', 'error');
        }
      }, 'Delete Order');
    });
  });
}

function openReceiptViewerModal(url) {
  let modal = document.getElementById('receipt-viewer-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'receipt-viewer-modal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-box modal-lg" style="text-align:center;">
        <button class="modal-close-btn" id="receipt-modal-close">&times;</button>
        <h3 class="modal-title" style="margin-bottom:16px;">Bank Deposit Receipt</h3>
        <div id="receipt-embed-container" style="max-height:70vh;overflow:auto;border:1px solid #E2E8F0;border-radius:8px;padding:8px;background:#0F172A;">
          <img id="receipt-modal-img" src="" alt="Customer Receipt" style="max-width:100%;height:auto;margin:0 auto;">
        </div>
        <div style="margin-top:16px;">
          <a id="receipt-download-link" href="" target="_blank" class="btn btn-primary btn-sm">Open in New Tab</a>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#receipt-modal-close')?.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
  }

  const img = modal.querySelector('#receipt-modal-img');
  const link = modal.querySelector('#receipt-download-link');
  if (img) img.src = url;
  if (link) link.href = url;
  modal.classList.add('active');
}

// ----------------------------------------------------------------
// BOOKINGS MANAGEMENT
// ----------------------------------------------------------------
function renderBookingsTable() {
  const tbody = document.getElementById('admin-bookings-tbody');
  if (!tbody) return;

  if (!cachedBookings.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;">No consultation bookings yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  cachedBookings.forEach((b) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong style="color:var(--brand-blue);">${escapeHTML(b.reference_code)}</strong>
      </td>
      <td>
        <strong>${escapeHTML(b.customer_name)}</strong>
        ${b.email ? `<div style="font-size:0.8rem;color:var(--text-muted);">${escapeHTML(b.email)}</div>` : ''}
      </td>
      <td><a href="tel:${b.phone}" style="color:var(--accent-blue);">${escapeHTML(b.phone)}</a></td>
      <td>
        <div><strong>${b.preferred_date}</strong></div>
        <div style="font-size:0.8rem;color:var(--text-muted);">${b.preferred_time}</div>
      </td>
      <td>
        <div>${escapeHTML(b.service_type)}</div>
        ${b.message ? `<div style="font-size:0.75rem;color:var(--text-muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHTML(b.message)}</div>` : ''}
      </td>
      <td>
        <span class="badge badge-${b.status}">${b.status.toUpperCase()}</span>
      </td>
      <td>
        <div class="table-actions">
          ${b.status !== 'approved' ? `
            <button class="btn-icon btn-icon-success btn-approve-booking" data-id="${b.id}" title="Approve Booking">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
            </button>
          ` : ''}
          ${b.status !== 'rejected' ? `
            <button class="btn-icon btn-icon-danger btn-reject-booking" data-id="${b.id}" title="Reject Booking">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </button>
          ` : ''}
          <button class="btn-icon btn-icon-danger btn-delete-booking" data-id="${b.id}" title="Delete Booking">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-approve-booking').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      confirmAction('Approve this consultation appointment?', async () => {
        try {
          await updateBookingStatus(id, 'approved');
          showToast('Booking approved.', 'success');
          await refreshDashboardData();
        } catch (err) {
          showToast(err.message || 'Failed to update booking status', 'error');
        }
      }, 'Approve Booking');
    });
  });

  tbody.querySelectorAll('.btn-reject-booking').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      confirmAction('Reject or cancel this consultation booking?', async () => {
        try {
          await updateBookingStatus(id, 'rejected');
          showToast('Booking rejected.', 'warning');
          await refreshDashboardData();
        } catch (err) {
          showToast(err.message || 'Failed to update booking status', 'error');
        }
      }, 'Reject Booking');
    });
  });

  tbody.querySelectorAll('.btn-delete-booking').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      confirmAction('Delete this booking record permanently?', async () => {
        try {
          await deleteBooking(id);
          showToast('Booking record deleted.', 'success');
          await refreshDashboardData();
        } catch (err) {
          showToast(err.message || 'Failed to delete booking', 'error');
        }
      }, 'Delete Booking');
    });
  });
}

// ----------------------------------------------------------------
// WEBSITE SETTINGS & SOCIAL LINKS
// ----------------------------------------------------------------
function populateSettingsForm() {
  const setVal = (id, key, def = '') => {
    const el = document.getElementById(id);
    if (el) el.value = cachedSettings[key] !== undefined ? cachedSettings[key] : def;
  };

  setVal('set-business-name', 'business_name', 'RACROB');
  setVal('set-phone', 'phone_number', '0940414141');
  setVal('set-email', 'email', 'contact@racrob.et');
  setVal('set-address', 'address', 'Wereda 03, H.NO. 1263, Office NO.201, Ethio China St, Addis Abeba, Ethiopia');
  setVal('set-bank-account', 'payment_account', '1000');
  setVal('set-bank-name', 'bank_name', 'Commercial Bank of Ethiopia (CBE)');
  setVal('set-account-holder', 'account_holder', 'RACROB Trading PLC');
  setVal('set-hero-heading', 'hero_heading', 'Powering Reliable Water Solutions');
  setVal('set-hero-desc', 'hero_description', 'From dependable water supply to demanding pumping applications, RACROB provides practical water-pumping solutions designed around performance, reliability and the needs of every customer.');
  setVal('set-maps-url', 'google_maps_url', '');
}

function populateSocialForm() {
  const setVal = (id, key, def = '') => {
    const el = document.getElementById(id);
    if (el) el.value = cachedSettings[key] !== undefined ? cachedSettings[key] : def;
  };

  setVal('social-fb', 'facebook_url', 'https://www.facebook.com/share/1FaYKw8d7y/');
  setVal('social-tw', 'twitter_url', '');
  setVal('social-in', 'linkedin_url', '');
  setVal('social-ig', 'instagram_url', '');
  setVal('social-tt', 'tiktok_url', '');
}

// ----------------------------------------------------------------
// FORM SUBMISSION EVENT HANDLERS
// ----------------------------------------------------------------
function setupForms() {
  // Add Product Button
  document.getElementById('btn-add-product')?.addEventListener('click', () => openProductModal());
  document.getElementById('prod-modal-close')?.addEventListener('click', () => {
    document.getElementById('product-form-modal')?.classList.remove('active');
  });

  // Product Image File Upload
  document.getElementById('prod-file-input')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        showToast('Uploading image to Supabase storage...', 'info', 2000);
        const url = await uploadPublicAsset('product-images', file, 'products');
        document.getElementById('prod-image-url').value = url;
        document.getElementById('prod-img-preview').src = url;
        showToast('Image uploaded successfully!', 'success');
      } catch (err) {
        showToast('Storage upload failed: ' + err.message, 'error');
      }
    }
  });

  // Product Form Submit
  document.getElementById('admin-product-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const name_en = document.getElementById('prod-name-en').value.trim();
    const name_am = document.getElementById('prod-name-am').value.trim();
    const description_en = document.getElementById('prod-desc-en').value.trim();
    const description_am = document.getElementById('prod-desc-am').value.trim();
    const price = parseFloat(document.getElementById('prod-price').value) || 0;
    const category = document.getElementById('prod-category').value;
    const model = document.getElementById('prod-model').value.trim();
    const image_url = document.getElementById('prod-image-url').value.trim() || 'assets/images/u.jpg';
    const sort_order = parseInt(document.getElementById('prod-sort').value, 10) || 0;
    const is_active = document.getElementById('prod-active').checked;

    if (!name_en) {
      showToast('Product English name is required.', 'warning');
      return;
    }

    try {
      await saveProduct({
        id: id || undefined,
        name_en,
        name_am,
        description_en,
        description_am,
        price,
        category,
        model,
        image_url,
        sort_order,
        is_active
      });

      showToast('Product saved successfully!', 'success');
      document.getElementById('product-form-modal')?.classList.remove('active');
      await refreshDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to save product', 'error');
    }
  });

  // Add Slide Button
  document.getElementById('btn-add-slide')?.addEventListener('click', () => openSlideModal());
  document.getElementById('slide-modal-close')?.addEventListener('click', () => {
    document.getElementById('slide-form-modal')?.classList.remove('active');
  });

  // Slide Image Upload
  document.getElementById('slide-file-input')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        showToast('Uploading slide image...', 'info', 2000);
        const url = await uploadPublicAsset('slide-images', file, 'slides');
        document.getElementById('slide-image-url').value = url;
        document.getElementById('slide-img-preview').src = url;
        showToast('Slide image uploaded!', 'success');
      } catch (err) {
        showToast('Upload error: ' + err.message, 'error');
      }
    }
  });

  // Slide Form Submit
  document.getElementById('admin-slide-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('slide-id').value;
    const title_en = document.getElementById('slide-title-en').value.trim();
    const title_am = document.getElementById('slide-title-am').value.trim();
    const description_en = document.getElementById('slide-desc-en').value.trim();
    const description_am = document.getElementById('slide-desc-am').value.trim();
    const image_url = document.getElementById('slide-image-url').value.trim() || 'assets/images/u.jpg';
    const sort_order = parseInt(document.getElementById('slide-sort').value, 10) || 0;
    const is_active = document.getElementById('slide-active').checked;

    if (!title_en) {
      showToast('Slide English title is required.', 'warning');
      return;
    }

    try {
      await saveSlide({
        id: id || undefined,
        title_en,
        title_am,
        description_en,
        description_am,
        image_url,
        sort_order,
        is_active
      });

      showToast('Hero slide saved successfully!', 'success');
      document.getElementById('slide-form-modal')?.classList.remove('active');
      await refreshDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to save slide', 'error');
    }
  });

  // Add Application Button
  document.getElementById('btn-add-app')?.addEventListener('click', () => openAppModal());
  document.getElementById('app-modal-close')?.addEventListener('click', () => {
    document.getElementById('app-form-modal')?.classList.remove('active');
  });

  // Application Form Submit
  document.getElementById('admin-app-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('app-id').value;
    const name_en = document.getElementById('app-name-en').value.trim();
    const name_am = document.getElementById('app-name-am').value.trim();
    const description_en = document.getElementById('app-desc-en').value.trim();
    const description_am = document.getElementById('app-desc-am').value.trim();
    const video_url = document.getElementById('app-video-url').value.trim();
    const thumbnail_url = document.getElementById('app-thumb-url').value.trim() || 'assets/images/o.jpg';
    const sort_order = parseInt(document.getElementById('app-sort').value, 10) || 0;
    const is_active = document.getElementById('app-active').checked;

    if (!name_en) {
      showToast('Application name is required.', 'warning');
      return;
    }

    try {
      await saveApplication({
        id: id || undefined,
        name_en,
        name_am,
        description_en,
        description_am,
        video_url,
        thumbnail_url,
        sort_order,
        is_active
      });

      showToast('Application saved!', 'success');
      document.getElementById('app-form-modal')?.classList.remove('active');
      await refreshDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to save application', 'error');
    }
  });

  // Website Settings Form Submit
  document.getElementById('admin-settings-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      showToast('Saving website settings...', 'info', 1500);
      await Promise.all([
        updateSiteSetting('business_name', document.getElementById('set-business-name').value.trim()),
        updateSiteSetting('phone_number', document.getElementById('set-phone').value.trim()),
        updateSiteSetting('email', document.getElementById('set-email').value.trim()),
        updateSiteSetting('address', document.getElementById('set-address').value.trim()),
        updateSiteSetting('payment_account', document.getElementById('set-bank-account').value.trim()),
        updateSiteSetting('bank_name', document.getElementById('set-bank-name').value.trim()),
        updateSiteSetting('account_holder', document.getElementById('set-account-holder').value.trim()),
        updateSiteSetting('hero_heading', document.getElementById('set-hero-heading').value.trim()),
        updateSiteSetting('hero_description', document.getElementById('set-hero-desc').value.trim()),
        updateSiteSetting('google_maps_url', document.getElementById('set-maps-url').value.trim())
      ]);
      showToast('Website settings updated successfully!', 'success');
      await refreshDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to update settings', 'error');
    }
  });

  // Social Media Form Submit
  document.getElementById('admin-social-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      showToast('Updating social links...', 'info', 1500);
      await Promise.all([
        updateSiteSetting('facebook_url', document.getElementById('social-fb').value.trim()),
        updateSiteSetting('twitter_url', document.getElementById('social-tw').value.trim()),
        updateSiteSetting('linkedin_url', document.getElementById('social-in').value.trim()),
        updateSiteSetting('instagram_url', document.getElementById('social-ig').value.trim()),
        updateSiteSetting('tiktok_url', document.getElementById('social-tt').value.trim())
      ]);
      showToast('Social links saved successfully!', 'success');
      await refreshDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to save social links', 'error');
    }
  });

  // Admin Account Email Change
  document.getElementById('admin-email-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newEmail = document.getElementById('account-new-email').value.trim();
    if (!newEmail) return;

    confirmAction(`Are you sure you want to change your administrator email to "${newEmail}"?`, async () => {
      try {
        await updateAdminEmail(newEmail);
        showToast('Confirmation email sent to new address. Please check your inbox.', 'success', 8000);
      } catch (err) {
        showToast(err.message || 'Failed to update email', 'error');
      }
    }, 'Update Admin Email');
  });

  // Admin Account Password Change
  document.getElementById('admin-password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPass = document.getElementById('account-new-pass').value;
    const confirmPass = document.getElementById('account-confirm-pass').value;

    if (!newPass || newPass.length < 6) {
      showToast('Password must be at least 6 characters long.', 'warning');
      return;
    }

    if (newPass !== confirmPass) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    confirmAction('Are you sure you want to update your administrator password?', async () => {
      try {
        await updateAdminPassword(newPass);
        showToast('Admin password updated successfully!', 'success');
        document.getElementById('admin-password-form')?.reset();
      } catch (err) {
        showToast(err.message || 'Failed to update password', 'error');
      }
    }, 'Update Password');
  });
}
