import React, { useEffect, useState } from 'react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  onSelect?: (location: { lat: number; lng: number; address: string }) => void;
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
        onSelect({ lat, lng, address });
      } catch (error) {
        console.error('Error: ', error);
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
            className={cn("pr-10", className)}
            autoComplete="off"
            data-testid={dataTestId}
          />
          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0 w-full max-w-[300px] bg-card border border-border shadow-lg z-[100]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          {/* We hide the command input because we use the trigger input */}
          <CommandList>
            {status === "OK" && (
              <CommandGroup heading="Suggestions">
                {data.map(({ place_id, description }) => (
                  <CommandItem
                    key={place_id}
                    value={description}
                    onSelect={(currentValue) => {
                      // cmdk might return lowercased value
                      const original = data.find(d => d.description.toLowerCase() === currentValue.toLowerCase());
                      handleSelect(original ? original.description : currentValue);
                    }}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
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
        console.error("Failed to load Google Maps API", err);
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

