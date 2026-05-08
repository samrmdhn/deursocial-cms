import { supabase } from './supabase';

const SUPABASE_REAL_URL = 'https://jbcdjttfaxwendlfpgjk.supabase.co';

function normalizePublicUrl(url: string): string {
  // getPublicUrl returns a URL based on the proxy (e.g. http://localhost:5173/supabase-api/...)
  // Replace the proxy origin + path prefix with the real Supabase URL
  return url.replace(/^https?:\/\/[^/]+\/supabase-api/, SUPABASE_REAL_URL);
}

export async function uploadImageToBucket(
  file: File,
  bucket: string = 'images',
  folder: string = 'public'
): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading image to bucket:', error);
      throw error;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(fileName);

    return normalizePublicUrl(publicUrl);
  } catch (err) {
    console.error('Failed to upload image', err);
    return null;
  }
}
