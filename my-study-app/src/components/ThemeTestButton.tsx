'use client';

export const ThemeTestButton = () => {
  const handleTestSpaceBlack = () => {
    const root = document.documentElement;
    root.classList.remove('deep-dark', 'midnight-blue', 'charcoal', 'dark-forest', 'space-black');
    root.classList.toggle('space-black');
    console.log('Space black toggled, classes:', root.className);
  };

  const handleTestDeepDark = () => {
    const root = document.documentElement;
    root.classList.remove('deep-dark', 'midnight-blue', 'charcoal', 'dark-forest', 'space-black');
    root.classList.toggle('deep-dark');
    console.log('Deep dark toggled, classes:', root.className);
  };

  const handleTestDarkForest = () => {
    const root = document.documentElement;
    root.classList.remove('deep-dark', 'midnight-blue', 'charcoal', 'dark-forest', 'space-black');
    root.classList.toggle('dark-forest');
    console.log('Dark forest toggled, classes:', root.className);
  };

  const handleTestCharcoal = () => {
    const root = document.documentElement;
    root.classList.remove('deep-dark', 'midnight-blue', 'charcoal', 'dark-forest', 'space-black');
    root.classList.toggle('charcoal');
    console.log('Charcoal toggled, classes:', root.className);
  };

  const handleTestMidnightBlue = () => {
    const root = document.documentElement;
    root.classList.remove('deep-dark', 'midnight-blue', 'charcoal', 'dark-forest', 'space-black');
    root.classList.toggle('midnight-blue');
    console.log('Midnight blue toggled, classes:', root.className);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button 
        onClick={handleTestSpaceBlack}
        className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
      >
        Space Black
      </button>
      <button 
        onClick={handleTestDeepDark}
        className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
      >
        Deep Dark
      </button>
      <button 
        onClick={handleTestDarkForest}
        className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
      >
        Dark Forest
      </button>
      <button 
        onClick={handleTestCharcoal}
        className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors"
      >
        Charcoal
      </button>
      <button 
        onClick={handleTestMidnightBlue}
        className="px-2 py-1 bg-indigo-500 text-white rounded text-xs hover:bg-indigo-600 transition-colors"
      >
        Midnight Blue
      </button>
    </div>
  );
};
