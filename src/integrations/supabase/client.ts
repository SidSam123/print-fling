// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

//Sid Supa
const SUPABASE_URL = "https://mflaeihhyptgauqxiwfa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGFlaWhoeXB0Z2F1cXhpd2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxMzU1NjEsImV4cCI6MjA1NzcxMTU2MX0.-WVAMPglPEH-jVagOBn4RJpNSYvnYLLW8W9UNyD5ivs";

// const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
// const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if(!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing Supabase environment variables")
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Initialize storage if needed
(async () => {
    try {
      // Check if documents bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      const documentsBucketExists = buckets?.some(bucket => bucket.name === 'documents');
      
      if (!documentsBucketExists) {
        console.log('Documents bucket does not exist. Please create it in the Supabase dashboard.');
      }
    } catch (error) {
      console.error('Error checking storage buckets:', error);
    }
  })();