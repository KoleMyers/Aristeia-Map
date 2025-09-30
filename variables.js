const kilometerToMilesConstant = 0.6213712; // 1 km = 0.6213712 miles
const sizeChangeFactor = 4.42; // Use to make distances longer (increasing this value) or shorter (decresing this value). Usefull for different map sizes.

// Travel speeds from D&D (values in miles per hour)
const travelSpeed = {
  slow: 2,
  normal: 3,
  fast: 4,
};

const locationsJSONFile = './locations.json'; // Change to load the locations markers from a different file
const locationsTitlesJSONFile = './location-titles.json'; // Change to load the locations markers from a different file
const mapFolder = './map'; // Load the map from a folder other han /map (remember to slice the map using maptiles)
const nameOfTheMapOrPage = 'Aristeia'; // Name to be used as the title of the HTML page

const biggestMapFolderZoom = 6; // Maximum folder level (eg. /map/6/)
const shortestMapFolderZoom = 0; // Minimum folder level (eg. /map/1/)
const biggestZoom = 5; // Maximum zoom level, if higher than biggestMapFolderZoom it will zoom in the image ignoring quality
const lowestZoom = 1; // Lowest possible zoom
const initialZoom = 4; // Initial zoom level when the map loads

const mapCenter = [-128.3, 129.0]; // Coordinates for the center of the map
const initialPartyPositionOnMap = [-98.9, 118.5];

const showPartyMarker = true; // Show the party marker, useful to get distances to other markers
const showLocationFinderMarker = false; // Used to get the lat and long from the map, visualy, so it's easy to add coordinates to the CSV file
const showPOIs = true; // Show POIs layer - set to true to enable POIs
const travelVelocityRulesLink = 'https://2e.aonprd.com/Rules.aspx?ID=2581';

const mapSouthWest = [-255, 0]; // Leave empty to remove map bounds, or add the value of for your map (use the showLocationFinderMarker if needed)
const mapNorthEast = [0, 255]; // Leave empty to remove map bounds, or add the value of for your map (use the showLocationFinderMarker if needed)
