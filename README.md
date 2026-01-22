# RPG Interactive Map

An interactive map for tabletop RPGs and fantasy worlds using [Leaflet.js](https://leafletjs.com/).

## Features

- **Interactive Map:** Pan, zoom, and explore fantasy maps
- **Custom Markers:** Define markers via JSON files
- **Sidebar Information:** Click markers to view location details
- **Real-time Party Position:** DM can move the party marker, all players see it instantly
- **Firebase Auth:** Secure DM-only controls

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:8075

## Configuration

Edit `variables.js` to customize:
- Map zoom levels and bounds
- Travel speeds
- Party marker settings
- Location JSON file paths

## Adding Markers

Edit `locations.json` with your markers:

```json
{
  "category": "Cities",
  "overlayMarkerColor": "red",
  "lat": -99.2,
  "long": 118.6,
  "icon": "crown",
  "text": "Meletis",
  "description": "A great city...",
  "image": "Meletis.jpg"
}
```

## Firebase Setup (Real-time Sync)

For real-time party position syncing:

1. Create a Firebase project
2. Enable Authentication + Firestore
3. Create `.env` file:

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

Vercel auto-deploys on every push to main.

## Scripts

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## License

MIT
