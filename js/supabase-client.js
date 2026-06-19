// ============================================================================
// supabase-client.js — Thin wrapper around the Supabase JS client, same
// pattern as HokuSpot's own js/supabase-client.js (and the SAME Supabase
// project — see js/config.js). Centralizes every database/auth call so
// the rest of this codebase never touches the Supabase SDK directly.
// ============================================================================

const supabaseClient = window.supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY
);

const Api = {
  // -------------------------------------------------------------------
  // Auth — identical to HokuSpot's, because it IS HokuSpot's. Signing in
  // here authenticates against the exact same Supabase Auth users.
  // -------------------------------------------------------------------
  async signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data } = await supabaseClient.auth.getSession();
    return data.session;
  },

  onAuthChange(callback) {
    supabaseClient.auth.onAuthStateChange(() => callback());
  },

  async getMyProfile() {
    const session = await this.getSession();
    if (!session) return null;
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (error) return null;
    return data;
  },

  // -------------------------------------------------------------------
  // Featured place — reads HokuSpot's public featured_places view
  // directly. No new backend work: that view was already designed for
  // exactly this kind of cross-site consumption. Picks one at random
  // client-side from whatever rows come back.
  // -------------------------------------------------------------------
  async getRandomFeaturedPlace() {
    const { data, error } = await supabaseClient
      .from('featured_places')
      .select('*');
    if (error) throw error;
    if (!data || data.length === 0) return null;
    return data[Math.floor(Math.random() * data.length)];
  },

  // -------------------------------------------------------------------
  // Event categories (lookup table — rarely changes, fetched once)
  // -------------------------------------------------------------------
  async getEventCategories() {
    const { data, error } = await supabaseClient
      .from('jet_event_categories')
      .select('*');
    if (error) throw error;
    return data;
  },

  // -------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------
  async getUpcomingEvents(limit = 6) {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabaseClient
      .from('jet_events')
      .select('*')
      .gte('start_date', today)
      .order('start_date', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  async getAllEvents() {
    const { data, error } = await supabaseClient
      .from('jet_events')
      .select('*')
      .order('start_date', { ascending: true });
    if (error) throw error;
    return data;
  },

  async createEvent(event) {
    const session = await this.getSession();
    if (!session) throw new Error('You must be signed in.');
    const { error } = await supabaseClient.from('jet_events').insert({
      title: event.title,
      description: event.description || null,
      category_id: event.categoryId,
      start_date: event.startDate,
      end_date: event.endDate || null,
      location: event.location || null,
      url: event.url || null,
      created_by: session.user.id,
    });
    if (error) throw error;
  },

  async updateEvent(id, event) {
    const { error } = await supabaseClient.from('jet_events').update({
      title: event.title,
      description: event.description || null,
      category_id: event.categoryId,
      start_date: event.startDate,
      end_date: event.endDate || null,
      location: event.location || null,
      url: event.url || null,
    }).eq('id', id);
    if (error) throw error;
  },

  async deleteEvent(id) {
    const { error } = await supabaseClient.from('jet_events').delete().eq('id', id);
    if (error) throw error;
  },

  // -------------------------------------------------------------------
  // Posts
  // -------------------------------------------------------------------
  async getLatestPublishedPost() {
    const { data, error } = await supabaseClient
      .from('jet_posts')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  },

  async getAllPosts() {
    // Moderators see drafts too, per RLS — no client-side filtering needed.
    const { data, error } = await supabaseClient
      .from('jet_posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createPost(post) {
    const session = await this.getSession();
    if (!session) throw new Error('You must be signed in.');
    const { error } = await supabaseClient.from('jet_posts').insert({
      title: post.title,
      body: post.body,
      cover_image_url: post.coverImageUrl || null,
      published: !!post.published,
      created_by: session.user.id,
    });
    if (error) throw error;
  },

  async updatePost(id, post) {
    const { error } = await supabaseClient.from('jet_posts').update({
      title: post.title,
      body: post.body,
      cover_image_url: post.coverImageUrl || null,
      published: !!post.published,
    }).eq('id', id);
    if (error) throw error;
  },

  async deletePost(id) {
    const { error } = await supabaseClient.from('jet_posts').delete().eq('id', id);
    if (error) throw error;
  },

  // -------------------------------------------------------------------
  // Resources
  // -------------------------------------------------------------------
  async getResourceCategories() {
    const { data, error } = await supabaseClient
      .from('jet_resource_categories')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return data;
  },

  async getAllResources() {
    const { data, error } = await supabaseClient
      .from('jet_resources')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return data;
  },

  async createResource(resource) {
    const session = await this.getSession();
    if (!session) throw new Error('You must be signed in.');
    const { error } = await supabaseClient.from('jet_resources').insert({
      title: resource.title,
      description: resource.description || null,
      url: resource.url,
      category_id: resource.categoryId,
      sort_order: resource.sortOrder || 0,
      created_by: session.user.id,
    });
    if (error) throw error;
  },

  async updateResource(id, resource) {
    const { error } = await supabaseClient.from('jet_resources').update({
      title: resource.title,
      description: resource.description || null,
      url: resource.url,
      category_id: resource.categoryId,
      sort_order: resource.sortOrder || 0,
    }).eq('id', id);
    if (error) throw error;
  },

  async deleteResource(id) {
    const { error } = await supabaseClient.from('jet_resources').delete().eq('id', id);
    if (error) throw error;
  },

  // -------------------------------------------------------------------
  // People
  // -------------------------------------------------------------------
  async getAllPeople() {
    const { data, error } = await supabaseClient
      .from('jet_people')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return data;
  },

  async createPerson(person) {
    const session = await this.getSession();
    if (!session) throw new Error('You must be signed in.');
    const { error } = await supabaseClient.from('jet_people').insert({
      name: person.name,
      role_title: person.roleTitle || null,
      region: person.region || null,
      email: person.email || null,
      photo_url: person.photoUrl || null,
      sort_order: person.sortOrder || 0,
      created_by: session.user.id,
    });
    if (error) throw error;
  },

  async updatePerson(id, person) {
    const { error } = await supabaseClient.from('jet_people').update({
      name: person.name,
      role_title: person.roleTitle || null,
      region: person.region || null,
      email: person.email || null,
      photo_url: person.photoUrl || null,
      sort_order: person.sortOrder || 0,
    }).eq('id', id);
    if (error) throw error;
  },

  async deletePerson(id) {
    const { error } = await supabaseClient.from('jet_people').delete().eq('id', id);
    if (error) throw error;
  },

  // -------------------------------------------------------------------
  // Guides
  // -------------------------------------------------------------------
  async getAllGuides() {
    const { data, error } = await supabaseClient
      .from('jet_guides')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return data;
  },

  async createGuide(guide) {
    const session = await this.getSession();
    if (!session) throw new Error('You must be signed in.');
    const { error } = await supabaseClient.from('jet_guides').insert({
      title: guide.title,
      summary: guide.summary || null,
      body: guide.body,
      body_html: guide.bodyHtml,
      sort_order: guide.sortOrder || 0,
      created_by: session.user.id,
    });
    if (error) throw error;
  },

  async updateGuide(id, guide) {
    const { error } = await supabaseClient.from('jet_guides').update({
      title: guide.title,
      summary: guide.summary || null,
      body: guide.body,
      body_html: guide.bodyHtml,
      sort_order: guide.sortOrder || 0,
    }).eq('id', id);
    if (error) throw error;
  },

  async deleteGuide(id) {
    const { error } = await supabaseClient.from('jet_guides').delete().eq('id', id);
    if (error) throw error;
  },
};
