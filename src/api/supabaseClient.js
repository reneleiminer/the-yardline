import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://gqvgcccrrvduuiydakzk.supabase.co';
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_FSYKtkrIX-1GufmQl7Tk6w_MNofXfoQ';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const configuredKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseAnonKey = configuredKey.startsWith('eyJ')
  ? FALLBACK_SUPABASE_PUBLISHABLE_KEY
  : configuredKey || FALLBACK_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
