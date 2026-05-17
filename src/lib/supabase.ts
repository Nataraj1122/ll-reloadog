import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fallback logic for development if environment variables are not set
const DEFAULT_URL = 'https://hnhyyucdpnjzepbvsldy.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaHl5dWNkcG5qemVwYnZzbGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5Njk0MjYsImV4cCI6MjA5MzU0NTQyNn0._W6FNTVBQQdaEVjDtENezy3D6qZ2nufmP4iuxjrpznA';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are missing! Falling back to default demo credentials.');
  console.info('To fix this, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file or Vercel dashboard.');
}

export const supabase = createClient(
  supabaseUrl || DEFAULT_URL,
  supabaseAnonKey || DEFAULT_KEY
)

export const getSupabaseFileUrl = (bucket: string, path: string) => {
  if (!path) return '';
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl;
};
