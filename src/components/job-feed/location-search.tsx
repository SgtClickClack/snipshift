import { useState, useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Navigation, Heart, X, Search } from "lucide-react";
import { geocodeAddress } from "@/lib/google-maps";
import { cn } from "@/lib/utils";

interface LocationSearchProps {
  onLocationChange: (location: string, coordinates: { lat: number; lng: number }) => void;
  onRadiusChange: (radius: number) => void;
  currentLocation: string;
  currentRadius: number;
  favoriteLocations: string[];
  onAddFavorite: (location: string) => void;
  onRemoveFavorite: (location: string) => void;
}

const AUSTRALIAN_CITIES = [
  { name: "Sydney", coordinates: { lat: -33.8688, lng: 151.2093 } },
  { name: "Melbourne", coordinates: { lat: -37.8136, lng: 144.9631 } },
  { name: "Brisbane", coordinates: { lat: -27.4698, lng: 153.0251 } },
  { name: "Perth", coordinates: { lat: -31.9505, lng: 115.8605 } },
  { name: "Adelaide", coordinates: { lat: -34.9285, lng: 138.6007 } },
  { name: "Gold Coast", coordinates: { lat: -28.0167, lng: 153.4000 } },
  { name: "Newcastle", coordinates: { lat: -32.9283, lng: 151.7817 } },
  { name: "Canberra", coordinates: { lat: -35.2809, lng: 149.1300 } },
  { name: "Darwin", coordinates: { lat: -12.4634, lng: 130.8456 } },
  { name: "Hobart", coordinates: { lat: -42.8821, lng: 147.3272 } },
  { name: "Cairns", coordinates: { lat: -16.9186, lng: 145.7781 } },
  { name: "Townsville", coordinates: { lat: -19.2590, lng: 146.8169 } },
  { name: "Geelong", coordinates: { lat: -38.1499, lng: 144.3617 } },
  { name: "Ballarat", coordinates: { lat: -37.5622, lng: 143.8503 } },
  { name: "Bendigo", coordinates: { lat: -36.7570, lng: 144.2794 } }
];

const RADIUS_OPTIONS = [
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 20, label: "20 km" },
  { value: 50, label: "50 km" },
  { value: 100, label: "100 km" },
  { value: 200, label: "200 km" }
];

export default function LocationSearch({
  onLocationChange,
  onRadiusChange,
  currentLocation,
  currentRadius,
  favoriteLocations,
  onAddFavorite,
  onRemoveFavorite
}: LocationSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCities, setFilteredCities] = useState(AUSTRALIAN_CITIES);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (searchQuery) {
      const filtered = AUSTRALIAN_CITIES.filter(city =>
        city.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCities(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredCities(AUSTRALIAN_CITIES);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  const handleLocationSelect = (cityName: string) => {
    const city = AUSTRALIAN_CITIES.find(c => c.name === cityName);
    if (city) {
      onLocationChange(cityName, city.coordinates);
      setSearchQuery("");
      setShowSuggestions(false);
    }
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;

    // First, try to find an exact match in the cities list
    const exactMatch = AUSTRALIAN_CITIES.find(
      c => c.name.toLowerCase() === searchQuery.trim().toLowerCase()
    );

    if (exactMatch) {
      handleLocationSelect(exactMatch.name);
      return;
    }

    // If no exact match, try geocoding the search query
    try {
      const coordinates = await geocodeAddress(searchQuery.trim());
      if (coordinates) {
        onLocationChange(searchQuery.trim(), coordinates);
        setSearchQuery("");
        setShowSuggestions(false);
      } else {
        // If geocoding fails, show suggestions
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      // On error, show suggestions as fallback
      setShowSuggestions(true);
    }
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          // Try to get address name using reverse geocoding
          try {
            // Use reverse geocoding when Google Maps is available
            const address = "Current Location";
            onLocationChange(address || "Current Location", coords);
          } catch {
            onLocationChange("Current Location", coords);
          }
        },
        () => {
          // Fallback to Sydney if geolocation fails
          const fallbackLocation = { lat: -33.8688, lng: 151.2093 };
          onLocationChange("Sydney", fallbackLocation);
        }
      );
    } else {
      // Fallback to Sydney if geolocation not supported
      const fallbackLocation = { lat: -33.8688, lng: 151.2093 };
      onLocationChange("Sydney", fallbackLocation);
    }
  };

  const toggleFavorite = (location: string) => {
    if (favoriteLocations.includes(location)) {
      onRemoveFavorite(location);
    } else {
      onAddFavorite(location);
    }
  };

  const isFavorite = (location: string) => favoriteLocations.includes(location);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          Location & Travel Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Location Button */}
        <div>
          <Button
            onClick={handleCurrentLocation}
            variant="outline"
            className="w-full justify-start"
            data-testid="button-use-current-location"
          >
            <Navigation className="mr-2 h-4 w-4" />
            Use Current Location
          </Button>
        </div>

        {/* Location Search */}
        <div className="relative">
          <Label htmlFor="locationSearch">Search Location</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="locationSearch"
                type="text"
                placeholder="Search for a city or postcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    handleSearchLocation();
                  }
                }}
                className="pl-10"
                data-testid="input-location-search"
              />
            </div>
            <Button
              onClick={handleSearchLocation}
              disabled={!searchQuery.trim()}
              data-testid="button-search-location"
              className="shrink-0"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Location Suggestions */}
          {showSuggestions && filteredCities.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredCities.slice(0, 8).map((city) => (
                <div
                  key={city.name}
                  className="flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer"
                  onClick={() => handleLocationSelect(city.name)}
                  data-testid={`city-suggestion-${city.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{city.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(city.name);
                    }}
                    className="p-1 h-auto"
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        isFavorite(city.name)
                          ? "fill-red-500 text-red-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Radius Selection */}
        <div>
          <Label htmlFor="radiusSelect">Search Radius</Label>
          <Select
            value={currentRadius.toString()}
            onValueChange={(value) => onRadiusChange(parseInt(value))}
          >
            <SelectTrigger data-testid="select-radius">
              <SelectValue placeholder="Select radius" />
            </SelectTrigger>
            <SelectContent>
              {RADIUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current Settings Display */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Current Search Settings</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span data-testid="current-location-display">{currentLocation || "No location selected"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-muted-foreground" />
              <span data-testid="current-radius-display">{currentRadius}km radius</span>
            </div>
          </div>
        </div>

        {/* Favorite Locations */}
        {favoriteLocations.length > 0 && (
          <div>
            <Label className="text-base font-medium mb-3 block">Favorite Travel Destinations</Label>
            <div className="flex flex-wrap gap-2">
              {favoriteLocations.map((location) => (
                <Badge
                  key={location}
                  variant="secondary"
                  className="cursor-pointer hover:bg-muted-foreground/20 pr-1"
                  data-testid={`favorite-location-${location.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <span
                    onClick={() => handleLocationSelect(location)}
                    className="pr-2"
                  >
                    {location}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveFavorite(location)}
                    className="p-0 h-auto hover:bg-destructive hover:text-destructive-foreground rounded-full w-4 h-4"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Quick Location Options */}
        <div>
          <Label className="text-base font-medium mb-3 block">Quick Locations</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast"].map((city) => (
              <div
                key={city}
                className={cn(
                  buttonVariants({ variant: currentLocation === city ? "default" : "outline", size: "sm" }),
                  "w-full flex items-center gap-2 justify-between px-3 py-2 cursor-pointer"
                )}
                onClick={() => handleLocationSelect(city)}
                data-testid={`quick-location-${city.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span className="truncate">{city}</span>
                <div
                  role="button"
                  tabIndex={0}
                  className="p-1 -mr-1 hover:scale-110 transition-transform pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(city);
                  }}
                >
                  <Heart
                    className={`h-3 w-3 flex-shrink-0 ${
                      isFavorite(city)
                        ? "fill-red-500 text-red-500"
                        : "text-muted-foreground"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}