import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Job } from "@shared/firebase-schema";
import { MapPin, DollarSign, Calendar, X } from "lucide-react";
import { format } from "date-fns";

interface MapViewProps {
  jobs: Job[];
  onJobSelect: (job: Job) => void;
  selectedJob: Job | null;
  centerLocation: { lat: number; lng: number };
  radius: number;
  searchLocation: string;
}

interface JobMarker {
  id: string;
  x: number;
  y: number;
  job: Job;
}

export default function MapView({ 
  jobs, 
  onJobSelect, 
  selectedJob, 
  centerLocation, 
  radius,
  searchLocation 
}: MapViewProps) {
  const [markers, setMarkers] = useState<JobMarker[]>([]);
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Mock coordinates for demonstration - in real app, these would come from geocoding
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
    
    const cityName = job.location.city;
    const baseCoords = locations[cityName] || locations["Sydney"];
    
    // Add some random offset for variety within the city
    const offset = 0.05; // ~5km variance
    return {
      lat: baseCoords.lat + (Math.random() - 0.5) * offset,
      lng: baseCoords.lng + (Math.random() - 0.5) * offset
    };
  };

  // Convert lat/lng to SVG coordinates
  const coordsToSVG = (lat: number, lng: number, svgWidth: number, svgHeight: number) => {
    // Australia bounds: lat -44 to -10, lng 113 to 154
    const latMin = -44, latMax = -10;
    const lngMin = 113, lngMax = 154;
    
    const x = ((lng - lngMin) / (lngMax - lngMin)) * svgWidth;
    const y = ((latMax - lat) / (latMax - latMin)) * svgHeight; // Flip Y axis
    
    return { x, y };
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    if (!svgRef.current) return;
    
    const svgWidth = 800;
    const svgHeight = 600;
    
    const newMarkers: JobMarker[] = jobs
      .map(job => {
        const coords = getMockCoordinates(job);
        const distance = calculateDistance(
          centerLocation.lat, centerLocation.lng,
          coords.lat, coords.lng
        );
        
        // Only show jobs within radius
        if (distance <= radius) {
          const svgCoords = coordsToSVG(coords.lat, coords.lng, svgWidth, svgHeight);
          return {
            id: job.id,
            x: svgCoords.x,
            y: svgCoords.y,
            job
          };
        }
        return null;
      })
      .filter(Boolean) as JobMarker[];
    
    setMarkers(newMarkers);
  }, [jobs, centerLocation, radius]);

  const handleMarkerClick = (marker: JobMarker) => {
    onJobSelect(marker.job);
  };

  return (
    <div className="relative">
      {/* Travel Mode Indicator */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 text-blue-800">
          <MapPin className="h-5 w-5" />
          <span className="font-medium">Travel Mode Active</span>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {searchLocation || "Current Location"}
          </Badge>
          <Badge variant="outline" className="text-blue-700">
            {radius}km radius
          </Badge>
        </div>
        <p className="text-sm text-blue-600 mt-1">
          Showing {markers.length} job opportunities in your search area
        </p>
      </div>

      {/* Map Container */}
      <Card className="relative">
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-br from-blue-50 to-green-50 rounded-lg overflow-hidden">
            <svg
              ref={svgRef}
              width="100%"
              height="600"
              viewBox="0 0 800 600"
              className="border rounded-lg"
              data-testid="job-map"
            >
              {/* Background with map-like appearance */}
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
              
              {/* Australia outline (simplified) */}
              <path 
                d="M150 150 Q200 100 350 120 Q450 130 550 160 Q650 180 700 250 Q720 350 680 450 Q600 500 500 480 Q400 460 300 440 Q200 400 150 300 Z" 
                fill="none" 
                stroke="#94a3b8" 
                strokeWidth="2" 
                opacity="0.6"
              />
              
              {/* Center location indicator */}
              <circle
                cx={coordsToSVG(centerLocation.lat, centerLocation.lng, 800, 600).x}
                cy={coordsToSVG(centerLocation.lat, centerLocation.lng, 800, 600).y}
                r="8"
                fill="#3b82f6"
                stroke="#ffffff"
                strokeWidth="3"
                data-testid="center-location-marker"
              />
              
              {/* Radius circle */}
              <circle
                cx={coordsToSVG(centerLocation.lat, centerLocation.lng, 800, 600).x}
                cy={coordsToSVG(centerLocation.lat, centerLocation.lng, 800, 600).y}
                r={radius * 2} // Scaled for visualization
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.5"
              />

              {/* Job markers */}
              {markers.map((marker) => (
                <g 
                  key={marker.id}
                  onClick={() => handleMarkerClick(marker)}
                  onMouseEnter={() => setHoveredMarker(marker.id)}
                  onMouseLeave={() => setHoveredMarker(null)}
                  className="cursor-pointer"
                >
                  {/* Expanded touch target */}
                  <circle
                    cx={marker.x}
                    cy={marker.y}
                    r="20"
                    fill="transparent"
                  />
                  {/* Visual marker */}
                  <circle
                    cx={marker.x}
                    cy={marker.y}
                    r={hoveredMarker === marker.id ? "12" : "8"}
                    fill={selectedJob?.id === marker.id ? "hsl(var(--destructive))" : "hsl(var(--success))"}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-all duration-200"
                    data-testid={`job-marker-${marker.id}`}
                  />
                  <text
                    x={marker.x}
                    y={marker.y + 25}
                    textAnchor="middle"
                    className="text-xs font-medium fill-steel-700 pointer-events-none"
                    opacity={hoveredMarker === marker.id ? 1 : 0.7}
                  >
                    ${marker.job.payRate}
                  </text>
                </g>
              ))}
            </svg>

            {/* Job details popup */}
            {selectedJob && (
              <div className="absolute top-4 right-4 w-80 z-elevated">
                <Card className="shadow-lg border-2 border-primary">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-lg" data-testid="selected-job-title">
                        {selectedJob.title}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onJobSelect(null as any)}
                        data-testid="close-job-details"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center">
                        <MapPin className="mr-2 h-4 w-4" />
                        <span>{selectedJob.location.city}, {selectedJob.location.state}</span>
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="mr-2 h-4 w-4" />
                        <span className="font-medium text-foreground">
                          ${selectedJob.payRate}/{selectedJob.payType}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>{format(new Date(selectedJob.date), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm mb-4 line-clamp-3">
                      {selectedJob.description}
                    </p>
                    
                    {selectedJob.skillsRequired && selectedJob.skillsRequired.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Required Skills:</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedJob.skillsRequired.slice(0, 3).map((skill, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {selectedJob.skillsRequired.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{selectedJob.skillsRequired.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        data-testid="apply-from-map"
                      >
                        Apply Now
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        data-testid="view-details-from-map"
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Map legend */}
            <div className="absolute bottom-4 left-4 bg-white dark:bg-steel-900 rounded-lg p-3 shadow-lg border">
              <h4 className="text-sm font-medium mb-2">Legend</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
                  <span>Your Location</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-success border-2 border-white"></div>
                  <span>Available Job</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-destructive border-2 border-white"></div>
                  <span>Selected Job</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}