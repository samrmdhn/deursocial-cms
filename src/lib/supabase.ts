import { createClient } from '@supabase/supabase-js';

// Use the Vite proxy to avoid exposing the service role key to the browser
const proxyUrl = typeof window !== 'undefined' ? `${window.location.origin}/supabase-api` : 'http://localhost:5173/supabase-api';
const dummyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.dummy';

export const supabase = createClient(proxyUrl, dummyKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});
