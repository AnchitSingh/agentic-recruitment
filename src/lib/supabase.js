/**
 * Supabase Client Configuration
 * Connects frontend to Supabase backend
 */

import { createClient } from '@supabase/supabase-js';

// Export these so the sync engine can use keepalive fetch
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);