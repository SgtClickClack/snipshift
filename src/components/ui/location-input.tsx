import React, { useEffect, useState } from 'react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { loadGoogleMaps } from '@/lib/google-maps';
import { Input } from '@/components/ui/input';

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (location: { lat: number; lng: number; address: string; city?: string; state?: string }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  'data-testid'?: string;
}

const PlacesAutocompleteInternal = ({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  disabled,
  'data-testid': dataTestId,
}: LocationInputProps) => {
  const {
    ready,
    value: inputValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      /* Define search scope here */
    },
    debounce: 300,
    defaultValue: value,
    initOnMount: true,
  });

  const [open, setOpen] = useState(false);

  // Sync with parent value if it changes externally
  useEffect(() => {
    if (value !== inputValue) {
      setValue(value, false);
    }
  }, [value, setValue]); // Removed inputValue from deps to avoid loops if needed, but setValue handles it.

  const handleSelect = async (address: string) => {
    setValue(address, false);
    clearSuggestions();
    onChange(address);
    setOpen(false);

    if (onSelect) {
      try {
        const results = await getGeocode({ address });
        const { lat, lng } = await getLatLng(results[0]);
        
        // Extract city and state from address components
        let city: string | undefined;
        let state: string | undefined;
        
        if (results[0]?.address_components) {
          for (const component of results[0].address_components) {
            if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
              city = component.long_name;
            }
            if (component.types.includes('administrative_area_level_1')) {
              state = component.long_name;
            }
          }
        }
        
        onSelect({ lat, lng, address, city, state });
      } catch (error) {
        logger.debug('LocationInput', 'Places geocode failed (selection kept):', error);
      }
    }
  };

  return (
    <Popover open={open && data.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Input
            value={inputValue}
            onChange={(e) => {
              setValue(e.target.value);
              onChange(e.target.value);
              if (e.target.value) {
                 setOpen(true);
              }
            }}
            disabled={disabled}
            placeholder={placeholder}
            className={cn("pr-10 focus-visible:ring-brand-neon focus-visible:border-brand-neon", className)}
            autoComplete="off"
            data-testid={dataTestId}
          />
          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0 w-full max-w-xs bg-zinc-900 border border-zinc-700 shadow-lg z-[100]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false} className="bg-zinc-900 text-white">
          {/* We hide the command input because we use the trigger input */}
          <CommandList className="bg-zinc-900">
            {status === "OK" && (
              <CommandGroup heading="Suggestions" className="text-white">
                {data.map(({ place_id, description }) => (
                  <CommandItem
                    key={place_id}
                    value={description}
                    onSelect={(currentValue) => {
                      // cmdk might return lowercased value
                      const original = data.find(d => d.description.toLowerCase() === currentValue.toLowerCase());
                      handleSelect(original ? original.description : currentValue);
                    }}
                    className="text-white hover:bg-brand-neon/20 hover:text-brand-neon focus:bg-brand-neon/20 focus:text-brand-neon data-[selected=true]:bg-brand-neon/20 data-[selected=true]:text-brand-neon"
                  >
                    <MapPin className="mr-2 h-4 w-4 text-brand-neon" />
                    {description}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export function LocationInput(props: LocationInputProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadGoogleMaps()
      .then(() => setIsScriptLoaded(true))
      .catch((err) => {
        logger.error('LocationInput', 'Failed to load Google Maps API', err);
        setLoadError("Failed to load location services");
      });
  }, []);

  if (loadError) {
    return (
       <Input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className={props.className}
        disabled={props.disabled}
        data-testid={props['data-testid']}
       />
    )
  }

  if (!isScriptLoaded) {
    return (
      <Input
        disabled
        placeholder="Loading location services..."
        className={props.className}
        data-testid={props['data-testid']}
      />
    );
  }

  return <PlacesAutocompleteInternal {...props} />;
}

