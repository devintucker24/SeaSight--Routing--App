"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import { getButtonColors, getInputColors } from '../../lib/colorUtils';

// Define the FlashCard type
interface FlashCard {
  id: string;
  front: string;
  back: string;
  category: string;
  created_at?: string;
}

export default function FlashCards() {
  const [cards, setCards] = useState<FlashCard[]>([]); 
  const [selectedCategory, setSelectedCategory] = useState(''); 
  const [currentCardIndex, setCurrentCardIndex] = useState(0); 
  const [isFlipped, setIsFlipped] = useState(false); 
  const [newFront, setNewFront] = useState(''); 
  const [newBack, setNewBack] = useState('');
  const [newCategory, setNewCategory] = useState('');

  // Fetch cards from Supabase when the page loads
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const { data, error } = await supabase.from('flashcards').select('*');
        if (error) {
          console.error('Error fetching cards:', error);
        } else {
          setCards(data || []);
        }
      } catch (err) {
        console.error('Error:', err);
      }
    };
    fetchCards();
  }, []);

  // List of your exam topics for filtering
  const topics = [
    'International Rules of the Road',
    'Inland Rules of the Road',
    'Seamanship & Shiphandling',
    'Aids to Navigation',
    'Federal & State Pilotage Laws',
    'Chartwork',
    'Local Knowledge – Jacksonville & Fernandina'
  ];

  // Filter cards based on selected topic
  const filteredCards = cards.filter(card => selectedCategory ? card.category === selectedCategory : true);

  // Function to flip the card
  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // Go to next card
  const handleNext = () => {
    setCurrentCardIndex((prev) => (prev + 1) % filteredCards.length);
    setIsFlipped(false); // Reset to front
  };

  // Add a new card to Supabase
  const handleAddCard = async () => {
    if (!newFront || !newBack || !newCategory) return;
    try {
      const { data, error } = await supabase.from('flashcards').insert({ front: newFront, back: newBack, category: newCategory }).select();
      if (error) {
        console.error('Error adding card:', error);
      } else if (data && data[0]) {
        setCards([...cards, data[0]]);
        setNewFront('');
        setNewBack('');
        setNewCategory('');
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  // If no cards, show a message with form
  if (filteredCards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            No Flash Cards Yet
          </h1>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6"
          >
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              Create Your First Flash Card
            </h2>
            
            <div className="space-y-4">
              <motion.input 
                type="text" 
                value={newFront} 
                onChange={(e) => setNewFront(e.target.value)} 
                placeholder="Front (Question/Term)" 
                className={getInputColors()}
                whileFocus={{ scale: 1.02 }}
              />
              
              <motion.input 
                type="text" 
                value={newBack} 
                onChange={(e) => setNewBack(e.target.value)} 
                placeholder="Back (Answer/Explanation)" 
                className={getInputColors()}
                whileFocus={{ scale: 1.02 }}
              />
              
              <motion.select 
                value={newCategory} 
                onChange={(e) => setNewCategory(e.target.value)} 
                className={getInputColors()}
              >
                <option value="">Select Category</option>
                {topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
              </motion.select>
              
              <motion.button 
                onClick={handleAddCard} 
                className={`w-full ${getButtonColors('primary')}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Add Card
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const currentCard = filteredCards[currentCardIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-2xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Flash Card System
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Study with interactive flash cards
          </p>
        </motion.div>
        
        {/* Topic Filter */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex justify-center mb-8"
        >
          <select 
            onChange={(e) => setSelectedCategory(e.target.value)} 
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
          >
            <option value="">All Topics</option>
            {topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
          </select>
        </motion.div>
        
        {/* Flash Card Display */}
        <div className="flex justify-center mb-8" style={{ perspective: '1000px' }}>
          <motion.div
            key={currentCard.id}
            initial={{ opacity: 0, rotateY: 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: -90 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            className="w-80 h-64 cursor-pointer"
            onClick={handleFlip} // Add click to flip function
            style={{ transformStyle: 'preserve-3d' }}
          >
            <motion.div
              animate={{
                rotateY: isFlipped ? 180 : 0,
                transition: {
                  type: "spring",
                  stiffness: 300,
                  damping: 30
                }
              }}
              className="relative w-full h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front Side */}
              <div
                style={{
                  position: 'absolute',
                  backfaceVisibility: 'hidden',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  backgroundColor: 'var(--card-front-bg)',
                  border: '1px solid var(--card-border)'
                }}
              >
                <p className="text-lg font-medium text-gray-900 dark:text-white text-center">
                  {currentCard.front}
                </p>
              </div>

              {/* Back Side */}
              <div
                style={{
                  position: 'absolute',
                  backfaceVisibility: 'hidden',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  backgroundColor: 'var(--card-back-bg)',
                  border: '1px solid var(--card-border)',
                  transform: 'rotateY(180deg)'
                }}
              >
                <p className="text-lg font-medium text-gray-900 dark:text-white text-center">
                  {currentCard.back}
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Card Controls */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex justify-center mb-8"
        >
          <motion.button
            onClick={handleNext}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={getButtonColors('primary')}
          >
            Next Card
          </motion.button>
        </motion.div>
        
        {/* Card Counter */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center text-gray-600 dark:text-gray-300 mb-8"
        >
          Card {currentCardIndex + 1} of {filteredCards.length}
        </motion.div>
        
        {/* Add New Card Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-slate-700 max-w-md mx-auto"
        >
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
            Add New Flash Card
          </h2>
          
          <div className="space-y-4">
            <motion.input 
              type="text" 
              value={newFront} 
              onChange={(e) => setNewFront(e.target.value)} 
              placeholder="Front (Question/Term)" 
              className={getInputColors()}
              whileFocus={{ scale: 1.02 }}
            />
            
            <motion.input 
              type="text" 
              value={newBack} 
              onChange={(e) => setNewBack(e.target.value)} 
              placeholder="Back (Answer/Explanation)" 
              className={getInputColors()}
              whileFocus={{ scale: 1.02 }}
            />
            
            <motion.select 
              value={newCategory} 
              onChange={(e) => setNewCategory(e.target.value)} 
              className={getInputColors()}
            >
              <option value="">Select Category</option>
              {topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
            </motion.select>
            
            <motion.button 
              onClick={handleAddCard} 
              className={`w-full ${getButtonColors('primary')}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Add Card
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

