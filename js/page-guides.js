// ============================================================================
// page-guides.js — Evergreen guides, expandable inline, with admin CRUD.
// ============================================================================

let allGuides = [];

document.addEventListener('DOMContentLoaded', loadGuides);
document.addEventListener('admin-state-changed', renderGuides);

async function loadGuides() {
  const root = $('#guides-list');
  try {
    allGuides = await Api.getAllGuides();
    renderGuides();
  } catch (err) {
    root.innerHTML = `<p class="empty-state">Couldn't load guides right now.</p>`;
  }
  $('#btn-add-guide')?.addEventListener('click', () => openGuideForm());
}

function renderGuides() {
  const root = $('#guides-list');
  if (!root) return;

  if (allGuides.length === 0) {
    root.innerHTML = `<p class="empty-state">No guides posted yet.</p>`;
    return;
  }

  root.innerHTML = allGuides.map((g) => `
    <div class="guide-card" data-id="${g.id}">
      <div class="guide-card__header" data-action="toggle">
        <div>
          <h3>${escapeHtml(g.title)}</h3>
          ${g.summary ? `<p class="guide-card__summary">${escapeHtml(g.summary)}</p>` : ''}
        </div>
        <button class="guide-card__toggle" aria-label="Expand">&#9662;</button>
      </div>
      <div class="guide-card__body" hidden>${escapeHtml(g.body)}</div>
      <div class="guide-card__actions admin-only" hidden>
        <button class="btn btn--ghost-on-light btn--small" data-action="edit">Edit</button>
        <button class="btn btn--danger btn--small" data-action="delete">Delete</button>
      </div>
    </div>
  `).join('');

  refreshAdminOnlyVisibility();

  root.querySelectorAll('[data-action="toggle"]').forEach((header) => {
    header.addEventListener('click', () => {
      const card = header.closest('.guide-card');
      const body = card.querySelector('.guide-card__body');
      const isOpen = card.classList.toggle('is-open');
      body.hidden = !isOpen;
    });
  });
  root.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.closest('.guide-card').dataset.id;
      openGuideForm(allGuides.find((g) => g.id === id));
    });
  });
  root.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.closest('.guide-card').dataset.id;
      const guide = allGuides.find((g) => g.id === id);
      if (!confirm(`Delete "${guide.title}"?`)) return;
      try {
        await Api.deleteGuide(id);
        allGuides = allGuides.filter((g) => g.id !== id);
        renderGuides();
        showToast('Deleted.');
      } catch (err) {
        showToast(`Error: ${err.message}`, true);
      }
    });
  });
}

function openGuideForm(guide = null) {
  const isEdit = !!guide;
  openModal(`
    <form id="form-guide" class="stack">
      <label>Title <input type="text" name="title" required value="${escapeHtml(guide?.title || '')}" /></label>
      <label>Summary (shown collapsed, before expanding) <input type="text" name="summary" value="${escapeHtml(guide?.summary || '')}" /></label>
      <label>Full guide text <textarea name="body" rows="8" required>${escapeHtml(guide?.body || '')}</textarea></label>
      <label>Sort order <input type="number" name="sortOrder" value="${guide?.sort_order ?? 0}" /></label>
      <p class="form-error" id="guide-form-error" hidden></p>
      <button type="submit" class="btn btn--accent btn--block">${isEdit ? 'Save changes' : 'Add guide'}</button>
    </form>
  `, isEdit ? 'Edit guide' : 'Add guide');

  $('#form-guide').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const errEl = $('#guide-form-error');
    errEl.hidden = true;
    const payload = {
      title: fd.get('title'),
      summary: fd.get('summary') || null,
      body: fd.get('body'),
      sortOrder: parseInt(fd.get('sortOrder'), 10) || 0,
    };
    try {
      if (isEdit) {
        await Api.updateGuide(guide.id, payload);
        showToast('Saved.');
      } else {
        await Api.createGuide(payload);
        showToast('Added.');
      }
      closeModal();
      await loadGuides();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    }
  });
}
