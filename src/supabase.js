import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Module-level current user — updated by auth listener before any store call
let _user = null;
export const getUser = () => _user;
export const setUser = (user) => { _user = user; };

// Module-level access token, kept fresh on every auth event including
// TOKEN_REFRESHED — unlike the React authUser state, this must always be the
// latest value since it's used for raw fetch() calls outside supabase-js.
let _accessToken = null;
export const getAccessToken = () => _accessToken;
export const setAccessToken = (token) => { _accessToken = token; };
