import { createClient } from '@supabase/supabase-js'

const getEnvVar = (name: string) => {
  const value = import.meta.env[name];
  if (!value || value === 'undefined' || value === 'null' || value.includes('YOUR_') || value.includes('MY_')) {
    return null;
  }
  return value;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Fallback logic for development if environment variables are not set
const DEFAULT_URL = 'https://hnhyyucdpnjzepbvsldy.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaHl5dWNkcG5qemVwYnZzbGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5Njk0MjYsImV4cCI6MjA5MzU0NTQyNn0._W6FNTVBQQdaEVjDtENezy3D6qZ2nufmP4iuxjrpznA';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing or invalid. Using demo fallback.');
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
