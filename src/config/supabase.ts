import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase URL and API key
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase; 