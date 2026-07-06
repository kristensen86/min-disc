import { supabase, getUser } from "./supabase";

const BUCKET = "disc-photos";

export async function uploadPhoto(uid, dataUrl) {
  const user = getUser();
  if (!supabase || !user) return null;

  const blob = await (await fetch(dataUrl)).blob();
  const path = `${user.id}/${uid}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: true,
    contentType: "image/jpeg",
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function deletePhoto(uid) {
  const user = getUser();
  if (!supabase || !user) return null;
  try {
    await supabase.storage.from(BUCKET).remove([`${user.id}/${uid}.jpg`]);
  } catch { /* ignore */ }
  return null;
}
