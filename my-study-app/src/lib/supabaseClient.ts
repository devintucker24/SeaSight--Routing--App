/**
 * Supabase Client Configuration
 *
 * This file contains the Supabase client setup for database operations.
 * Replace the placeholder values with your actual Supabase project URL and anon key.
 *
 * To get these values:
 * 1. Go to https://supabase.com/dashboard
 * 2. Select your project
 * 3. Go to Settings > API
 * 4. Copy the Project URL and anon/public key
 */

import { createClient } from '@supabase/supabase-js'

// Placeholder values - replace with your actual Supabase project credentials
const supabaseUrl = 'https://urxywqbcufignlnesehp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyeHl3cWJjdWZpZ25sbmVzZWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwOTEwODAsImV4cCI6MjA3MjY2NzA4MH0.dApjCIzR1HGA2ZqAb2-2tVwZ62mxICqC1kcWapEIaNQ'

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Export types for better TypeScript support (optional)
export type Database = object
