import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xqjezbvhqdtudvynwnal.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxamV6YnZocWR0dWR2eW53bmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MzIzMDUsImV4cCI6MjEwMjEwODMwNX0.6eGTeDiY-AeTsYDnTd0cjRxSDpjdE9uFwGVnn3oZkz4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
