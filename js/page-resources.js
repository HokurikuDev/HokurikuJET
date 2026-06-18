// ============================================================================
// page-resources.js — Resources grouped by category, with admin CRUD.
// ============================================================================

let allResources = [];
let resourceCategories = [];

document.addEventListener('DOMContentLoaded', loadResources);
document.addEventListener('admin-state-changed', renderResourceCategories);

async function loadResources() {
  const root = $('#resource-categories');
  try {
    [allResources, resourceCategories] = await Promise.all([
      Api.getAllResources(),
      Api.getResourceCategories(),
    ]);
    renderResourceCategories();
  } catch (err) {
    root.innerHTML = `<p class="empty-state">Couldn't load resources right now.</p>`;
  }
  $('#btn-add-resource')?.addEventListener('click', () => openResourceForm());
}

function renderResourceCategories() {
  const root = $('#resource-categories');
  if (!root) return;

  if (resourceCategories.length === 0) {
    root.innerHTML = `<p class="empty-state">No resource categories set up yet.</p>`;
    return;
  }

  root.innerHTML = resourceCategories.map((cat) => {
    const items = allResources.filter((r) => r.category_id === cat.id);
    return `
      <div class="resource-category">
        <h2>${escapeHtml(cat.label)}</h2>
        ${items.length === 0
          ? `<p class="empty-state">Nothing here yet.</p>`
          : `<ul class="resource-list">${items.map((r) => `
              <li class="resource-row" data-id="${r.id}">
                <span class="resource-row__info">
                  <a class="resource-row__title" href="${escapeHtml(r.url)}" target="_blank" rel="noopener">${escapeHtml(r.title)}</a>
                  ${r.description ? `<p class="resource-row__desc">${escapeHtml(r.description)}</p>` : ''}
                </span>
                <span class="admin-row-actions admin-only" hidden>
                  <button class="btn btn--ghost-on-light btn--small" data-action="edit">Edit</button>
                  <button class="btn btn--danger btn--small" data-action="delete">Delete</button>
                </span>
              </li>
            `).join('')}</ul>`}
      </div>
    `;
  }).join('');

  refreshAdminOnlyVisibility();

  root.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.closest('.resource-row').dataset.id;
      openResourceForm(allResources.find((r) => r.id === id));
    });
  });
  root.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('.resource-row').dataset.id;
      const resource = allResources.find((r) => r.id === id);
      if (!confirm(`Delete "${resource.title}"?`)) return;
      try {
        await Api.deleteResource(id);
        allResources = allResources.filter((r) => r.id !== id);
        renderResourceCategories();
        showToast('Deleted.');
      } catch (err) {
        showToast(`Error: ${err.message}`, true);
      }
    });
  });
}

function openResourceForm(resource = null) {
  const isEdit = !!resource;
  openModal(`
    <form id="form-resource" class="stack">
      <label>Title <input type="text" name="title" required value="${escapeHtml(resource?.title || '')}" /></label>
      <label>URL <input type="url" name="url" required value="${escapeHtml(resource?.url || '')}" /></label>
      <label>Description <textarea name="description" rows="2">${escapeHtml(resource?.description || '')}</textarea></label>
      <label>Category
        <select name="categoryId" required>
          ${resourceCategories.map((c) => `<option value="${c.id}" ${resource?.category_id === c.id ? 'selected' : ''}>${escapeHtml(c.label)}</option>`).join('')}
        </select>
      </label>
      <label>Sort order <input type="number" name="sortOrder" value="${resource?.sort_order ?? 0}" /></label>
      <p class="form-error" id="resource-form-error" hidden></p>
      <button type="submit" class="btn btn--accent btn--block">${isEdit ? 'Save changes' : 'Add resource'}</button>
    </form>
  `, isEdit ? 'Edit resource' : 'Add resource');

  $('#form-resource').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const errEl = $('#resource-form-error');
    errEl.hidden = true;
    const payload = {
      title: fd.get('title'),
      url: fd.get('url'),
      description: fd.get('description') || null,
      categoryId: fd.get('categoryId'),
      sortOrder: parseInt(fd.get('sortOrder'), 10) || 0,
    };
    try {
      if (isEdit) {
        await Api.updateResource(resource.id, payload);
        showToast('Saved.');
      } else {
        await Api.createResource(payload);
        showToast('Added.');
      }
      closeModal();
      await loadResources();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    }
  });
}
