// Party Position Sync Module
import { 
  initFirebase, 
  isFirebaseConfigured, 
  isAuthenticated, 
  onAuthStateChanged, 
  onPartyPositionChange, 
  updatePartyPosition 
} from './firebase-client.js';

let unsubscribePosition = null;

// Update party marker draggability
function updatePartyMarkerDraggable(isLoggedIn) {
  if (typeof window.partyMarker !== 'undefined' && window.partyMarker) {
    if (isLoggedIn) {
      window.partyMarker.dragging.enable();
    } else {
      window.partyMarker.dragging.disable();
    }
  }
}

// Initialize party sync with Firebase
export function initPartySync() {
  if (!isFirebaseConfigured()) {
    return;
  }

  if (!initFirebase()) {
    return;
  }

  // Listen for auth state changes
  onAuthStateChanged((user) => {
    if (user) {
      setupPartyMarkerDragHandler();
    } else {
      updatePartyMarkerDraggable(false);
    }
  });

  // Start listening for position changes
  startPositionListener();
}

// Start real-time listener for party position
function startPositionListener() {
  if (unsubscribePosition) {
    unsubscribePosition();
  }
  
  unsubscribePosition = onPartyPositionChange((position) => {
    if (position && position.lat !== null && position.lng !== null) {
      const newPos = [position.lat, position.lng];
      
      if (typeof window.partyMarker !== 'undefined' && window.partyMarker) {
        window.partyMarker.setLatLng(newPos);
      }
      
      localStorage.setItem('partyPosition', JSON.stringify(newPos));
      console.log('Party position updated:', newPos);
    }
  });
  
  // Listener is now active
}

// Setup party marker drag handler (only when authenticated)
function setupPartyMarkerDragHandler() {
  if (typeof window.partyMarker !== 'undefined' && window.partyMarker) {
    // Remove any existing handlers
    window.partyMarker.off('dragend');

    window.partyMarker.on('dragend', async function(e) {
      const pos = window.partyMarker.getLatLng();
      const newPosition = [pos.lat, pos.lng];

      // Save to localStorage
      localStorage.setItem('partyPosition', JSON.stringify(newPosition));

      // Save to Firebase (authenticated users only)
      const { error } = await updatePartyPosition(pos.lat, pos.lng);
      if (error) {
        console.error('Failed to sync position:', error);
      }
    });

    updatePartyMarkerDraggable(true);
  } else {
    // Retry in 500ms if marker isn't ready
    setTimeout(setupPartyMarkerDragHandler, 500);
  }
}

// Handle page visibility
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (unsubscribePosition) {
      unsubscribePosition();
      unsubscribePosition = null;
    }
  } else {
    if (isFirebaseConfigured()) {
      startPositionListener();
    }
  }
});
