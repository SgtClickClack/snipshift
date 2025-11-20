import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, DollarSign, X } from 'lucide-react';
import { loadGoogleMaps, calculateDistance } from '@/lib/google-maps';
import { Job } from '@shared/firebase-schema';

interface GoogleMapViewProps {
  jobs: Job[];
  onJobSelect: (job: Job | null) => void;
  selectedJob: Job | null;
  centerLocation: { lat: number; lng: number };
  radius: number;
  searchLocation: string;
}

export default function GoogleMapView({
  jobs,
  onJobSelect,
  selectedJob,
  centerLocation,
  radius,
  searchLocation
}: GoogleMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usesFallback, setUsesFallback] = useState(false);

  // Initialize Google Map with proper API
  useEffect(() => {
    if (!mapRef.current) return;

    const initializeMap = async () => {
      try {
        setIsLoading(true);
        const google = await loadGoogleMaps();

        const map = new google.maps.Map(mapRef.current!, {
          center: centerLocation,
          zoom: 10,
          mapId: 'SNIPSHIFT_MAP_ID',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ],
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true
        });

        mapInstanceRef.current = map;

        // Add search radius circle
        const radiusCircle = new google.maps.Circle({
          strokeColor: '#3b82f6',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          map,
          center: centerLocation,
          radius: radius * 1000 // Convert km to meters
        });

        // Add center marker using AdvancedMarkerElement
        const centerMarkerContent = createMarkerElement('#3b82f6', '📍', 'center');
        const centerMarker = new google.maps.marker.AdvancedMarkerElement({
          position: centerLocation,
          map,
          title: searchLocation,
          content: centerMarkerContent
        });

        setError(null);
        setUsesFallback(false);
      } catch (err) {
        console.error('Failed to initialize Google Maps:', err);
        setError('Using demo map view - Google Maps API configuration needed.');
        setUsesFallback(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeMap();
  }, [centerLocation, radius, searchLocation]);

  // Helper function to create marker elements
  const createMarkerElement = (color: string, emoji: string, type: 'job' | 'center') => {
    const markerDiv = document.createElement('div');
    markerDiv.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${type === 'center' ? '24px' : '32px'};
      height: ${type === 'center' ? '24px' : '32px'};
      background-color: ${color};
      border: 2px solid white;
      border-radius: 50%;
      font-size: ${type === 'center' ? '12px' : '16px'};
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    markerDiv.textContent = emoji;
    return markerDiv;
  };

  // Update job markers
  useEffect(() => {
    if (!mapInstanceRef.current || usesFallback) return;

    const updateMarkers = async () => {
      try {
        const google = await loadGoogleMaps();
        
        // Clear existing markers
        markersRef.current.forEach(marker => marker.map = null);
        markersRef.current = [];

        // Create info window
        if (!infoWindowRef.current) {
          infoWindowRef.current = new google.maps.InfoWindow();
        }

        // Add job markers using AdvancedMarkerElement
        jobs.forEach((job) => {
          const jobLocation = getJobCoordinates(job);
          const distance = calculateDistance(centerLocation, jobLocation);

          // Only show jobs within radius
          if (distance <= radius) {
            const markerElement = createMarkerElement('#b91c1c', '💼', 'job');
            
            const marker = new google.maps.marker.AdvancedMarkerElement({
              position: jobLocation,
              map: mapInstanceRef.current,
              title: job.title,
              content: markerElement
            });

            // Add click listener for marker
            markerElement.addEventListener('click', () => {
              onJobSelect(job);
              
              const infoContent = `
                <div style="max-width: 300px; padding: 8px;">
                  <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1f2937;">${job.title}</h3>
                  <p style="margin: 0 0 4px 0; color: #6b7280;">Hub ${job.hubId}</p>
                  <p style="margin: 0 0 4px 0; color: #6b7280;">${job.location.city}, ${job.location.state}</p>
                  <p style="margin: 0 0 8px 0; color: #10b981; font-weight: 600;">$${job.payRate}/hour</p>
                  <p style="margin: 0; color: #6b7280; font-size: 12px;">${distance.toFixed(1)} km away</p>
                </div>
              `;
              
              infoWindowRef.current?.setContent(infoContent);
              infoWindowRef.current?.open(mapInstanceRef.current, marker);
            });

            markersRef.current.push(marker);
          }
        });
      } catch (error) {
        console.error('Failed to update markers:', error);
      }
    };

    updateMarkers();
  }, [jobs, centerLocation, radius, onJobSelect, usesFallback]);

  // Fallback coordinate helper
  const getJobCoordinates = (job: Job) => {
    if (job.lat && job.lng) {
      return { lat: job.lat, lng: job.lng };
    }
    return getMockCoordinates(job);
  };

  // Convert lat/lng to SVG coordinates for fallback map
  const coordsToSVG = (lat: number, lng: number, svgWidth: number, svgHeight: number) => {
    const latMin = -44, latMax = -10;
    const lngMin = 113, lngMax = 154;
    
    const x = ((lng - lngMin) / (lngMax - lngMin)) * svgWidth;
    const y = ((latMax - lat) / (latMax - latMin)) * svgHeight;
    
    return { x, y };
  };

  // Mock coordinates function (same as original)
  const getMockCoordinates = (job: Job) => {
    const locations: Record<string, { lat: number; lng: number }> = {
      "Sydney": { lat: -33.8688, lng: 151.2093 },
      "Melbourne": { lat: -37.8136, lng: 144.9631 },
      "Brisbane": { lat: -27.4698, lng: 153.0251 },
      "Perth": { lat: -31.9505, lng: 115.8605 },
      "Adelaide": { lat: -34.9285, lng: 138.6007 },
      "Gold Coast": { lat: -28.0167, lng: 153.4000 },
      "Newcastle": { lat: -32.9283, lng: 151.7817 },
      "Canberra": { lat: -35.2809, lng: 149.1300 },
      "Darwin": { lat: -12.4634, lng: 130.8456 },
      "Hobart": { lat: -42.8821, lng: 147.3272 }
    };
    
    const cityName = job.location?.city || "Sydney";
    const baseCoords = locations[cityName] || locations["Sydney"];
    
    // Add some random offset for variety within the city
    const offset = 0.05; // ~5km variance
    return {
      lat: baseCoords.lat + (Math.random() - 0.5) * offset,
      lng: baseCoords.lng + (Math.random() - 0.5) * offset
    };
  };

  // Fallback to SVG map if Google Maps fails
  if (error && usesFallback) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Job Locations</h3>
            <p className="text-sm text-neutral-600">
              Showing {jobs.filter(job => {
                const jobLocation = getJobCoordinates(job);
                const distance = calculateDistance(centerLocation, jobLocation);
                return distance <= radius;
              }).length} jobs within {radius}km of {searchLocation}
            </p>
          </div>
        </div>

        <Card className="relative">
          <CardContent className="p-0">
            <div className="relative bg-gradient-to-br from-blue-50 to-green-50 rounded-lg overflow-hidden">
              <div className="p-4 bg-yellow-50 border-b border-yellow-200">
                <div className="flex items-center gap-2 text-yellow-800">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-medium">Demo Map View</span>
                  <span className="text-xs">(Enable Google Maps API for full functionality)</span>
                </div>
              </div>
              
              <svg
                width="100%"
                height="600"
                viewBox="0 0 800 600"
                className="border rounded-lg"
                data-testid="fallback-map"
              >
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.5"/>
                  </pattern>
                  <radialGradient id="mapGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#f0f9ff" />
                    <stop offset="100%" stopColor="#dbeafe" />
                  </radialGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#mapGradient)" />
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* Australia outline */}
                <path 
                  d="M150 150 Q200 100 350 120 Q450 130 550 160 Q650 180 700 250 Q720 350 680 450 Q600 500 500 480 Q400 460 300 440 Q200 400 150 300 Z" 
                  fill="none" 
                  stroke="#94a3b8" 
                  strokeWidth="2" 
                  opacity="0.6"
                />
                
                {/* Center location marker */}
                <circle
                  cx={coordsToSVG(centerLocation.lat, centerLocation.lng, 800, 600).x}
                  cy={coordsToSVG(centerLocation.lat, centerLocation.lng, 800, 600).y}
                  r="8"
                  fill="#3b82f6"
                  stroke="#ffffff"
                  strokeWidth="3"
                />
                
                {/* Job markers */}
                {jobs.filter(job => {
                  const jobLocation = getJobCoordinates(job);
                  const distance = calculateDistance(centerLocation, jobLocation);
                  return distance <= radius;
                }).map((job) => {
                  const jobLocation = getJobCoordinates(job);
                  const svgCoords = coordsToSVG(jobLocation.lat, jobLocation.lng, 800, 600);
                  return (
                    <circle
                      key={job.id}
                      cx={svgCoords.x}
                      cy={svgCoords.y}
                      r="6"
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="cursor-pointer hover:r-8 transition-all"
                      onClick={() => onJobSelect(job)}
                    />
                  );
                })}
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Selected Job Details */}
        {selectedJob && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{selectedJob.title}</CardTitle>
                  <p className="text-neutral-600">Hub {selectedJob.hubId}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onJobSelect(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-neutral-500" />
                  <span>{selectedJob.location?.city || "Sydney"}, {selectedJob.location?.state || "NSW"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-neutral-500" />
                  <span>{selectedJob.startTime} - {selectedJob.endTime}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-neutral-500" />
                  <span>${selectedJob.payRate}/hour</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {(selectedJob.skillsRequired || []).map((skill: string) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>

              <p className="text-neutral-600 text-sm">{selectedJob.description}</p>
              
              <div className="flex gap-2 pt-2">
                <Button size="sm">Apply Now</Button>
                <Button variant="outline" size="sm">Save Job</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Job Locations</h3>
          <p className="text-sm text-neutral-600">
            Showing {jobs.filter(job => {
              const jobLocation = getJobCoordinates(job);
              const distance = calculateDistance(centerLocation, jobLocation);
              return distance <= radius;
            }).length} jobs within {radius}km of {searchLocation}
          </p>
        </div>
      </div>

      {/* Map Container */}
      <Card className="relative">
        <CardContent className="p-0">
          <div className="relative bg-gray-100 rounded-lg overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading map...</p>
                </div>
              </div>
            )}
            <div 
              ref={mapRef} 
              style={{ width: '100%', height: '600px' }}
              data-testid="google-map"
            />
          </div>
        </CardContent>
      </Card>

      {/* Selected Job Details */}
      {selectedJob && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{selectedJob.title}</CardTitle>
                <p className="text-neutral-600">Hub {selectedJob.hubId}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onJobSelect(null)}
                data-testid="button-close-job-details"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-neutral-500" />
                <span>{selectedJob.location.city}, {selectedJob.location.state}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-neutral-500" />
                <span>{selectedJob.startTime} - {selectedJob.endTime}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-neutral-500" />
                <span>${selectedJob.payRate}/hour</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {(selectedJob.skillsRequired || []).map((skill: string) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>

            <p className="text-neutral-600 text-sm">{selectedJob.description}</p>
            
            <div className="flex gap-2 pt-2">
              <Button size="sm" data-testid="button-apply-job">
                Apply Now
              </Button>
              <Button variant="outline" size="sm" data-testid="button-save-job">
                Save Job
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}