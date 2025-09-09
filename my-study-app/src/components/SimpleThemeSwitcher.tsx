'use client';

import { useState, useEffect } from 'react';

const themes = [
  { value: 'light', label: 'Light', description: 'Default light theme' },
  { value: 'dark', label: 'Dark', description: 'System dark theme' },
  { value: 'deep-dark', label: 'Deep Dark', description: 'Ultra dark with max contrast' },
  { value: 'midnight-blue', label: 'Midnight Blue', description: 'Dark blue aesthetic' },
  { value: 'charcoal', label: 'Charcoal', description: 'Warm dark gray' },
  { value: 'dark-forest', label: 'Dark Forest', description: 'Dark green undertones' },
  { value: 'space-black', label: 'Space Black', description: 'True black with neon accents' },
] as const;

export const SimpleThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');

  useEffect(() => {
    setMounted(true);
    // Get theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setCurrentTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setCurrentTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setCurrentTheme(newTheme);
    
    // Apply theme directly to document
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'deep-dark', 'midnight-blue', 'charcoal', 'dark-forest', 'space-black');
    root.classList.add(newTheme);
    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Debug: Log the current state
    console.log('Theme changed to:', newTheme);
    console.log('Root classes:', root.className);
    console.log('Data theme:', root.getAttribute('data-theme'));
  };

  if (!mounted) {
    return (
      <div className="relative">
        <select
          disabled
          className="appearance-none bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent opacity-50"
        >
          <option>Loading...</option>
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        value={currentTheme}
        onChange={(e) => handleThemeChange(e.target.value)}
        className="appearance-none bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      >
        {themes.map((themeOption) => (
          <option key={themeOption.value} value={themeOption.value}>
            {themeOption.label} - {themeOption.description}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};
