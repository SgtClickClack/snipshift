import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, DollarSign, X } from 'lucide-react';
import { loadGoogleMaps, calculateDistance } from '@/lib/google-maps';
import { Job } from '@shared/firebase-schema';

// Map Theme Configuration referencing Tailwind CSS variables
const MAP_THEME = {
  markers: {
    center: {
      color: 'var(--steel-600)',
      bg: 'var(--steel-600)',
      border: '#ffffff'
    },
    job: {
      color: 'var(--primary)', // Red accent
      bg: 'var(--primary)',
      border: '#ffffff'
    }
  },
  radius: {
    stroke: 'var(--steel-500)',
    fill: 'var(--steel-500)',
  },
  infoWindow: {
    title: 'var(--foreground)',
    text: 'var(--muted-foreground)',
    rate: 'var(--success)',
    accent: 'var(--primary)',
  },
  fallback: {
    grid: 'var(--border)',
    gradientStart: 'var(--steel-50)',
    gradientEnd: 'var(--steel-100)',
    landStroke: 'var(--steel-300)',
    center: 'var(--steel-600)',
    job: 'var(--primary)'
  }
};

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
  const circleRef = useRef<any>(null);
  const centerMarkerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usesFallback, setUsesFallback] = useState(false);

  // Initialize Google Map with proper API (only once)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return; // Don't reinitialize if map already exists

    const initializeMap = async () => {
      try {
        setIsLoading(true);
        const google = await loadGoogleMaps();

        const map = new google.maps.Map(mapRef.current!, {
          center: centerLocation,
          zoom: 10,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
          mapId: 'DEMO_MAP_ID', // Required for AdvancedMarkerElement
        });

        mapInstanceRef.current = map;

        // Add search radius circle
        circleRef.current = new google.maps.Circle({
          strokeColor: MAP_THEME.radius.stroke,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: MAP_THEME.radius.fill,
          fillOpacity: 0.15,
          map,
          center: centerLocation,
          radius: radius * 1000 // Convert km to meters
        });

        // Add center marker using AdvancedMarkerElement
        const centerMarkerContent = createMarkerElement(MAP_THEME.markers.center.color, '📍', 'center');
        centerMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
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
  }, []); // Only run once on mount

  // Sync map center and radius circle when centerLocation or radius changes
  useEffect(() => {
    if (!mapInstanceRef.current || usesFallback) return;

    const updateMapCenter = async () => {
      try {
        const map = mapInstanceRef.current;
        
        if (map) {
          // Pan to new center location
          map.panTo(centerLocation);
          
          // Update radius circle if it exists
          if (circleRef.current) {
            circleRef.current.setCenter(centerLocation);
            circleRef.current.setRadius(radius * 1000); // Convert km to meters
          }
          
          // Update center marker position if it exists
          if (centerMarkerRef.current) {
            centerMarkerRef.current.position = centerLocation;
            centerMarkerRef.current.title = searchLocation;
          }
        }
      } catch (error) {
        console.error('Failed to update map center:', error);
      }
    };

    updateMapCenter();
  }, [centerLocation, radius, searchLocation, usesFallback]);

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

  // Update job markers and fit bounds
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

        const bounds = new google.maps.LatLngBounds();
        let hasValidMarkers = false;

        // Add job markers using AdvancedMarkerElement
        jobs.forEach((job) => {
          const jobLocation = getJobCoordinates(job);
          const distance = calculateDistance(centerLocation, jobLocation);

          // Only show jobs within radius
          if (distance <= radius) {
            const markerElement = createMarkerElement(MAP_THEME.markers.job.color, '💼', 'job');
            
            const marker = new google.maps.marker.AdvancedMarkerElement({
              position: jobLocation,
              map: mapInstanceRef.current,
              title: job.title,
              content: markerElement
            });

            // Extend bounds to include this marker
            bounds.extend(jobLocation);
            hasValidMarkers = true;

            // Add click listener for marker
            markerElement.addEventListener('click', () => {
              onJobSelect(job);
              
              // Get location display string
              const locationDisplay = typeof job.location === 'string' 
                ? job.location 
                : (job.location?.city && job.location?.state 
                  ? `${job.location.city}, ${job.location.state}` 
                  : 'Location TBD');
              
              const rateDisplay = job.rate || job.payRate || 'Rate TBD';
              
              const infoContent = `
                <div style="max-width: 300px; padding: 8px;">
                  <h3 style="margin: 0 0 8px 0; font-weight: bold; color: ${MAP_THEME.infoWindow.title};">${job.title}</h3>
                  ${job.shopName ? `<p style="margin: 0 0 4px 0; color: ${MAP_THEME.infoWindow.text};">${job.shopName}</p>` : ''}
                  <p style="margin: 0 0 4px 0; color: ${MAP_THEME.infoWindow.text};">${locationDisplay}</p>
                  <p style="margin: 0 0 8px 0; color: ${MAP_THEME.infoWindow.rate}; font-weight: 600;">${rateDisplay}</p>
                  <p style="margin: 0; color: ${MAP_THEME.infoWindow.text}; font-size: 12px;">${distance.toFixed(1)} km away</p>
                </div>
              `;
              
              infoWindowRef.current?.setContent(infoContent);
              infoWindowRef.current?.open(mapInstanceRef.current, marker);
            });

            markersRef.current.push(marker);
          }
        });

        // Fit bounds to show all markers if we have any
        if (hasValidMarkers && markersRef.current.length > 0) {
          // Also include center location in bounds
          bounds.extend(centerLocation);
          mapInstanceRef.current.fitBounds(bounds, {
            padding: 50 // Add padding around markers
          });
        }
      } catch (error) {
        console.error('Failed to update markers:', error);
      }
    };

    updateMarkers();
  }, [jobs, centerLocation, radius, onJobSelect, usesFallback]);

  // Get job coordinates from API data
  const getJobCoordinates = (job: Job) => {
    // Use real coordinates from API if available
    if (job.lat && job.lng) {
      return { lat: Number(job.lat), lng: Number(job.lng) };
    }
    // If no coordinates, use a default location (should not happen with proper API data)
    console.warn(`Job ${job.id} missing coordinates, using default location`);
    return { lat: -33.8688, lng: 151.2093 }; // Default to Sydney
  };

  // Convert lat/lng to SVG coordinates for fallback map
  const coordsToSVG = (lat: number, lng: number, svgWidth: number, svgHeight: number) => {
    const latMin = -44, latMax = -10;
    const lngMin = 113, lngMax = 154;
    
    const x = ((lng - lngMin) / (lngMax - lngMin)) * svgWidth;
    const y = ((latMax - lat) / (latMax - latMin)) * svgHeight;
    
    return { x, y };
  };


  // Fallback to SVG map if Google Maps fails
  if (error && usesFallback) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Job Locations</h3>
            <p className="text-sm text-muted-foreground">
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
            <div className="relative bg-gradient-to-br from-steel-50 to-white rounded-lg overflow-hidden">
              <div className="p-4 bg-steel-50 border-b border-steel-200">
                <div className="flex items-center gap-2 text-steel-800">
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
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke={MAP_THEME.fallback.grid} strokeWidth="1" opacity="0.5"/>
                  </pattern>
                  <radialGradient id="mapGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={MAP_THEME.fallback.gradientStart} />
                    <stop offset="100%" stopColor={MAP_THEME.fallback.gradientEnd} />
                  </radialGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#mapGradient)" />
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* Australia outline */}
                <path 
                  d="M150 150 Q200 100 350 120 Q450 130 550 160 Q650 180 700 250 Q720 350 680 450 Q600 500 500 480 Q400 460 300 440 Q200 400 150 300 Z" 
                  fill="none" 
                  stroke={MAP_THEME.fallback.landStroke} 
                  strokeWidth="2" 
                  opacity="0.6"
                />
                
                {/* Center location marker */}
                <circle
                  cx={coordsToSVG(centerLocation.lat, centerLocation.lng, 800, 600).x}
                  cy={coordsToSVG(centerLocation.lat, centerLocation.lng, 800, 600).y}
                  r="8"
                  fill={MAP_THEME.fallback.center}
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
                      fill={MAP_THEME.fallback.job}
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
          <Card className="border-steel-200 bg-steel-50">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{selectedJob.title}</CardTitle>
                  {selectedJob.shopName && (
                    <p className="text-muted-foreground">{selectedJob.shopName}</p>
                  )}
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
              {selectedJob.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{typeof selectedJob.location === 'string' ? selectedJob.location : `${selectedJob.location?.city || "Unknown"}, ${selectedJob.location?.state || ""}`}</span>
                </div>
              )}
              {selectedJob.startTime && selectedJob.endTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedJob.startTime} - {selectedJob.endTime}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>{selectedJob.rate || selectedJob.payRate || 'Rate TBD'}</span>
              </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {(selectedJob.skillsRequired || []).map((skill: string) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>

              <p className="text-muted-foreground text-sm break-words overflow-hidden">{selectedJob.description}</p>
              
              <div className="flex gap-2 pt-2">
                <Button size="sm" data-testid="button-apply-job">Apply Now</Button>
                <Button variant="outline" size="sm" data-testid="button-save-job">Save Job</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Combined Map Card with Header */}
      <Card className="relative flex-1 overflow-hidden flex flex-col border-border">
        <CardHeader className="px-4 py-3 border-b bg-muted/10">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Job Locations</h3>
              <p className="text-sm text-muted-foreground">
                Showing {jobs.filter(job => {
                  const jobLocation = getJobCoordinates(job);
                  const distance = calculateDistance(centerLocation, jobLocation);
                  return distance <= radius;
                }).length} jobs within {radius}km of {searchLocation}
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 flex-1 relative min-h-[500px]">
          <div className="absolute inset-0 bg-muted">
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading map...</p>
                </div>
              </div>
            )}
            <div 
              ref={mapRef} 
              className="w-full h-full"
              data-testid="google-map"
            />
          </div>
        </CardContent>
      </Card>

      {/* Selected Job Details */}
      {selectedJob && (
        <Card className="border-steel-200 bg-steel-50">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{selectedJob.title}</CardTitle>
                {selectedJob.shopName && (
                  <p className="text-muted-foreground">{selectedJob.shopName}</p>
                )}
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
              {selectedJob.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{typeof selectedJob.location === 'string' ? selectedJob.location : `${selectedJob.location?.city || "Unknown"}, ${selectedJob.location?.state || ""}`}</span>
                </div>
              )}
              {selectedJob.startTime && selectedJob.endTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedJob.startTime} - {selectedJob.endTime}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>{selectedJob.rate || selectedJob.payRate || 'Rate TBD'}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {(selectedJob.skillsRequired || []).map((skill: string) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>

            <p className="text-muted-foreground text-sm">{selectedJob.description}</p>
            
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