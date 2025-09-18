// Accessibility utilities for SeaSight application

// ============================================================================
// Screen Reader Utilities
// ============================================================================

/**
 * Screen reader utilities for maritime navigation
 */
export const screenReader = {
  /**
   * Announce route information to screen readers
   * @param waypointCount - Number of waypoints
   * @param etaHours - Estimated time of arrival in hours
   * @param distanceNm - Distance in nautical miles
   */
  announceRoute: (waypointCount: number, etaHours?: number, distanceNm?: number): void => {
    const message = [
      `Route planned with ${waypointCount} waypoint${waypointCount !== 1 ? 's' : ''}`,
      etaHours ? `Estimated arrival time: ${etaHours.toFixed(1)} hours` : '',
      distanceNm ? `Total distance: ${distanceNm.toFixed(1)} nautical miles` : '',
    ].filter(Boolean).join('. ');

    announceToScreenReader(message);
  },

  /**
   * Announce waypoint addition
   * @param waypointName - Name of the waypoint
   * @param coordinates - Coordinates of the waypoint
   */
  announceWaypointAdded: (waypointName: string, coordinates: { lat: number; lon: number }): void => {
    const message = `Waypoint ${waypointName} added at ${formatCoordinates(coordinates)}`;
    announceToScreenReader(message);
  },

  /**
   * Announce waypoint removal
   * @param waypointName - Name of the waypoint
   */
  announceWaypointRemoved: (waypointName: string): void => {
    const message = `Waypoint ${waypointName} removed`;
    announceToScreenReader(message);
  },

  /**
   * Announce map interaction
   * @param action - Action performed
   * @param details - Additional details
   */
  announceMapInteraction: (action: string, details?: string): void => {
    const message = details ? `Map: ${action}. ${details}` : `Map: ${action}`;
    announceToScreenReader(message);
  },

  /**
   * Announce route calculation status
   * @param status - Status of route calculation
   * @param details - Additional details
   */
  announceRouteCalculation: (status: 'started' | 'completed' | 'failed', details?: string): void => {
    const messages = {
      started: 'Route calculation started',
      completed: 'Route calculation completed',
      failed: 'Route calculation failed',
    };

    const message = details ? `${messages[status]}. ${details}` : messages[status];
    announceToScreenReader(message);
  },
};

/**
 * Announce a message to screen readers
 * @param message - Message to announce
 */
function announceToScreenReader(message: string): void {
  // Create a live region for screen reader announcements
  const liveRegion = document.getElementById('a11y-live-region') || createLiveRegion();
  liveRegion.textContent = message;
  
  // Clear the message after a short delay to allow for re-announcement
  setTimeout(() => {
    liveRegion.textContent = '';
  }, 1000);
}

/**
 * Create a live region for screen reader announcements
 * @returns Live region element
 */
function createLiveRegion(): HTMLElement {
  const liveRegion = document.createElement('div');
  liveRegion.id = 'a11y-live-region';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.style.position = 'absolute';
  liveRegion.style.left = '-10000px';
  liveRegion.style.width = '1px';
  liveRegion.style.height = '1px';
  liveRegion.style.overflow = 'hidden';
  document.body.appendChild(liveRegion);
  return liveRegion;
}

// ============================================================================
// Focus Management
// ============================================================================

/**
 * Focus management utilities
 */
export const focusManager = {
  /**
   * Focus the map element
   * @param mapElement - Map element to focus
   */
  focusMap: (mapElement: HTMLElement | null): void => {
    if (mapElement) {
      mapElement.focus();
    }
  },

  /**
   * Focus the first waypoint in the list
   * @param waypointList - Waypoint list element
   */
  focusFirstWaypoint: (waypointList: HTMLElement | null): void => {
    if (waypointList) {
      const firstWaypoint = waypointList.querySelector('[data-waypoint-index="0"]') as HTMLElement;
      if (firstWaypoint) {
        firstWaypoint.focus();
      }
    }
  },

  /**
   * Focus the route planning button
   * @param routeButton - Route planning button element
   */
  focusRouteButton: (routeButton: HTMLElement | null): void => {
    if (routeButton) {
      routeButton.focus();
    }
  },

  /**
   * Focus the clear route button
   * @param clearButton - Clear route button element
   */
  focusClearButton: (clearButton: HTMLElement | null): void => {
    if (clearButton) {
      clearButton.focus();
    }
  },

  /**
   * Trap focus within a container
   * @param container - Container element to trap focus in
   * @param firstFocusable - First focusable element
   * @param lastFocusable - Last focusable element
   */
  trapFocus: (
    container: HTMLElement,
    firstFocusable: HTMLElement,
    lastFocusable: HTMLElement
  ): (() => void) => {
    const handleTabKey = (e: KeyboardEvent): void => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            lastFocusable.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            firstFocusable.focus();
            e.preventDefault();
          }
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    
    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  },
};

// ============================================================================
// Keyboard Navigation
// ============================================================================

/**
 * Keyboard navigation utilities
 */
export const keyboardNavigation = {
  /**
   * Handle waypoint navigation with arrow keys
   * @param event - Keyboard event
   * @param currentIndex - Current waypoint index
   * @param totalWaypoints - Total number of waypoints
   * @param onNavigate - Callback when navigation occurs
   */
  handleWaypointNavigation: (
    event: KeyboardEvent,
    currentIndex: number,
    totalWaypoints: number,
    onNavigate: (newIndex: number) => void
  ): void => {
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        if (currentIndex > 0) {
          onNavigate(currentIndex - 1);
        }
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        if (currentIndex < totalWaypoints - 1) {
          onNavigate(currentIndex + 1);
        }
        break;
      case 'Home':
        event.preventDefault();
        onNavigate(0);
        break;
      case 'End':
        event.preventDefault();
        onNavigate(totalWaypoints - 1);
        break;
    }
  },

  /**
   * Handle map keyboard navigation
   * @param event - Keyboard event
   * @param onAction - Callback when action is triggered
   */
  handleMapNavigation: (
    event: KeyboardEvent,
    onAction: (action: 'zoomIn' | 'zoomOut' | 'panUp' | 'panDown' | 'panLeft' | 'panRight') => void
  ): void => {
    switch (event.key) {
      case '+':
      case '=':
        event.preventDefault();
        onAction('zoomIn');
        break;
      case '-':
        event.preventDefault();
        onAction('zoomOut');
        break;
      case 'ArrowUp':
        event.preventDefault();
        onAction('panUp');
        break;
      case 'ArrowDown':
        event.preventDefault();
        onAction('panDown');
        break;
      case 'ArrowLeft':
        event.preventDefault();
        onAction('panLeft');
        break;
      case 'ArrowRight':
        event.preventDefault();
        onAction('panRight');
        break;
    }
  },
};

// ============================================================================
// ARIA Utilities
// ============================================================================

/**
 * ARIA utilities for enhanced accessibility
 */
export const ariaUtils = {
  /**
   * Set ARIA label for waypoint
   * @param element - Waypoint element
   * @param waypoint - Waypoint data
   * @param index - Waypoint index
   */
  setWaypointLabel: (
    element: HTMLElement,
    waypoint: { name: string; lat: number; lon: number },
    index: number
  ): void => {
    const coordinates = formatCoordinates(waypoint);
    element.setAttribute('aria-label', `${waypoint.name}, ${coordinates}, waypoint ${index + 1}`);
  },

  /**
   * Set ARIA label for route
   * @param element - Route element
   * @param waypointCount - Number of waypoints
   * @param etaHours - Estimated time of arrival
   * @param distanceNm - Distance in nautical miles
   */
  setRouteLabel: (
    element: HTMLElement,
    waypointCount: number,
    etaHours?: number,
    distanceNm?: number
  ): void => {
    const parts = [
      `Route with ${waypointCount} waypoint${waypointCount !== 1 ? 's' : ''}`,
      etaHours ? `ETA: ${etaHours.toFixed(1)} hours` : '',
      distanceNm ? `Distance: ${distanceNm.toFixed(1)} nautical miles` : '',
    ].filter(Boolean);

    element.setAttribute('aria-label', parts.join(', '));
  },

  /**
   * Set ARIA live region for dynamic content
   * @param element - Element to set as live region
   * @param politeness - Politeness level
   */
  setLiveRegion: (element: HTMLElement, politeness: 'polite' | 'assertive' = 'polite'): void => {
    element.setAttribute('aria-live', politeness);
    element.setAttribute('aria-atomic', 'true');
  },

  /**
   * Set ARIA expanded state
   * @param element - Element to set expanded state
   * @param expanded - Whether element is expanded
   */
  setExpanded: (element: HTMLElement, expanded: boolean): void => {
    element.setAttribute('aria-expanded', expanded.toString());
  },

  /**
   * Set ARIA selected state
   * @param element - Element to set selected state
   * @param selected - Whether element is selected
   */
  setSelected: (element: HTMLElement, selected: boolean): void => {
    element.setAttribute('aria-selected', selected.toString());
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format coordinates for accessibility
 * @param coordinates - Coordinates to format
 * @returns Formatted coordinate string
 */
function formatCoordinates(coordinates: { lat: number; lon: number }): string {
  const lat = Math.abs(coordinates.lat);
  const lon = Math.abs(coordinates.lon);
  const latDir = coordinates.lat >= 0 ? 'North' : 'South';
  const lonDir = coordinates.lon >= 0 ? 'East' : 'West';
  
  return `${lat.toFixed(4)} degrees ${latDir}, ${lon.toFixed(4)} degrees ${lonDir}`;
}

/**
 * Check if element is visible to screen readers
 * @param element - Element to check
 * @returns Whether element is visible to screen readers
 */
export function isVisibleToScreenReader(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    element.getAttribute('aria-hidden') !== 'true' &&
    !element.hasAttribute('hidden')
  );
}

/**
 * Get accessible name for element
 * @param element - Element to get name for
 * @returns Accessible name
 */
export function getAccessibleName(element: HTMLElement): string {
  return (
    element.getAttribute('aria-label') ||
    element.getAttribute('aria-labelledby') ||
    element.textContent ||
    element.getAttribute('alt') ||
    element.getAttribute('title') ||
    ''
  ).trim();
}
