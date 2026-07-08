import { supabase, getUser, getAccessToken } from "./supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Auth/permission errors fail fast — retrying a 401/403 just wastes the retry budget.
function isRetryable(error) {
  const status = error?.status ?? error?.code;
  return status !== 401 && status !== 403;
}

async function withRetry(fn, retries, backoffMs) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try { return await fn(); }
    catch (error) {
      lastErr = error;
      if (attempt === retries || !isRetryable(error)) break;
      await new Promise(r => setTimeout(r, backoffMs[attempt]));
    }
  }
  throw lastErr;
}

export const store = {
  // Returns {ok:true, value} on success (value is null for a confirmed-empty row),
  // or {ok:false, error} on failure — callers must never treat ok:false as "empty".
  async get(key) {
    if (typeof window !== "undefined" && window.storage) {
      try { const res = await window.storage.get(key); return { ok: true, value: res?.value ?? null }; }
      catch (error) { return { ok: false, error }; }
    }
    const user = getUser();
    if (supabase && user) {
      try {
        const value = await withRetry(async () => {
          const { data, error } = await supabase.from("user_data").select("value")
            .eq("user_id", user.id).eq("key", key).maybeSingle();
          if (error) throw error;
          return data ? data.value : null;
        }, 2, [400, 1200]);
        return { ok: true, value };
      } catch (error) { return { ok: false, error }; }
    }
    try { const v = localStorage.getItem("md_" + key); return { ok: true, value: v ?? null }; }
    catch (error) { return { ok: false, error }; }
  },

  async set(key, value) {
    if (typeof window !== "undefined" && window.storage) {
      try { await window.storage.set(key, value); return { ok: true }; }
      catch (error) { return { ok: false, error }; }
    }
    const user = getUser();
    if (supabase && user) {
      try {
        await withRetry(async () => {
          const { error } = await supabase.from("user_data")
            .upsert({ user_id: user.id, key, value }, { onConflict: "user_id,key" });
          if (error) throw error;
        }, 1, [300]);
        return { ok: true };
      } catch (error) { return { ok: false, error }; }
    }
    try { localStorage.setItem("md_" + key, value); return { ok: true }; }
    catch (error) { return { ok: false, error }; }
  },

  // Used only on the flush path (visibilitychange/pagehide/beforeunload) where the
  // write must survive the page backgrounding/closing. Falls back to the normal
  // `set` when there's no auth token to attach or the payload is too big for
  // a keepalive request (~64KB browser limit) — same risk profile as before for
  // those rare cases, full keepalive guarantee for everything else.
  async setUrgent(key, value) {
    if (typeof window !== "undefined" && window.storage) {
      try { await window.storage.set(key, value); return { ok: true }; }
      catch (error) { return { ok: false, error }; }
    }
    const user = getUser();
    if (!supabase || !user) {
      try { localStorage.setItem("md_" + key, value); return { ok: true }; }
      catch (error) { return { ok: false, error }; }
    }
    const token = getAccessToken();
    const bytes = new Blob([value]).size;
    if (!token || bytes > 60000) return store.set(key, value);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
        method: "POST",
        keepalive: true,
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify([{ user_id: user.id, key, value }]),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return { ok: true };
    } catch (error) { return { ok: false, error }; }
  },
};
