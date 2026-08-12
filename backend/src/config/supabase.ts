import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xqjezbvhqdtudvynwnal.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxamV6YnZocWR0dWR2eW53bmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MzIzMDUsImV4cCI6MjEwMjEwODMwNX0.6eGTeDiY-AeTsYDnTd0cjRxSDpjdE9uFwGVnn3oZkz4';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxamV6YnZocWR0dWR2eW53bmFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUzMjMwNSwiZXhwIjoyMTAyMTA4MzA1fQ.2vqhzgRugUA6L8nrp3m1QuCEOm2QXA1HnVl_pk39ESw';

if (!SUPABASE_URL) {
  console.warn('[SUPABASE CONFIG WARNING] SUPABASE_URL environment variable is missing.');
}

export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default supabaseAdmin;
