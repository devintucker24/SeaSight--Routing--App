// Z-Index hierarchy for SeaSight application
// Higher numbers appear on top

export const Z_INDEX = {
  // Modal and overlay layers
  MODAL: 2000,
  MODAL_BACKDROP: 1999,
  
  // Navigation and top-level controls
  NAVIGATION: 1500,
  NOTIFICATION: 1400,
  
  // Floating controls and panels
  FLOATING_CONTROLS: 1200,
  CLEAR_BUTTON: 1100,
  
  // Main UI panels
  MAP_CONTROLS: 1000,
  SLIDE_PANELS: 1000,
  STATUS_LEDGER: 1000,
  ACTION_DOCK: 1000,
  
  // Layer controls
  LAYER_TOGGLES: 999,
  
  // Map elements
  MAP_OVERLAY: 100,
  MAP: 1,
  
  // Background elements
  BACKGROUND: 0,
} as const;

// Helper function to get z-index value
export const getZIndex = (element: keyof typeof Z_INDEX): number => {
  return Z_INDEX[element];
};
