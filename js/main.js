// Main entry point
import 'leaflet/dist/leaflet.css';
import './plugins/leaflet-sidebar/L.Control.Sidebar.css';
import './plugins/awesome-markers/leaflet.awesome-markers.css';
import '../styles.css';

import L from 'leaflet';
import { initPartySync } from './party-sync.js';
import { isFirebaseConfigured } from './firebase-client.js';
import { initLocationMarkers } from './add-locations-to-map.js';

// Make L available globally for plugins
window.L = L;

// Import plugins after L is global
import './plugins/leaflet-sidebar/L.Control.Sidebar.js';
import './plugins/awesome-markers/leaflet.awesome-markers.min.js';

import * as config from '../variables.js';

// Set marker prefix
L.AwesomeMarkers.Icon.prototype.options.prefix = 'fa';

// Get saved positions
let viewZoom = localStorage.getItem('mapZoom') ?? config.initialZoom;
let partyPosition = JSON.parse(
  localStorage.getItem('partyPosition') ?? JSON.stringify(config.initialPartyPositionOnMap)
);
let viewCenter = JSON.parse(
  localStorage.getItem('mapCenter') ?? JSON.stringify(partyPosition)
);

// Create map
const map = L.map('map', { crs: L.CRS.Simple }).setView(viewCenter, viewZoom);
window.map = map;

L.tileLayer(`${config.mapFolder}/{z}/{x}/{y}.png`, {
  continuousWorld: false,
  noWrap: true,
  minZoom: config.lowestZoom,
  maxZoom: config.biggestZoom,
  maxNativeZoom: config.biggestMapFolderZoom,
  minNativeZoom: config.shortestMapFolderZoom,
}).addTo(map);

// Set bounds
if (config.mapSouthWest?.length && config.mapNorthEast?.length) {
  map.setMaxBounds(new L.LatLngBounds(config.mapSouthWest, config.mapNorthEast));
}

// Coordinate finder marker
if (config.showLocationFinderMarker) {
  const coordinateFinderMarker = L.marker(config.mapCenter, {
    draggable: true,
    icon: L.AwesomeMarkers.icon({
      icon: 'location-crosshairs',
      markerColor: 'blue',
    }),
  }).addTo(map);
  coordinateFinderMarker.bindPopup('Lat Lng Marker');
  coordinateFinderMarker.on('dragend', function () {
    const { lat, lng } = coordinateFinderMarker.getLatLng();
    const markerPos = [lat.toFixed(1), lng.toFixed(1)];
    coordinateFinderMarker.getPopup().setContent(markerPos.join(', ')).openOn(map);
  });
}

// Party marker
let partyMarker = null;
let partyMarkerLayer = null;

if (config.showPartyMarker) {
  partyMarker = L.marker(partyPosition, {
    draggable: false, // Start disabled, enable when authenticated
    icon: L.AwesomeMarkers.icon({
      icon: 'people-group',
      markerColor: 'orange',
    }),
    zIndexOffset: 1000,
  });
  partyMarker.bindPopup('Party');

  partyMarkerLayer = L.layerGroup([partyMarker]);
  partyMarkerLayer.addTo(map);
  
  // Make available globally for sync
  window.partyMarker = partyMarker;
  window.partyMarkerLayer = partyMarkerLayer;
}

// Sidebar
const sidebar = L.control.sidebar('sidebar', { position: 'left' });
map.addControl(sidebar);
window.sidebar = sidebar;

document.title = config.nameOfTheMapOrPage;

// Show sync indicator if Firebase configured
if (isFirebaseConfigured()) {
  document.getElementById('sync-indicator')?.classList.add('visible');
}

// Initialize location markers first
initLocationMarkers(map, sidebar, partyMarker, partyMarkerLayer);

// Initialize party sync after map and markers are ready
setTimeout(() => {
  initPartySync();
}, 200);

export { map, partyMarker, partyMarkerLayer, sidebar, config };
