import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jbwgjegelhoueygcvafq.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impid2dqZWdlbGhvdWV5Z2N2YWZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY1NjE0MiwiZXhwIjoyMDkwMjMyMTQyfQ.KHcFzjQ8yTqIHs38wgAO_E5HpwZKdyjhairK0wXMWrM';

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
