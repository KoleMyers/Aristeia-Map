// Location markers module
import L from 'leaflet';
import * as config from '../variables.js';

export async function initLocationMarkers(map, sidebar, partyMarker, partyMarkerLayer) {
  const [locationTitles, locationMarkers, poiMarkers] = await Promise.all([
    getLocationTitles(),
    getLocationMarkers(),
    getPOIMarkers(),
  ]);

  let overlays = getMarkersForOverlays(locationMarkers, partyMarker, sidebar);
  let textTitles = await getTextsForOverlays(locationTitles);

  if (config.showPOIs) {
    const poiOverlays = getMarkersForOverlays(poiMarkers, partyMarker, sidebar);
    overlays = { ...overlays, ...poiOverlays };
  }

  let newOverlay = getLayersGroupForOverlays(overlays, textTitles, map);

  if (partyMarkerLayer) {
    newOverlay['<span class="marker orange">Party</span>'] = partyMarkerLayer;
  }

  if (Object.keys(newOverlay).length !== 0) {
    L.control.layers(null, newOverlay).addTo(map);
  }

  map.on('overlayadd', function (e) {
    toggleOverlayOnLocalStorage(e.name);
  });

  map.on('overlayremove', function (e) {
    toggleOverlayOnLocalStorage(e.name);
  });
}

async function getLocationTitles() {
  const response = await fetch(config.locationsTitlesJSONFile);
  return response.json();
}

async function getLocationMarkers() {
  const response = await fetch(config.locationsJSONFile);
  return response.json();
}

async function getPOIMarkers() {
  try {
    const response = await fetch('./pois.json');
    return response.json();
  } catch (error) {
    console.log('POIs file not found or disabled');
    return [];
  }
}

function getLayersGroupForOverlays(overlays, textTitles, map) {
  let newOverlay = {};

  const activeOverlays = JSON.parse(
    localStorage.getItem('activeOverlays') ?? '[]'
  );
  
  for (const key in overlays) {
    newOverlay[key] = L.layerGroup(overlays[key]);

    if (activeOverlays.includes(key)) {
      newOverlay[key].addTo(map);
    }
  }

  return newOverlay;
}

function getMarkersForOverlays(rows, partyMarker, sidebar) {
  let overlays = {};

  for (const location of rows) {
    const {
      category,
      overlayMarkerColor,
      lat,
      long,
      icon,
      text,
      description,
      image,
    } = location;

    let iconToUse = L.AwesomeMarkers.icon({
      icon: icon || 'circle',
      markerColor: overlayMarkerColor || 'blue',
    });

    const marker = L.marker([lat, long], { icon: iconToUse }).bindPopup(
      `<b>${text}</b>`
    );
    
    marker.on('click', () => {
      const distanceToParty = (
        L.CRS.Simple.distance(partyMarker.getLatLng(), marker.getLatLng()) *
        config.sizeChangeFactor
      ).toFixed(1);
      const distanceInMiles = (
        distanceToParty * config.kilometerToMilesConstant
      ).toFixed(1);

      const travelVelocityHtmlContent = config.travelVelocityRulesLink
        ? `| <a href="${config.travelVelocityRulesLink}" target="_blank">Rules</a>`
        : '';
        
      const distancesHtmlContent = config.showPartyMarker
        ? `
        <p>
          <strong>Distance: ${distanceToParty} km</strong> (${distanceInMiles} miles) ${travelVelocityHtmlContent}<br/>
        </p>
        <p style="font-size: 0.9em;">
          Traveling Fast: ${milesToHours(distanceInMiles, config.travelSpeed.fast)} (${calculateDays(distanceInMiles, config.travelSpeed.fast)})<br/>
          Traveling Normal: ${milesToHours(distanceInMiles, config.travelSpeed.normal)} (${calculateDays(distanceInMiles, config.travelSpeed.normal)})<br/>
          Traveling Slow: ${milesToHours(distanceInMiles, config.travelSpeed.slow)} (${calculateDays(distanceInMiles, config.travelSpeed.slow)})
        </p>
        <br/>
        `
        : '<br/>';

      const imageHtml = image
        ? `<img src="./images/${image}" alt="${text}" style="max-width: 100%; height: auto; margin-bottom: 10px; border-radius: 4px;" />`
        : '';

      sidebar.setContent(`
        <h1>${text}</h1>
        ${imageHtml}
        ${distancesHtmlContent}
        <strong>Description:</strong>
        <p>${description}</p>
      `);
      sidebar.show();
    });

    const styledOverlayMarkerColor = `<span class="marker ${overlayMarkerColor}">${category}</span>`;

    if (!overlays[styledOverlayMarkerColor]) {
      overlays[styledOverlayMarkerColor] = [marker];
    } else {
      overlays[styledOverlayMarkerColor].push(marker);
    }
  }

  return overlays;
}

async function getTextsForOverlays(rows) {
  const locationNames = [];

  for (const location of rows) {
    const { title, lat, long, size } = location;

    const fontSize = parseInt(size);
    const fontFamily = 'IM Fell English SC';
    const textPadding = 10;

    const textWidth = (() => {
      const canvas = document.createElement('canvas').getContext('2d');
      canvas.font = `${fontSize}px ${fontFamily}`;
      return canvas.measureText(title).width;
    })();

    const svgWidth = (textWidth + textPadding) * 2;
    const svgHeight = (fontSize + textPadding) * 2;

    const element = `
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="text-shadow">
            <feDropShadow dx="4" dy="4" stdDeviation="6" flood-color="black" />
          </filter>
        </defs>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
              font-family="${fontFamily}" font-size="${fontSize}" fill="none" stroke="#212121" stroke-width="8">
          ${title}
        </text>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
              font-family="${fontFamily}" font-size="${fontSize}" fill="#fff" filter="url(#text-shadow)">
          ${title}
        </text>
      </svg>
    `;

    const position = [parseFloat(lat), parseFloat(long)];
    const bounds = [
      [position[0] - svgHeight / 50, position[1] - svgWidth / 50],
      [position[0] + svgHeight / 50, position[1] + svgWidth / 50],
    ];
    const svgOverlay = L.svgOverlay(
      new DOMParser().parseFromString(element, 'image/svg+xml').documentElement,
      bounds
    );

    locationNames.push(svgOverlay);
  }

  return locationNames;
}

function toggleOverlayOnLocalStorage(overlay) {
  const activeOverlays = JSON.parse(
    localStorage.getItem('activeOverlays') ?? '[]'
  );

  const overlayIndex = activeOverlays.indexOf(overlay);

  if (overlayIndex > -1) {
    activeOverlays.splice(overlayIndex, 1);
  } else {
    activeOverlays.push(overlay);
  }

  localStorage.setItem('activeOverlays', JSON.stringify(activeOverlays));
}

function milesToHours(distance, speed) {
  const hours = Math.floor(distance / speed);
  const minutes = (parseFloat((distance / speed).toFixed(2)) - hours) * 60;
  return `${hours}h ${minutes.toFixed(0)} min`;
}

function calculateDays(distanceInMiles, speedMph) {
  const hoursPerDay = 8;
  const totalHours = distanceInMiles / speedMph;
  const days = (totalHours / hoursPerDay).toFixed(1);
  return days === '1.0' ? '1 day' : `${days} days`;
}
