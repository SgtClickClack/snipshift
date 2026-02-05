import React, { useCallback, useEffect, useRef, useState } from 'react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { Loader2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import {
  Command,
  CommandGroup,
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

/** Typed shape for a single suggestion (new API stores placePrediction for toPlace()). */
interface SuggestionItem {
  place_id: string;
  description: string;
  placePrediction?: google.maps.places.PlacePrediction;
}

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (location: { lat: number; lng: number; address: string; city?: string; state?: string }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** When false, Google Maps script is not loaded (e.g. until auth handshake is complete). Default true. */
  readyToLoadMaps?: boolean;
  /** Called when Places API returns 403 (forbidden); parent can set loadError to show Manual Entry fallback. */
  onPlacesApiError?: () => void;
  'data-testid'?: string;
}

const DEBOUNCE_MS = 500;

/**
 * Internal autocomplete using the new AutocompleteSuggestion API (Place Autocomplete Data).
 * Used when google.maps.places.AutocompleteSuggestion is available (avoids deprecated AutocompleteService).
 */
function PlacesAutocompleteNew({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  disabled,
  onPlacesApiError,
  'data-testid': dataTestId,
}: LocationInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [open, setOpen] = useState(false);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  /** When true, Places API failed (e.g. 403); stop requesting and show fallback hint. */
  const [suggestionsUnavailable, setSuggestionsUnavailable] = useState(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestRef = useRef<string>('');
  const hasLogged403Ref = useRef(false);

  useEffect(() => {
    if (value !== inputValue) setInputValue(value);
  }, [value]);

  const getSessionToken = useCallback(() => {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
    return sessionTokenRef.current;
  }, []);

  const resetSessionToken = useCallback(() => {
    sessionTokenRef.current = null;
  }, []);

  useEffect(() => {
    if (!inputValue.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    if (suggestionsUnavailable) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const query = inputValue.trim();
      lastRequestRef.current = query;
      setIsSuggestionsLoading(true);
      setSuggestions([]);
      try {
        const request: google.maps.places.AutocompleteRequest = {
          input: query,
          sessionToken: getSessionToken(),
        };
        const { suggestions: raw } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        if (lastRequestRef.current !== query) return;
        const items: SuggestionItem[] = (raw || [])
          .filter((s): s is google.maps.places.AutocompleteSuggestion & { placePrediction: google.maps.places.PlacePrediction } => !!s.placePrediction)
          .map((s) => ({
            place_id: s.placePrediction.placeId ?? '',
            description: s.placePrediction.text?.text ?? '',
            placePrediction: s.placePrediction,
          }))
          .filter((item) => item.description);
        setSuggestions(items);
        setOpen(items.length > 0);
      } catch (err) {
        if (lastRequestRef.current === query) {
          const msg = err instanceof Error ? err.message : String(err);
          const is403 = msg.includes('403') || msg.toLowerCase().includes('forbidden');
          if (is403 && !hasLogged403Ref.current) {
            hasLogged403Ref.current = true;
            logger.warn('LocationInput', 'Places API returned 403. Enable Places API (New) and add this origin to your API key HTTP referrers.');
          } else if (!is403) {
            logger.debug('LocationInput', 'AutocompleteSuggestion fetch failed:', err);
          }
          setSuggestionsUnavailable(true);
          setSuggestions([]);
          if (is403) onPlacesApiError?.();
        }
      } finally {
        if (lastRequestRef.current === query) setIsSuggestionsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, getSessionToken, suggestionsUnavailable, onPlacesApiError]);

  const handleSelect = async (item: SuggestionItem) => {
    const address = item.description;
    setInputValue(address);
    onChange(address);
    setSuggestions([]);
    setOpen(false);

    if (onSelect && item.placePrediction) {
      try {
        const place = item.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['location', 'formattedAddress', 'addressComponents'],
        });
        resetSessionToken();

        const loc = place.location;
        const lat = typeof loc?.lat === 'function' ? loc.lat() : (loc as { lat: number })?.lat ?? 0;
        const lng = typeof loc?.lng === 'function' ? loc.lng() : loc?.lng ?? 0;
        const formattedAddress = (place as { formattedAddress?: string }).formattedAddress ?? address;
        const components = (place as { addressComponents?: Array<{ longText?: string; types: string[] }> }).addressComponents ?? [];
        let city: string | undefined;
        let state: string | undefined;
        for (const c of components) {
          const types = c.types ?? [];
          if (types.includes('locality') || types.includes('administrative_area_level_2')) city = (c as { longText?: string }).longText ?? (c as { long_name?: string }).long_name;
          if (types.includes('administrative_area_level_1')) state = (c as { longText?: string }).longText ?? (c as { long_name?: string }).long_name;
        }
        onSelect({ lat, lng, address: formattedAddress, city, state });
      } catch (error) {
        logger.debug('LocationInput', 'Place fetchFields failed (selection kept):', error);
        resetSessionToken();
      }
    } else {
      resetSessionToken();
    }
  };

  return (
    <Popover open={open && suggestions.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full space-y-1">
          <div className="relative">
            <Input
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                onChange(e.target.value);
                if (e.target.value) setOpen(true);
              }}
              disabled={disabled}
              placeholder={placeholder}
              className={cn('pr-10 focus-visible:ring-brand-neon focus-visible:border-brand-neon', className)}
              autoComplete="off"
              data-testid={dataTestId}
              aria-describedby={suggestionsUnavailable ? 'location-suggestions-unavailable' : undefined}
            />
            {isSuggestionsLoading ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
            ) : (
              <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden />
            )}
          </div>
          {suggestionsUnavailable && (
            <p id="location-suggestions-unavailable" className="text-xs text-amber-200/90">
              Suggestions unavailable; you can still type your full address.
            </p>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-full max-w-xs border-zinc-700 bg-zinc-900 p-0 z-[100]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        data-testid="location-suggestions"
      >
        <Command shouldFilter={false} className="bg-zinc-900 text-white">
          <CommandList className="bg-zinc-900">
            <CommandGroup heading="Suggestions" className="text-white">
              {suggestions.map((item) => (
                <CommandItem
                  key={item.place_id}
                  value={item.description}
                  onSelect={() => handleSelect(item)}
                  className="text-white hover:bg-brand-neon/20 hover:text-brand-neon focus:bg-brand-neon/20 focus:text-brand-neon data-[selected=true]:bg-brand-neon/20 data-[selected=true]:text-brand-neon"
                >
                  <MapPin className="mr-2 h-4 w-4 shrink-0 text-brand-neon" />
                  {item.description}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Legacy autocomplete using use-places-autocomplete (AutocompleteService).
 * Used when AutocompleteSuggestion is not available; shows loading spinner while suggestions are requested.
 */
const PlacesAutocompleteLegacy = ({
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
    requestOptions: {},
    debounce: DEBOUNCE_MS,
    defaultValue: value,
    initOnMount: true,
  });

  const [open, setOpen] = useState(false);
  const isSuggestionsLoading = status === 'REQUEST' || (!ready && !!value);

  useEffect(() => {
    if (value !== inputValue) setValue(value, false);
  }, [value, setValue]);

  const handleSelect = async (address: string) => {
    setValue(address, false);
    clearSuggestions();
    onChange(address);
    setOpen(false);

    if (onSelect) {
      try {
        const results = await getGeocode({ address });
        const { lat, lng } = await getLatLng(results[0]);
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
              if (e.target.value) setOpen(true);
            }}
            disabled={disabled}
            placeholder={placeholder}
            className={cn('pr-10 focus-visible:ring-brand-neon focus-visible:border-brand-neon', className)}
            autoComplete="off"
            data-testid={dataTestId}
          />
          {isSuggestionsLoading ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
          ) : (
            <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-full max-w-xs border-zinc-700 bg-zinc-900 p-0 z-[100]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        data-testid="location-suggestions"
      >
        <Command shouldFilter={false} className="bg-zinc-900 text-white">
          <CommandList className="bg-zinc-900">
            {status === 'OK' && (
              <CommandGroup heading="Suggestions" className="text-white">
                {data.map(({ place_id, description }) => (
                  <CommandItem
                    key={place_id}
                    value={description}
                    onSelect={() => {
                      const original = data.find((d) => d.description.toLowerCase() === description.toLowerCase());
                      handleSelect(original ? original.description : description);
                    }}
                    className="text-white hover:bg-brand-neon/20 hover:text-brand-neon focus:bg-brand-neon/20 focus:text-brand-neon data-[selected=true]:bg-brand-neon/20 data-[selected=true]:text-brand-neon"
                  >
                    <MapPin className="mr-2 h-4 w-4 shrink-0 text-brand-neon" />
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
  const { readyToLoadMaps = true, onPlacesApiError: onPlacesApiErrorProp } = props;
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [useNewApi, setUseNewApi] = useState<boolean | null>(null);

  const handlePlacesApiError = useCallback(() => {
    setLoadError('Location suggestions unavailable');
  }, []);

  useEffect(() => {
    if (!readyToLoadMaps) return;

    let cancelled = false;
    const handleLoad = async () => {
      try {
        const google = await loadGoogleMaps();
        if (cancelled) return;
        const places = await google.maps.importLibrary('places') as { AutocompleteSuggestion?: unknown };
        if (cancelled) return;
        setUseNewApi(Boolean(places?.AutocompleteSuggestion));
        setIsScriptLoaded(true);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        const isRefererError =
          msg.includes('RefererNotAllowedMapError') ||
          msg.includes('MAP_REFERER_BLOCKED') ||
          msg.toLowerCase().includes('referer') ||
          (err as { name?: string })?.name === 'RefererNotAllowedMapError';
        if (isRefererError) {
          logger.warn('LocationInput', 'Maps API key referer restricted; showing plain input.');
        } else {
          logger.error('LocationInput', 'Failed to load Google Maps API', err);
        }
        setLoadError('Failed to load location services');
      }
    };
    handleLoad();

    return () => {
      cancelled = true;
    };
  }, [readyToLoadMaps]);

  if (loadError) {
    return (
      <div className="relative w-full space-y-1">
        <Input
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder ?? 'Type your address (e.g. city or street)'}
          className={cn(
            'pr-10 border-amber-500/50 bg-amber-950/20 focus-visible:ring-amber-500 focus-visible:border-amber-500',
            props.className
          )}
          disabled={props.disabled}
          data-testid={props['data-testid']}
          aria-describedby="location-fallback-hint"
        />
        <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500/80 pointer-events-none" aria-hidden />
        <p
          id="location-fallback-hint"
          className="text-xs text-amber-200/90"
        >
          You can still type your address here if suggestions aren&apos;t available.
        </p>
      </div>
    );
  }

  if (!readyToLoadMaps || !isScriptLoaded) {
    return (
      <Input
        disabled
        placeholder={readyToLoadMaps ? 'Loading location services...' : props.placeholder}
        className={props.className}
        data-testid={props['data-testid']}
      />
    );
  }

  if (useNewApi === true) {
    return <PlacesAutocompleteNew {...props} onPlacesApiError={onPlacesApiErrorProp ?? handlePlacesApiError} />;
  }

  return <PlacesAutocompleteLegacy {...props} />;
}
