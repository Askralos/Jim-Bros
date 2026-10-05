import { supabase } from "../supabaseClient";
import { compressImageToBlob, uid } from "../utils";

// Compresse puis upload une photo dans le bucket "photos" (créé par le schéma SQL).
// Retourne l'URL publique à stocker dans la ligne concernée (session, entrée, avatar...).
export async function uploadPhoto(file, folder = "misc", { maxW = 480, quality = 0.6 } = {}) {
  const blob = await compressImageToBlob(file, maxW, quality);
  const path = `${folder}/${uid()}.jpg`;
  const { error } = await supabase.storage.from("photos").upload(path, blob, {
    // Chaque photo a un nom unique et n'est jamais réécrite : le navigateur peut la
    // garder en cache un an au lieu de la retélécharger toutes les heures.
    cacheControl: "31536000",
    upsert: false,
    contentType: "image/jpeg",
  });
  if (error) throw error;
  const { data } = supabase.storage.from("photos").getPublicUrl(path);
  return data.publicUrl;
}
