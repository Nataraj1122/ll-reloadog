import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// No hardcoded defaults here to ensure we use the user's configured environment variables
const DEFAULT_URL = '';
const DEFAULT_KEY = '';

let supabaseInstance: any = null;

const createMockSupabase = () => {
  const handler: ProxyHandler<any> = {
    get: (target, prop) => {
      if (prop === 'then') return undefined;
      return new Proxy(() => {}, handler);
    },
    apply: () => {
      throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
    }
  };
  return new Proxy({}, handler);
};

export const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;

  const isValidUrl = (url: any) => {
    try {
      return typeof url === 'string' && url.startsWith('http');
    } catch {
      return false;
    }
  };

  const url = isValidUrl(supabaseUrl) && !supabaseUrl.includes('your-project') ? supabaseUrl : DEFAULT_URL;
  const key = supabaseAnonKey && !supabaseAnonKey.includes('your-anon-key') ? supabaseAnonKey : DEFAULT_KEY;

  const isInvalid = !url || !key || !isValidUrl(url);

  if (isInvalid) {
    console.error('Supabase credentials are missing or invalid.');
    supabaseInstance = createMockSupabase();
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(url, key);
  } catch (e) {
    console.error('Failed to initialize Supabase client:', e);
    supabaseInstance = createMockSupabase();
  }
  
  return supabaseInstance;
};

export const supabase = getSupabase();

export const getSupabaseFileUrl = (bucket: string, path: string) => {
  try {
    const client = getSupabase();
    if (!client.storage) return null;
    const { data } = client.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl;
  } catch (e) {
    return null;
  }
};
