// =============================================
// Kembara App — Storage Upload Helper
// Uploads compressed photos to Supabase Storage with resilience fallback
// =============================================

import type { SupabaseClient } from "@supabase/supabase-js";

export interface UploadPhotoOptions {
  supabase: SupabaseClient;
  file: File | Blob;
  placeId: string;
  tripId?: string;
  fallbackDataUrl?: string;
}

export async function uploadAgendaPhoto({
  supabase,
  file,
  placeId,
  tripId,
  fallbackDataUrl,
}: UploadPhotoOptions): Promise<string> {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileName = `${timestamp}_${randomSuffix}.jpg`;
  const filePath = `places/${placeId}/${fileName}`;

  // 1. Try primary bucket 'agenda-photos'
  try {
    const { data, error } = await supabase.storage
      .from("agenda-photos")
      .upload(filePath, file, {
        cacheControl: "31536000",
        upsert: true,
        contentType: "image/jpeg",
      });

    if (!error && data) {
      const { data: publicUrlData } = supabase.storage
        .from("agenda-photos")
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    } else if (error) {
      console.warn("Upload to 'agenda-photos' bucket failed, attempting fallback:", error.message);
    }
  } catch (err) {
    console.warn("Exception uploading to 'agenda-photos':", err);
  }

  // 2. Try secondary bucket 'trip-covers' if 'agenda-photos' is not yet created
  try {
    const secondaryPath = `agenda_photos/${placeId}/${fileName}`;
    const { data: sData, error: sError } = await supabase.storage
      .from("trip-covers")
      .upload(secondaryPath, file, {
        cacheControl: "31536000",
        upsert: true,
        contentType: "image/jpeg",
      });

    if (!sError && sData) {
      const { data: publicUrlData } = supabase.storage
        .from("trip-covers")
        .getPublicUrl(secondaryPath);

      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    }
  } catch (err) {
    console.warn("Exception uploading to 'trip-covers':", err);
  }

  // 3. Fallback: Return Base64 data URL
  if (fallbackDataUrl) {
    return fallbackDataUrl;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Gagal membaca file gambar sebagai data URL fallback."));
      }
    };
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.readAsDataURL(file);
  });
}

