L.AwesomeMarkers.Icon.prototype.options.prefix = 'fa';

let viewZoom = localStorage.getItem('mapZoom') ?? initialZoom;
// Use party position as center if available, otherwise fall back to mapCenter
let partyPosition = JSON.parse(localStorage.getItem('partyPosition') ?? JSON.stringify(initialPartyPositionOnMap));
let viewCenter = JSON.parse(localStorage.getItem('mapCenter') ?? JSON.stringify(partyPosition));

// Creating the Map
var map = L.map('map', { crs: L.CRS.Simple }).setView(viewCenter, viewZoom);
L.tileLayer(`${mapFolder}/{z}/{x}/{y}.png`, {
  continuousWorld: false,
  noWrap: true,
  minZoom: lowestZoom,
  maxZoom: biggestZoom, // Max zoom level, higher than maxNativeZoom, so when we go higher than maxNativeZoom, we just scale up the images on the map (providing a higher zoom)
  maxNativeZoom: biggestMapFolderZoom, // Maximum zoom level for /map/ folders
  minNativeZoom: shortestMapFolderZoom, // Minimum zoom level for /map/ folders
  // attribution: 'By <a href="https://github.com/TaylorHo" target="_blank">@TaylorHo</a> | <a href="https://github.com/TaylorHo/rpg-interactive-map" target="_blank">GitHub</a>'
}).addTo(map);

// Boundaries Variables
if (mapSouthWest && mapNorthEast && mapSouthWest.length > 0 && mapNorthEast.length > 0) {
  map.setMaxBounds(new L.LatLngBounds(mapSouthWest, mapNorthEast));
}

// Coordinate Finder (use to easily get lat and long from the map)
if (showLocationFinderMarker) {
  var coordinateFinderMarker = L.marker(mapCenter, {
    draggable: true, icon: L.AwesomeMarkers.icon({
      icon: "location-crosshairs",
      markerColor: "blue",
    }),
  }).addTo(map);
  coordinateFinderMarker.bindPopup('Lat Lng Marker');
  coordinateFinderMarker.on('dragend', function (e) {
    const { lat, lng } = coordinateFinderMarker.getLatLng();
    markerPos = [lat.toFixed(1), lng.toFixed(1)];
    coordinateFinderMarker.getPopup().setContent(markerPos.join(', ')).openOn(map);
  });
}

// Party position (saved to localStorage for persistence)
let partyMarker = null;
let partyMarkerLayer = null;

if (showPartyMarker) {
  partyMarker = L.marker(partyPosition, {
    draggable: true, icon: L.AwesomeMarkers.icon({
      icon: "circle",
      markerColor: "blue",
    }),
  });
  partyMarker.bindPopup("Party");
  partyMarker.on('dragend', function (e) {
    partyCoordinates = partyMarker.getLatLng();
    partyPosition = [partyCoordinates.lat, partyCoordinates.lng];
    localStorage.setItem('partyPosition', JSON.stringify(partyPosition));
  });
  
  // Create layer group for party marker
  partyMarkerLayer = L.layerGroup([partyMarker]);
  
  // Add party marker to map initially
  partyMarkerLayer.addTo(map);
}

// Distance Calculator
let distanceCalculator = {
  isActive: false,
  startPoint: null,
  endPoint: null,
  startMarker: null,
  endMarker: null,
  line: null,
  popup: null,
  
  toggle: function() {
    this.isActive = !this.isActive;
    if (this.isActive) {
      // Deactivate course plotter if it's active
      if (coursePlotter.isActive) {
        coursePlotter.deactivate();
      }
      // Ensure course plotter is completely off
      map.off('click', coursePlotter.onMapClick);
      this.activate();
    } else {
      this.deactivate();
    }
  },
  
  activate: function() {
    map.on('click', this.onMapClick);
    map.getContainer().style.cursor = 'crosshair';
    this.updateUI();
    this.updateInstructions();
  },
  
  deactivate: function() {
    map.off('click', this.onMapClick);
    map.getContainer().style.cursor = '';
    this.clear();
    this.updateUI();
    this.updateInstructions();
  },
  
  onMapClick: function(e) {
    if (!distanceCalculator.isActive) return;
    
    if (!distanceCalculator.startPoint) {
      // First click - set start point
      distanceCalculator.startPoint = e.latlng;
      distanceCalculator.startMarker = distanceCalculator.createMarker(e.latlng, 'Start Point', 'green');
      distanceCalculator.updateInstructions();
    } else if (!distanceCalculator.endPoint) {
      // Second click - set end point and calculate distance
      distanceCalculator.endPoint = e.latlng;
      distanceCalculator.endMarker = distanceCalculator.createMarker(e.latlng, 'End Point', 'red');
      distanceCalculator.drawLine();
      distanceCalculator.calculateDistance();
      distanceCalculator.updateInstructions();
    } else {
      // Third click - reset and start new measurement
      distanceCalculator.clear();
      distanceCalculator.startPoint = e.latlng;
      distanceCalculator.startMarker = distanceCalculator.createMarker(e.latlng, 'Start Point', 'green');
      distanceCalculator.updateInstructions();
    }
  },
  
  createMarker: function(latlng, label, color) {
    const marker = L.marker(latlng, {
      draggable: true,
      icon: L.AwesomeMarkers.icon({
        icon: "circle",
        markerColor: color,
      }),
    }).addTo(map);
    
    marker.bindPopup(label);
    
    // Add drag event listener
    marker.on('drag', function(e) {
      distanceCalculator.onMarkerDrag(e, marker);
    });
    
    return marker;
  },
  
  onMarkerDrag: function(e, marker) {
    if (marker === this.startMarker) {
      this.startPoint = e.target.getLatLng();
    } else if (marker === this.endMarker) {
      this.endPoint = e.target.getLatLng();
    }
    
    // Update line and recalculate distance
    if (this.startPoint && this.endPoint) {
      this.updateLine();
      this.updateDistanceDisplay();
    }
  },
  
  drawLine: function() {
    if (this.startPoint && this.endPoint) {
      this.line = L.polyline([this.startPoint, this.endPoint], {
        color: 'yellow',
        weight: 3,
        opacity: 0.8,
        dashArray: '5, 5'
      }).addTo(map);
    }
  },
  
  updateLine: function() {
    if (this.line && this.startPoint && this.endPoint) {
      this.line.setLatLngs([this.startPoint, this.endPoint]);
    }
  },
  
  calculateDistance: function() {
    if (this.startPoint && this.endPoint) {
      this.updateDistanceDisplay();
    }
  },
  
  updateDistanceDisplay: function() {
    if (!this.startPoint || !this.endPoint) return;
    
    const distance = L.CRS.Simple.distance(this.startPoint, this.endPoint) * sizeChangeFactor;
    const distanceInMiles = (distance * kilometerToMilesConstant).toFixed(1);
    const distanceInKm = distance.toFixed(1);
    
    // Create or update popup at the midpoint of the line
    const midPoint = L.latLng(
      (this.startPoint.lat + this.endPoint.lat) / 2,
      (this.startPoint.lng + this.endPoint.lng) / 2
    );
    
    const content = `
      <div style="text-align: center;">
        <strong>Distance: ${distanceInKm} km</strong><br/>
        <strong>(${distanceInMiles} miles)</strong><br/><br/>
        <div style="font-size: 0.9em;">
          <strong>Travel Times:</strong><br/>
          Fast: ${milesToHours(distanceInMiles, travelSpeed.fast)}<br/>
          Normal: ${milesToHours(distanceInMiles, travelSpeed.normal)}<br/>
          Slow: ${milesToHours(distanceInMiles, travelSpeed.slow)}
        </div>
        <br/>
        <button onclick="distanceCalculator.clear()" style="padding: 5px 10px; background: #007cba; color: white; border: none; border-radius: 3px; cursor: pointer;">
          New Measurement
        </button>
      </div>
    `;
    
    if (this.popup) {
      this.popup.setLatLng(midPoint).setContent(content);
    } else {
      this.popup = L.popup()
        .setLatLng(midPoint)
        .setContent(content)
        .openOn(map);
    }
  },
  
  clear: function() {
    // Remove markers
    if (this.startMarker) {
      map.removeLayer(this.startMarker);
      this.startMarker = null;
    }
    if (this.endMarker) {
      map.removeLayer(this.endMarker);
      this.endMarker = null;
    }
    
    // Remove line
    if (this.line) {
      map.removeLayer(this.line);
      this.line = null;
    }
    
    // Remove popup
    if (this.popup) {
      map.closePopup(this.popup);
      this.popup = null;
    }
    
    // Reset points
    this.startPoint = null;
    this.endPoint = null;
  },
  
  updateUI: function() {
    // Update the button style
    const button = document.getElementById('distance-calculator-btn');
    if (button) {
      button.style.color = this.isActive ? '#dc3545' : '#333';
      button.title = this.isActive ? 'Stop Measuring' : 'Measure Distance';
    }
  },
  
  updateInstructions: function() {
    // Update instructions in the button or create an info panel
    const button = document.getElementById('distance-calculator-btn');
    if (button) {
      if (!this.isActive) {
        button.title = 'Click to start measuring distance';
      } else if (!this.startPoint) {
        button.title = 'Click on map to place start point';
      } else if (!this.endPoint) {
        button.title = 'Click on map to place end point';
      } else {
        button.title = 'Drag markers to adjust, click map for new measurement';
      }
    }
  }
};

// Add distance calculator button to the map
L.Control.DistanceCalculator = L.Control.extend({
  onAdd: function(map) {
    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
    container.style.backgroundColor = 'white';
    container.style.border = '2px solid rgba(0, 0, 0, 0.2)';
    container.style.backgroundClip = 'padding-box';
    container.style.boxShadow = 'none';
    
    const button = L.DomUtil.create('button', '', container);
    button.id = 'distance-calculator-btn';
    button.innerHTML = '<i class="fas fa-ruler"></i>';
    button.style.width = '44px';
    button.style.height = '44px';
    button.style.border = 'none';
    button.style.backgroundColor = 'transparent';
    button.style.color = '#333';
    button.style.cursor = 'pointer';
    button.style.fontSize = '24px';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.title = 'Measure Distance';
    
    button.onclick = function(e) {
      e.stopPropagation(); // Prevent the button click from bubbling to the map
      distanceCalculator.toggle();
    };
    
    return container;
  },
  
  onRemove: function(map) {
    // Nothing to do here
  }
});

// Course Plotter
let coursePlotter = {
  isActive: false,
  waypoints: [],
  markers: [],
  route: null,
  popup: null,
  infoPanel: null,
  
  toggle: function() {
    console.log('Course plotter toggle called, current isActive:', this.isActive);
    this.isActive = !this.isActive;
    if (this.isActive) {
      console.log('Activating course plotter, deactivating distance calculator');
      // Deactivate distance calculator if it's active
      if (distanceCalculator.isActive) {
        console.log('Deactivating distance calculator');
        distanceCalculator.deactivate();
      }
      // Ensure distance calculator is completely off
      map.off('click', distanceCalculator.onMapClick);
      this.activate();
    } else {
      console.log('Deactivating course plotter');
      this.deactivate();
    }
  },
  
  activate: function() {
    map.on('click', this.onMapClick);
    map.getContainer().style.cursor = 'crosshair';
    this.createInfoPanel();
    this.updateUI();
    this.updateInstructions();
  },
  
  deactivate: function() {
    map.off('click', this.onMapClick);
    map.getContainer().style.cursor = '';
    this.removeInfoPanel();
    this.clear();
    this.updateUI();
    this.updateInstructions();
  },
  
  onMapClick: function(e) {
    console.log('Course plotter onMapClick triggered, isActive:', coursePlotter.isActive, 'waypoints:', coursePlotter.waypoints.length);
    if (!coursePlotter.isActive) return;
    
    // Prevent event from bubbling to distance calculator
    e.originalEvent.stopPropagation();
    
    // Add new waypoint
    const waypointIndex = coursePlotter.waypoints.length;
    coursePlotter.waypoints.push(e.latlng);
    
    console.log('Added waypoint', waypointIndex + 1, 'at', e.latlng);
    
    // Create marker for this waypoint
    const marker = coursePlotter.createMarker(e.latlng, `Waypoint ${waypointIndex + 1}`, waypointIndex);
    coursePlotter.markers.push(marker);
    
    // Update route
    coursePlotter.updateRoute();
    coursePlotter.updateInstructions();
    coursePlotter.updateInfoPanel();
    
    // Always show the popup if we have 2+ waypoints
    // if (coursePlotter.waypoints.length >= 2) {
    //   coursePlotter.calculateTotalDistance();
    // }
  },
  
  createMarker: function(latlng, label, index) {
    const colors = ['green', 'blue', 'purple', 'red', 'orange', 'darkblue', 'lightblue'];
    const color = colors[index % colors.length];
    
    const marker = L.marker(latlng, {
      draggable: true,
      icon: L.AwesomeMarkers.icon({
        icon: "circle",
        markerColor: color,
      }),
    }).addTo(map);
    
    marker.bindPopup(`
      <div style="text-align: center;">
        <strong>${label}</strong><br/>
        <button onclick="coursePlotter.removeWaypoint(${index})" style="padding: 3px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px; margin: 2px;">
          Remove
        </button>
      </div>
    `);
    
    // Add drag event listener
    marker.on('drag', function(e) {
      coursePlotter.onMarkerDrag(e, index);
    });
    
    return marker;
  },
  
  onMarkerDrag: function(e, index) {
    this.waypoints[index] = e.target.getLatLng();
    this.updateRoute();
    this.updateInfoPanel();
  },
  
  removeWaypoint: function(index) {
    // Remove marker
    if (this.markers[index]) {
      map.removeLayer(this.markers[index]);
      this.markers.splice(index, 1);
    }
    
    // Remove waypoint
    this.waypoints.splice(index, 1);
    
    // Recreate all markers with updated indices
    this.recreateMarkers();
    this.updateRoute();
    this.updateInstructions();
    this.updateInfoPanel();
  },
  
  recreateMarkers: function() {
    // Clear existing markers
    this.markers.forEach(marker => map.removeLayer(marker));
    this.markers = [];
    
    // Recreate markers with correct indices
    this.waypoints.forEach((waypoint, index) => {
      const marker = this.createMarker(waypoint, `Waypoint ${index + 1}`, index);
      this.markers.push(marker);
    });
  },
  
  updateRoute: function() {
    // Remove existing route
    if (this.route) {
      map.removeLayer(this.route);
    }
    
    if (this.waypoints.length >= 2) {
      // Create route line
      this.route = L.polyline(this.waypoints, {
        color: 'cyan',
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 5'
      }).addTo(map);
      
      // // Calculate and display total distance
      // this.calculateTotalDistance();
    } else {
      this.route = null;
      // Don't close popup when we have waypoints - only close when clearing
      if (this.waypoints.length === 0 && this.popup) {
        map.closePopup(this.popup);
        this.popup = null;
      }
    }
  },
  
  calculateTotalDistance: function() {
    if (this.waypoints.length < 2) return;
    
    let totalDistance = 0;
    for (let i = 0; i < this.waypoints.length - 1; i++) {
      const segmentDistance = L.CRS.Simple.distance(this.waypoints[i], this.waypoints[i + 1]) * sizeChangeFactor;
      totalDistance += segmentDistance;
    }
    
    const totalDistanceInMiles = (totalDistance * kilometerToMilesConstant).toFixed(1);
    const totalDistanceInKm = totalDistance.toFixed(1);
    
    // Calculate total travel times
    const fastTime = milesToHours(totalDistanceInMiles, travelSpeed.fast);
    const normalTime = milesToHours(totalDistanceInMiles, travelSpeed.normal);
    const slowTime = milesToHours(totalDistanceInMiles, travelSpeed.slow);
    
    // Create popup at the center of the route
    const bounds = L.latLngBounds(this.waypoints);
    const center = bounds.getCenter();
    
    const content = `
      <div style="text-align: center;">
        <strong>Course Route (${this.waypoints.length} waypoints)</strong><br/><br/>
        <strong>Total Distance: ${totalDistanceInKm} km</strong><br/>
        <strong>(${totalDistanceInMiles} miles)</strong><br/><br/>
        <div style="font-size: 0.9em;">
          <strong>Total Travel Times:</strong><br/>
          Fast: ${fastTime}<br/>
          Normal: ${normalTime}<br/>
          Slow: ${slowTime}
        </div>
        <br/>
        <button onclick="coursePlotter.clear()" style="padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px;">
          Clear Route
        </button>
        <button onclick="coursePlotter.finishRoute()" style="padding: 5px 10px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">
          Finish Route
        </button>
      </div>
    `;
    
    if (this.popup) {
      this.popup.setLatLng(center).setContent(content);
    } else {
      this.popup = L.popup()
        .setLatLng(center)
        .setContent(content)
        .openOn(map);
    }
  },
  
  createInfoPanel: function() {
    // Remove existing panel if it exists
    this.removeInfoPanel();
    
    // Create info panel
    this.infoPanel = document.createElement('div');
    this.infoPanel.id = 'course-info-panel';
    this.infoPanel.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      border: 2px solid #17a2b8;
      z-index: 1000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      min-width: 300px;
      text-align: center;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    `;
    
    this.updateInfoPanel();
    document.body.appendChild(this.infoPanel);
  },
  
  removeInfoPanel: function() {
    if (this.infoPanel) {
      document.body.removeChild(this.infoPanel);
      this.infoPanel = null;
    }
  },
  
  updateInfoPanel: function() {
    if (!this.infoPanel) return;
    
    if (this.waypoints.length === 0) {
      this.infoPanel.innerHTML = `
        <div style="color: #17a2b8; font-weight: bold; margin-bottom: 5px;">
          Course Plotter Active
        </div>
        <div style="font-size: 12px; color: #ccc;">
          Click on the map to add waypoints
        </div>
      `;
    } else if (this.waypoints.length === 1) {
      this.infoPanel.innerHTML = `
        <div style="color: #17a2b8; font-weight: bold; margin-bottom: 5px;">
          Course Plotter - 1 Waypoint
        </div>
        <div style="font-size: 12px; color: #ccc;">
          Click on the map to add more waypoints
        </div>
      `;
    } else {
      // Calculate total distance
      let totalDistance = 0;
      for (let i = 0; i < this.waypoints.length - 1; i++) {
        const segmentDistance = L.CRS.Simple.distance(this.waypoints[i], this.waypoints[i + 1]) * sizeChangeFactor;
        totalDistance += segmentDistance;
      }
      
      const totalDistanceInMiles = (totalDistance * kilometerToMilesConstant).toFixed(1);
      const totalDistanceInKm = totalDistance.toFixed(1);
      
      // Calculate total travel times
      const fastTime = milesToHours(totalDistanceInMiles, travelSpeed.fast);
      const normalTime = milesToHours(totalDistanceInMiles, travelSpeed.normal);
      const slowTime = milesToHours(totalDistanceInMiles, travelSpeed.slow);
      
      // Calculate days (assuming 8 hours of travel per day)
      const fastDays = this.calculateDays(totalDistanceInMiles, travelSpeed.fast);
      const normalDays = this.calculateDays(totalDistanceInMiles, travelSpeed.normal);
      const slowDays = this.calculateDays(totalDistanceInMiles, travelSpeed.slow);
      
      this.infoPanel.innerHTML = `
        <div style="color: #17a2b8; font-weight: bold; margin-bottom: 8px;">
          Course Route (${this.waypoints.length} waypoints)
        </div>
        <div style="margin-bottom: 8px;">
          <strong>Total Distance: ${totalDistanceInKm} km (${totalDistanceInMiles} miles)</strong>
        </div>
        <div style="font-size: 12px; margin-bottom: 8px;">
          <strong>Travel Times:</strong><br/>
          Fast: ${fastTime} (${fastDays})<br/>
          Normal: ${normalTime} (${normalDays})<br/>
          Slow: ${slowTime} (${slowDays})
        </div>
        <div style="font-size: 11px; color: #ccc;">
          Click map to add waypoints
        </div>
      `;
    }
  },
  
  calculateDays: function(distanceInMiles, speedMph) {
    const hoursPerDay = 8; // Maximum travel hours per day
    const totalHours = distanceInMiles / speedMph;
    const days = (totalHours / hoursPerDay).toFixed(1);
    
    if (days === "1.0") {
      return "1 day";
    } else {
      return `${days} days`;
    }
  },
  
  finishRoute: function() {
    // Keep the route but exit plotting mode
    this.isActive = false;
    map.off('click', this.onMapClick);
    map.getContainer().style.cursor = '';
    this.updateUI();
    this.updateInstructions();
    // Keep the info panel visible but update it to show it's finished
    if (this.infoPanel) {
      this.infoPanel.style.borderColor = '#28a745'; // Change to green to indicate finished
      this.updateInfoPanel();
    }
  },
  
  clear: function() {
    // Remove all markers
    this.markers.forEach(marker => map.removeLayer(marker));
    this.markers = [];
    
    // Remove route
    if (this.route) {
      map.removeLayer(this.route);
      this.route = null;
    }
    
    // Remove popup
    if (this.popup) {
      map.closePopup(this.popup);
      this.popup = null;
    }
    
    // Reset waypoints
    this.waypoints = [];
    this.updateInstructions();
    this.updateInfoPanel();
  },
  
  updateUI: function() {
    const button = document.getElementById('course-plotter-btn');
    if (button) {
      button.style.color = this.isActive ? '#dc3545' : '#333';
      button.title = this.isActive ? 'Stop Plotting' : 'Plot Course';
    }
  },
  
  updateInstructions: function() {
    const button = document.getElementById('course-plotter-btn');
    if (button) {
      if (!this.isActive) {
        button.title = 'Click to start plotting a course with multiple waypoints';
      } else {
        button.title = `Click on map to add waypoints (${this.waypoints.length} added). Click "Finish Route" in popup when done.`;
      }
    }
  }
};

// Add course plotter button to the map
L.Control.CoursePlotter = L.Control.extend({
  onAdd: function(map) {
    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
    container.style.backgroundColor = 'white';
    container.style.border = '2px solid rgba(0, 0, 0, 0.2)';
    container.style.backgroundClip = 'padding-box';
    container.style.boxShadow = 'none';
    container.style.marginTop = '10px';
    
    const button = L.DomUtil.create('button', '', container);
    button.id = 'course-plotter-btn';
    button.innerHTML = '<i class="fas fa-map-marked-alt"></i>';
    button.style.width = '44px';
    button.style.height = '44px';
    button.style.border = 'none';
    button.style.backgroundColor = 'transparent';
    button.style.color = '#333';
    button.style.cursor = 'pointer';
    button.style.fontSize = '24px';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.title = 'Plot Course';
    
    button.onclick = function(e) {
      e.stopPropagation(); // Prevent the button click from bubbling to the map
      coursePlotter.toggle();
    };
    
    return container;
  },
  
  onRemove: function(map) {
    // Nothing to do here
  }
});

// Add the distance calculator control to the map
new L.Control.DistanceCalculator({ position: 'bottomright' }).addTo(map);

// Add the course plotter control to the map
new L.Control.CoursePlotter({ position: 'bottomright' }).addTo(map);