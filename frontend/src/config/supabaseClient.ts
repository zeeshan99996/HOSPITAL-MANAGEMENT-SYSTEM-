import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cboevanmnhphawnmfpjg.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNib2V2YW5tbmhwaGF3bm1mcGpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyODUzNjUsImV4cCI6MjA1Njg2MTM2NX0.5Gv2G5Z7x6g_vD9qN3J';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
