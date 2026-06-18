// ============================================================================
// config.js — Single source of truth for app-wide configuration.
//
// IMPORTANT: This is the SAME Supabase project as HokuSpot, on purpose —
// see docs/ARCHITECTURE.md. Anyone who is already 'moderator' or 'admin'
// in HokuSpot's public.profiles table is automatically an admin here too.
// There is no separate auth system for this site.
//
// The URL and ANON key below are MEANT to be public — see HokuSpot's own
// js/config.js for the full explanation of why this is safe (Row-Level
// Security, not key secrecy, is what actually enforces access control).
// Never put a Supabase SERVICE ROLE key here.
// ============================================================================

const CONFIG = {
  SUPABASE_URL: 'https://jmlypmsxrdhooxhpdfsg.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_oA_VkjQ3m4ozwZKEL6aExQ_SI6xovcU',

  // No MapTiler key or map bounds here — this site has no map. The
  // featured-place card below links out to HokuSpot for the full map
  // view rather than embedding one.

  // Public HokuSpot URL the featured-place card links out to (the
  // "see it on the map" link). Update this once HokuSpot's real GitHub
  // Pages URL is known — a placeholder for now.
  HOKUSPOT_URL: 'https://hokurikudev.github.io/HokuSpot/',
};

Object.freeze(CONFIG);
