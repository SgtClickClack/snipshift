import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Location from 'expo-location';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

interface LocationContextType {
  location: LocationData | null;
  isLoading: boolean;
  error: string | null;
  requestPermissions: () => Promise<boolean>;
  getCurrentLocation: () => Promise<LocationData | null>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      setError('Failed to request location permissions');
      return false;
    }
  };

  const getCurrentLocation = async (): Promise<LocationData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setError('Location permission denied');
        setIsLoading(false);
        return null;
      }

      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
        accuracy: locationResult.coords.accuracy,
        timestamp: locationResult.timestamp,
      };

      setLocation(locationData);
      setIsLoading(false);
      return locationData;
    } catch (error) {
      console.error('Error getting current location:', error);
      setError('Failed to get current location');
      setIsLoading(false);
      return null;
    }
  };

  // Auto-get location on mount if permissions are granted
  useEffect(() => {
    const initLocation = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        getCurrentLocation();
      }
    };

    initLocation();
  }, []);

  const value: LocationContextType = {
    location,
    isLoading,
    error,
    requestPermissions,
    getCurrentLocation,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
