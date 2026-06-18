// ============================================================================
// page-events.js — Full events list with category legend and admin CRUD.
// Shows ALL events (not just upcoming) so past events remain visible —
// the homepage's "Upcoming events" widget is the one that filters to
// future-only; this page is the "see all" destination linked from there.
// ============================================================================

let allEvents = [];
let eventCategories = [];

document.addEventListener('DOMContentLoaded', loadEvents);
document.addEventListener('admin-state-changed', renderAllEvents);

async function loadEvents() {
  const root = $('#all-events-list');
  try {
    [allEvents, eventCategories] = await Promise.all([
      Api.getAllEvents(),
      Api.getEventCategories(),
    ]);
    renderLegend();
    renderAllEvents();
  } catch (err) {
    root.innerHTML = `<li class="empty-state">Couldn't load events right now.</li>`;
  }
  $('#btn-add-event')?.addEventListener('click', () => openEventForm());
}

function renderLegend() {
  const root = $('#event-legend');
  if (!root) return;
  root.innerHTML = eventCategories.map((c) => `
    <span class="legend__item">
      <span class="legend__dot" style="background:${escapeHtml(c.color)}"></span>
      ${escapeHtml(c.label)}
    </span>
  `).join('');
}

function renderAllEvents() {
  const root = $('#all-events-list');
  if (!root) return;
  const catMap = new Map(eventCategories.map((c) => [c.id, c]));

  if (allEvents.length === 0) {
    root.innerHTML = `<li class="empty-state">No events posted yet.</li>`;
    return;
  }

  root.innerHTML = allEvents.map((ev) => {
    const cat = catMap.get(ev.category_id) || { label: '', color: '#999' };
    const { day, month } = formatEventDate(ev.start_date);
    return `
      <li class="event-row" data-id="${ev.id}">
        <span class="event-row__dot" style="background:${escapeHtml(cat.color)}"></span>
        <span class="event-row__date">
          <span class="event-row__date-day">${day}</span>
          <span class="event-row__date-month">${month}</span>
        </span>
        <span class="event-row__info">
          <p class="event-row__title">
            ${ev.url ? `<a href="${escapeHtml(ev.url)}" target="_blank" rel="noopener">${escapeHtml(ev.title)}</a>` : escapeHtml(ev.title)}
          </p>
          <p class="event-row__meta">
            <span class="event-row__category-label" style="color:${escapeHtml(cat.color)}">${escapeHtml(cat.label)}</span>
            ${ev.location ? ` &middot; ${escapeHtml(ev.location)}` : ''}
            ${ev.end_date ? ` &middot; through ${escapeHtml(ev.end_date)}` : ''}
          </p>
          ${ev.description ? `<p class="event-row__meta">${escapeHtml(ev.description)}</p>` : ''}
        </span>
        <span class="event-row__actions admin-only" hidden>
          <button class="btn btn--ghost-on-light btn--small" data-action="edit">Edit</button>
          <button class="btn btn--danger btn--small" data-action="delete">Delete</button>
        </span>
      </li>
    `;
  }).join('');

  refreshAdminOnlyVisibility();

  root.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.closest('.event-row').dataset.id;
      openEventForm(allEvents.find((e) => e.id === id));
    });
  });
  root.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('.event-row').dataset.id;
      const ev = allEvents.find((e) => e.id === id);
      if (!confirm(`Delete "${ev.title}"?`)) return;
      try {
        await Api.deleteEvent(id);
        allEvents = allEvents.filter((e) => e.id !== id);
        renderAllEvents();
        showToast('Deleted.');
      } catch (err) {
        showToast(`Error: ${err.message}`, true);
      }
    });
  });
}

function openEventForm(event = null) {
  const isEdit = !!event;
  openModal(`
    <form id="form-event" class="stack">
      <label>Title <input type="text" name="title" required value="${escapeHtml(event?.title || '')}" /></label>
      <label>Category
        <select name="categoryId" required>
          ${eventCategories.map((c) => `<option value="${c.id}" ${event?.category_id === c.id ? 'selected' : ''}>${escapeHtml(c.label)}</option>`).join('')}
        </select>
      </label>
      <label>Start date <input type="date" name="startDate" required value="${escapeHtml(event?.start_date || '')}" /></label>
      <label>End date (optional, for multi-day events) <input type="date" name="endDate" value="${escapeHtml(event?.end_date || '')}" /></label>
      <label>Location <input type="text" name="location" value="${escapeHtml(event?.location || '')}" /></label>
      <label>More info URL <input type="url" name="url" value="${escapeHtml(event?.url || '')}" /></label>
      <label>Description <textarea name="description" rows="2">${escapeHtml(event?.description || '')}</textarea></label>
      <p class="form-error" id="event-form-error" hidden></p>
      <button type="submit" class="btn btn--accent btn--block">${isEdit ? 'Save changes' : 'Add event'}</button>
    </form>
  `, isEdit ? 'Edit event' : 'Add event');

  $('#form-event').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const errEl = $('#event-form-error');
    errEl.hidden = true;
    const payload = {
      title: fd.get('title'),
      categoryId: fd.get('categoryId'),
      startDate: fd.get('startDate'),
      endDate: fd.get('endDate') || null,
      location: fd.get('location') || null,
      url: fd.get('url') || null,
      description: fd.get('description') || null,
    };
    try {
      if (isEdit) {
        await Api.updateEvent(event.id, payload);
        showToast('Saved.');
      } else {
        await Api.createEvent(payload);
        showToast('Added.');
      }
      closeModal();
      await loadEvents();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    }
  });
}
