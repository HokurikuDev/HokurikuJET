// ============================================================================
// ui-helpers.js — Small DOM/formatting utilities shared across every page
// of this site. Kept separate from admin.js and app.js since both of
// those depend on these, and from HokuSpot's own equivalents in spirit
// (same escapeHtml pattern) without sharing a file across the two repos.
// ============================================================================

function $(sel, root = document) {
  return root.querySelector(sel);
}
function $all(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function formatEventDate(dateStr) {
  // dateStr is a plain 'YYYY-MM-DD' date (no time component) — parse it
  // as local, not UTC, so the displayed day never shifts by one due to
  // timezone conversion.
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  return { day, month };
}

function formatPostDate(isoStr) {
  const date = new Date(isoStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function showToast(message, isError = false) {
  const root = $('#toast-root');
  if (!root) return;
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'toast--error' : ''}`;
  toast.textContent = message;
  root.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// -------------------------------------------------------------------
// Shared modal primitives — used by admin.js (sign-in) and every
// page-<name>.js admin form (add/edit person, event, resource, guide).
// Centralized here rather than duplicated per-file since every page
// only ever has one modal open at a time, sharing one #modal-root.
// -------------------------------------------------------------------
function getOrCreateModalRoot() {
  const existing = $('#modal-root');
  if (existing) return existing;
  const div = document.createElement('div');
  div.id = 'modal-root';
  document.body.appendChild(div);
  return div;
}

function openModal(innerHtml, title) {
  const root = getOrCreateModalRoot();
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <div class="modal__header">
          <h2>${escapeHtml(title)}</h2>
          <button class="modal__close" id="btn-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="modal__body">${innerHtml}</div>
      </div>
    </div>
  `;
  root.classList.add('is-open');
  $('#btn-modal-close').addEventListener('click', closeModal);
  $('.modal-backdrop').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) closeModal();
  });
  return root;
}

function closeModal() {
  const root = $('#modal-root');
  if (root) {
    root.classList.remove('is-open');
    root.innerHTML = '';
  }
}

// Mobile nav toggle — present in the header on every page, so wire it up
// from a shared file rather than duplicating this in every page's inline
// script.
document.addEventListener('DOMContentLoaded', () => {
  const toggle = $('#btn-nav-toggle');
  const nav = $('#main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('is-open'));
  }

  const hokuspotLink = $('#hokuspot-link');
  if (hokuspotLink) {
    hokuspotLink.href = CONFIG.HOKUSPOT_URL;
    hokuspotLink.target = '_blank';
    hokuspotLink.rel = 'noopener';
  }
});
