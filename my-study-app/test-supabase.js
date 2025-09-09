// Test Supabase connection
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://urxywqbcufignlnesehp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyeHl3cWJjdWZpZ25sbmVzZWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwOTEwODAsImV4cCI6MjA3MjY2NzA4MH0.dApjCIzR1HGA2ZqAb2-2tVwZ62mxICqC1kcWapEIaNQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('flashcards').select('*');
    
    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log('✅ Connection successful!');
      console.log('📊 Data:', data);
      console.log('📈 Number of cards:', data?.length || 0);
    }
  } catch (err) {
    console.error('❌ Connection failed:', err);
  }
}

testConnection();
