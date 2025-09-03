# Google Maps API Setup Instructions

## Current Issue
The Google Maps integration is failing with "ApiNotActivatedMapError" because the Google Maps JavaScript API is not enabled for your API key.

## How to Fix

### Step 1: Enable Required APIs
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to "APIs & Services" > "Library"
4. Search for and enable these APIs:
   - **Maps JavaScript API** (required for the map display)
   - **Geocoding API** (required for address lookup)
   - **Places API** (optional, for autocomplete)

### Step 2: Verify API Key
1. Go to "APIs & Services" > "Credentials"
2. Find your API key
3. Click on it to edit
4. Under "API restrictions":
   - Select "Restrict key"
   - Enable: Maps JavaScript API, Geocoding API
5. Under "Application restrictions":
   - Add your Replit domain: `*.replit.dev`
   - Add your production domain: `snipshift.com.au`

### Step 3: Check Billing
1. Go to "Billing" in Google Cloud Console
2. Ensure billing is enabled (Google Maps requires a billing account)
3. Google provides $200/month in free credits for Maps usage

## Current Fallback Behavior
The application now gracefully falls back to an SVG-based map when Google Maps fails to load:
- Shows job locations on a simplified Australia map
- Maintains all functionality (job selection, filtering)
- Displays clear messaging about the demo mode
- Users can still search and interact with job listings

## Production Recommendations
1. Enable all required Google Maps APIs
2. Set up proper API key restrictions
3. Configure billing account
4. Test the integration in development
5. Deploy with full Google Maps functionality

## Benefits After Setup
- Interactive Google Maps with zoom/pan
- Real-time geolocation and current location detection
- Accurate geocoding and reverse geocoding
- Professional map styling and controls
- Street view and satellite imagery
- Better user experience for location-based job search

The application will automatically switch to the full Google Maps experience once the APIs are properly configured.