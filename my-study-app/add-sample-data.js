// Add sample flash card data
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://urxywqbcufignlnesehp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyeHl3cWJjdWZpZ25sbmVzZWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwOTEwODAsImV4cCI6MjA3MjY2NzA4MH0.dApjCIzR1HGA2ZqAb2-2tVwZ62mxICqC1kcWapEIaNQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const sampleCards = [
  {
    front: "What is the Rule of the Road?",
    back: "The Rule of the Road states that vessels must keep to the starboard (right) side when meeting head-on, and pass port to port.",
    category: "International Rules of the Road"
  },
  {
    front: "What does COLREGS stand for?",
    back: "COLREGS stands for Convention on the International Regulations for Preventing Collisions at Sea.",
    category: "International Rules of the Road"
  },
  {
    front: "What is a vessel's draft?",
    back: "Draft is the vertical distance between the waterline and the bottom of the hull (keel).",
    category: "Seamanship & Shiphandling"
  },
  {
    front: "What is a lighthouse?",
    back: "A lighthouse is a tower with a bright light used to guide ships and warn of hazards.",
    category: "Aids to Navigation"
  }
];

async function addSampleData() {
  console.log('Adding sample flash card data...');
  
  try {
    const { data, error } = await supabase
      .from('flashcards')
      .insert(sampleCards)
      .select();
    
    if (error) {
      console.error('❌ Error adding data:', error);
    } else {
      console.log('✅ Sample data added successfully!');
      console.log('📊 Added cards:', data);
    }
  } catch (err) {
    console.error('❌ Failed to add data:', err);
  }
}

addSampleData();
