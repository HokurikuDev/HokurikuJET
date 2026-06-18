// ============================================================================
// admin.js — Sign-in state and the admin pill shown in the header.
//
// There is no public account system on this site at all — the ONLY
// purpose of signing in here is to get admin edit access, using the
// SAME accounts as HokuSpot. Anyone who isn't already a moderator/admin
// in HokuSpot's public.profiles has no reason to sign in here, since
// there's nothing for a regular signed-in user to do that an anonymous
// visitor can't already do (read everything).
// ============================================================================

const Admin = (() => {
  let currentProfile = null;

  function isAdmin() {
    return !!currentProfile && currentProfile.role !== 'user';
  }

  async function refresh() {
    const session = await Api.getSession();
    currentProfile = session ? await Api.getMyProfile() : null;
    renderPill();
    document.dispatchEvent(new CustomEvent('admin-state-changed', { detail: { isAdmin: isAdmin() } }));
  }

  function renderPill() {
    const area = $('#admin-area');
    if (!area) return;

    if (isAdmin()) {
      area.innerHTML = `
        <span class="admin-pill">
          ${escapeHtml(currentProfile.display_name)}
          <span class="admin-pill__badge">${escapeHtml(currentProfile.role)}</span>
        </span>
        <button id="btn-admin-sign-out" class="btn btn--ghost btn--small">Sign out</button>
      `;
      $('#btn-admin-sign-out').addEventListener('click', async () => {
        await Api.signOut();
        await refresh();
      });
    } else if (currentProfile) {
      // Signed in, but not a moderator/admin — there's nothing for this
      // person to do on this site as a signed-in user, so just offer to
      // sign out rather than show an edit affordance that would fail.
      area.innerHTML = `<button id="btn-admin-sign-out" class="btn btn--ghost btn--small">Sign out</button>`;
      $('#btn-admin-sign-out').addEventListener('click', async () => {
        await Api.signOut();
        await refresh();
      });
    } else {
      area.innerHTML = `<button id="btn-admin-sign-in" class="btn btn--ghost btn--small">Admin sign in</button>`;
      $('#btn-admin-sign-in').addEventListener('click', openSignInModal);
    }
  }

  function openSignInModal() {
    openModal(`
      <form id="form-admin-signin" class="stack">
        <label>Email <input type="email" name="email" required /></label>
        <label>Password <input type="password" name="password" required /></label>
        <p class="form-error" id="signin-error" hidden></p>
        <button type="submit" class="btn btn--accent btn--block">Sign in</button>
      </form>
      <p class="form-hint">Use the same account you use to moderate HokuSpot.</p>
    `, 'Admin sign in');

    $('#form-admin-signin').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const errEl = $('#signin-error');
      errEl.hidden = true;
      try {
        await Api.signIn(fd.get('email'), fd.get('password'));
        closeModal();
        await refresh();
        showToast('Signed in.');
      } catch (err) {
        errEl.textContent = err.message;
        errEl.hidden = false;
      }
    });
  }

  return { refresh, isAdmin };
})();

function refreshAdminOnlyVisibility() {
  $all('.admin-only').forEach((el) => { el.hidden = !Admin.isAdmin(); });
}

document.addEventListener('DOMContentLoaded', () => {
  Admin.refresh();
  Api.onAuthChange(() => Admin.refresh());
});

document.addEventListener('admin-state-changed', refreshAdminOnlyVisibility);
