// ============================================================================
// app.js — Homepage logic: rotating featured place, upcoming events list,
// latest post preview. Only runs the pieces relevant to whatever's
// actually on the current page (each function checks its target element
// exists before doing anything), so this file can be safely included on
// every page without erroring on pages that don't have a homepage.
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  loadFeaturedPlace();
  loadUpcomingEvents();
  loadLatestPost();
  $('#btn-add-post')?.addEventListener('click', () => openPostForm());
});

// A signed-in moderator sees drafts (see loadLatestPost above), so the
// admin state changing — signing in or out — has to re-fetch, not just
// re-render, unlike the simpler admin-only-visibility toggle used on
// the other content pages.
document.addEventListener('admin-state-changed', loadLatestPost);

async function loadFeaturedPlace() {
  const root = $('#featured-place-card');
  if (!root) return;

  root.innerHTML = `<div class="featured-place-card featured-place-card--loading">Loading a featured place&hellip;</div>`;

  try {
    const place = await Api.getRandomFeaturedPlace();
    renderFeaturedPlace(place);
  } catch (err) {
    root.innerHTML = `<div class="featured-place-card featured-place-card--empty">Couldn't load a featured place right now.</div>`;
  }
}

function renderFeaturedPlace(place) {
  const root = $('#featured-place-card');
  if (!place) {
    root.innerHTML = `<div class="featured-place-card featured-place-card--empty">No featured places yet — check back soon!</div>`;
    return;
  }

  const photoUrl = resolvePhotoUrl(place.primary_photo_path);

  root.innerHTML = `
    <div class="featured-place-card">
      ${photoUrl
        ? `<img class="featured-place-card__image" src="${escapeHtml(photoUrl)}" alt="${escapeHtml(place.name)}" />`
        : `<div class="featured-place-card__image featured-place-card__image--empty">No photo yet</div>`}
      <div class="featured-place-card__body">
        <p class="featured-place-card__eyebrow">
          &#9733; Featured on HokuSpot
        </p>
        <h3>${escapeHtml(place.name)}</h3>
        <p>${escapeHtml(place.description || place.highlights || 'A community-submitted spot worth checking out.')}</p>
        <div class="featured-place-card__footer">
          <span class="featured-place-card__category">${escapeHtml(place.category_label || '')}</span>
          <button class="featured-place-card__refresh" id="btn-refresh-featured">Show another &#8635;</button>
        </div>
      </div>
    </div>
  `;

  $('#btn-refresh-featured')?.addEventListener('click', loadFeaturedPlace);
}

// featured_places.primary_photo_path is EITHER a full external URL
// (pasted by the submitter) OR a bare Supabase Storage path (when the
// photo was uploaded directly) — the view itself can't tell these apart
// in its column type, so resolve it here. The place-photos bucket is
// public (see HokuSpot's sql/03_storage.sql), so Supabase Storage's
// public-object URL format can be constructed directly without needing
// the full Supabase JS client's storage helper — same result as calling
// supabaseClient.storage.from('place-photos').getPublicUrl(path) would
// give, just inlined since this site only needs this one read-only case.
function resolvePhotoUrl(path) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${CONFIG.SUPABASE_URL}/storage/v1/object/public/place-photos/${path}`;
}

async function loadUpcomingEvents() {
  const root = $('#upcoming-events-list');
  if (!root) return;

  try {
    const [events, categories] = await Promise.all([
      Api.getUpcomingEvents(6),
      Api.getEventCategories(),
    ]);
    const catMap = new Map(categories.map((c) => [c.id, c]));
    renderEventsList(root, events, catMap);
  } catch (err) {
    root.innerHTML = `<li class="empty-state">Couldn't load events right now.</li>`;
  }
}

function renderEventsList(root, events, catMap) {
  if (!events || events.length === 0) {
    root.innerHTML = `<li class="empty-state">No upcoming events posted yet.</li>`;
    return;
  }

  root.innerHTML = events.map((ev) => {
    const cat = catMap.get(ev.category_id) || { label: '', color: '#999' };
    const { day, month } = formatEventDate(ev.start_date);
    return `
      <li class="event-row">
        <span class="event-row__dot" style="background:${escapeHtml(cat.color)}"></span>
        <span class="event-row__date">
          <span class="event-row__date-day">${day}</span>
          <span class="event-row__date-month">${month}</span>
        </span>
        <span class="event-row__info">
          <p class="event-row__title">${escapeHtml(ev.title)}</p>
          <p class="event-row__meta">
            <span class="event-row__category-label" style="color:${escapeHtml(cat.color)}">${escapeHtml(cat.label)}</span>
            ${ev.location ? ` &middot; ${escapeHtml(ev.location)}` : ''}
          </p>
        </span>
      </li>
    `;
  }).join('');
}

let currentLatestPost = null;

async function loadLatestPost() {
  const root = $('#latest-post-preview');
  if (!root) return;

  try {
    // A signed-in moderator/admin should see the latest post regardless
    // of published state (so a draft-in-progress shows up for them to
    // keep editing), since RLS already grants them that visibility via
    // getAllPosts(). Everyone else only ever sees the latest PUBLISHED
    // post, via getLatestPublishedPost().
    if (typeof Admin !== 'undefined' && Admin.isAdmin()) {
      const posts = await Api.getAllPosts();
      currentLatestPost = posts && posts.length > 0 ? posts[0] : null;
    } else {
      currentLatestPost = await Api.getLatestPublishedPost();
    }
    renderLatestPost(root, currentLatestPost);
  } catch (err) {
    root.innerHTML = `<p class="empty-state">Couldn't load the latest update right now.</p>`;
  }
}

function renderLatestPost(root, post) {
  if (!post) {
    root.innerHTML = `<p class="empty-state">No updates posted yet.</p>`;
    return;
  }

  root.innerHTML = `
    <div class="post-preview">
      ${post.cover_image_url ? `<img class="post-preview__image" src="${escapeHtml(post.cover_image_url)}" alt="" />` : ''}
      ${!post.published ? `<span class="draft-badge">Draft — not visible to visitors yet</span>` : ''}
      <h3>${escapeHtml(post.title)}</h3>
      <p class="post-preview__meta">${formatPostDate(post.created_at)}</p>
      <p class="post-preview__body">${escapeHtml(truncate(post.body, 280))}</p>
      <div class="admin-only" hidden>
        <button class="btn btn--ghost-on-light btn--small" id="btn-edit-post">Edit this update</button>
      </div>
    </div>
  `;

  refreshAdminOnlyVisibility();
  $('#btn-edit-post')?.addEventListener('click', () => openPostForm(post));
}

function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str || '';
  return str.slice(0, maxLen).trim() + '…';
}

function openPostForm(post = null) {
  const isEdit = !!post;
  openModal(`
    <form id="form-post" class="stack">
      <label>Title <input type="text" name="title" required value="${escapeHtml(post?.title || '')}" /></label>
      <label>Body <textarea name="body" rows="8" required>${escapeHtml(post?.body || '')}</textarea></label>
      <label>Cover image URL (optional) <input type="url" name="coverImageUrl" value="${escapeHtml(post?.cover_image_url || '')}" /></label>
      <label class="checkbox-row">
        <input type="checkbox" name="published" ${post?.published ? 'checked' : ''} />
        Published (visible to visitors — leave unchecked to save as a draft)
      </label>
      <p class="form-error" id="post-form-error" hidden></p>
      <button type="submit" class="btn btn--accent btn--block">${isEdit ? 'Save changes' : 'Add update'}</button>
    </form>
  `, isEdit ? 'Edit update' : 'Add update');

  $('#form-post').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const errEl = $('#post-form-error');
    errEl.hidden = true;
    const payload = {
      title: fd.get('title'),
      body: fd.get('body'),
      coverImageUrl: fd.get('coverImageUrl') || null,
      published: fd.get('published') === 'on',
    };
    try {
      if (isEdit) {
        await Api.updatePost(post.id, payload);
        showToast('Saved.');
      } else {
        await Api.createPost(payload);
        showToast('Added.');
      }
      closeModal();
      await loadLatestPost();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    }
  });
}
