// ============================================================================
// page-people.js — People directory: public grid + admin add/edit/delete.
// ============================================================================

let allPeople = [];

document.addEventListener('DOMContentLoaded', loadPeople);
document.addEventListener('admin-state-changed', () => {
  renderPeopleGrid(); // re-render to add/remove the per-card edit controls
});

async function loadPeople() {
  const root = $('#people-grid');
  try {
    allPeople = await Api.getAllPeople();
    renderPeopleGrid();
  } catch (err) {
    root.innerHTML = `<p class="empty-state">Couldn't load the people directory right now.</p>`;
  }
  $('#btn-add-person')?.addEventListener('click', () => openPersonForm());
}

function renderPeopleGrid() {
  const root = $('#people-grid');
  if (!root) return;

  if (allPeople.length === 0) {
    root.innerHTML = `<p class="empty-state">No one's been added to the directory yet.</p>`;
    return;
  }

  root.innerHTML = allPeople.map((person) => {
    const initials = person.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    return `
      <div class="person-card" data-id="${person.id}">
        ${person.photo_url
          ? `<img class="person-card__photo" src="${escapeHtml(person.photo_url)}" alt="${escapeHtml(person.name)}" />`
          : `<div class="person-card__photo person-card__photo--placeholder">${escapeHtml(initials)}</div>`}
        <h3>${escapeHtml(person.name)}</h3>
        ${person.role_title ? `<p class="person-card__role">${escapeHtml(person.role_title)}</p>` : ''}
        ${person.region ? `<p class="person-card__region">${escapeHtml(person.region)}</p>` : ''}
        ${person.email ? `<p class="person-card__email"><a href="mailto:${escapeHtml(person.email)}">${escapeHtml(person.email)}</a></p>` : ''}
        <div class="admin-row-actions admin-only" hidden style="justify-content:center; margin-top:var(--space-3);">
          <button class="btn btn--ghost-on-light btn--small" data-action="edit">Edit</button>
          <button class="btn btn--danger btn--small" data-action="delete">Delete</button>
        </div>
      </div>
    `;
  }).join('');

  refreshAdminOnlyVisibility();

  root.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.closest('.person-card').dataset.id;
      openPersonForm(allPeople.find((p) => p.id === id));
    });
  });
  root.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('.person-card').dataset.id;
      const person = allPeople.find((p) => p.id === id);
      if (!confirm(`Remove ${person.name} from the directory?`)) return;
      try {
        await Api.deletePerson(id);
        allPeople = allPeople.filter((p) => p.id !== id);
        renderPeopleGrid();
        showToast('Removed.');
      } catch (err) {
        showToast(`Error: ${err.message}`, true);
      }
    });
  });
}

function openPersonForm(person = null) {
  const isEdit = !!person;
  openModal(`
    <form id="form-person" class="stack">
      <label>Name <input type="text" name="name" required value="${escapeHtml(person?.name || '')}" /></label>
      <label>Role / title <input type="text" name="roleTitle" placeholder="e.g. Prefectural Advisor" value="${escapeHtml(person?.role_title || '')}" /></label>
      <label>Region <input type="text" name="region" placeholder="e.g. North Ishikawa" value="${escapeHtml(person?.region || '')}" /></label>
      <label>Email <input type="email" name="email" value="${escapeHtml(person?.email || '')}" /></label>
      <label>Photo URL <input type="url" name="photoUrl" value="${escapeHtml(person?.photo_url || '')}" /></label>
      <label>Sort order <input type="number" name="sortOrder" value="${person?.sort_order ?? 0}" /></label>
      <p class="form-error" id="person-form-error" hidden></p>
      <button type="submit" class="btn btn--accent btn--block">${isEdit ? 'Save changes' : 'Add person'}</button>
    </form>
  `, isEdit ? 'Edit person' : 'Add person');

  $('#form-person').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const errEl = $('#person-form-error');
    errEl.hidden = true;
    const payload = {
      name: fd.get('name'),
      roleTitle: fd.get('roleTitle') || null,
      region: fd.get('region') || null,
      email: fd.get('email') || null,
      photoUrl: fd.get('photoUrl') || null,
      sortOrder: parseInt(fd.get('sortOrder'), 10) || 0,
    };
    try {
      if (isEdit) {
        await Api.updatePerson(person.id, payload);
        showToast('Saved.');
      } else {
        await Api.createPerson(payload);
        showToast('Added.');
      }
      closeModal();
      await loadPeople();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    }
  });
}
