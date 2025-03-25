
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search } from 'lucide-react';

interface Location {
  lat: number;
  lng: number;
}

interface GoogleMapPickerProps {
  initialLocation?: Location;
  onSelectLocation: (location: Location) => void;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const GoogleMapPicker: React.FC<GoogleMapPickerProps> = ({ initialLocation, onSelectLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [searchInput, setSearchInput] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(initialLocation || null);

  // Default location (center of map if none provided)
  const defaultLocation = { lat: 37.7749, lng: -122.4194 }; // San Francisco

  useEffect(() => {
    // Create script tag to load Google Maps
    const googleMapScript = document.createElement('script');
    const apiKey = 'AIzaSyAt-mYqJvqHDLKdlN3cZ_3HDN5IJ8J-D4U';
    googleMapScript.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
    googleMapScript.async = true;
    googleMapScript.defer = true;
    
    // Initialize map when script loads
    window.initMap = () => {
      if (mapRef.current) {
        const mapOptions = {
          center: selectedLocation || defaultLocation,
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        };
        
        const newMap = new window.google.maps.Map(mapRef.current, mapOptions);
        setMap(newMap);
        
        // Add marker if we have an initial location
        if (selectedLocation) {
          const newMarker = new window.google.maps.Marker({
            position: selectedLocation,
            map: newMap,
            draggable: true,
            animation: window.google.maps.Animation.DROP
          });
          
          setMarker(newMarker);
          
          // Update location when marker is dragged
          newMarker.addListener('dragend', function() {
            const position = newMarker.getPosition();
            const newLocation = {
              lat: position.lat(),
              lng: position.lng()
            };
            setSelectedLocation(newLocation);
            onSelectLocation(newLocation);
          });
        }
        
        // Add click event to place/move marker
        newMap.addListener('click', (e: any) => {
          const newLocation = {
            lat: e.latLng.lat(),
            lng: e.latLng.lng()
          };
          
          setSelectedLocation(newLocation);
          onSelectLocation(newLocation);
          
          // Remove existing marker if exists
          if (marker) {
            marker.setMap(null);
          }
          
          // Create new marker
          const newMarker = new window.google.maps.Marker({
            position: newLocation,
            map: newMap,
            draggable: true,
            animation: window.google.maps.Animation.DROP
          });
          
          setMarker(newMarker);
          
          // Update location when marker is dragged
          newMarker.addListener('dragend', function() {
            const position = newMarker.getPosition();
            const newLocation = {
              lat: position.lat(),
              lng: position.lng()
            };
            setSelectedLocation(newLocation);
            onSelectLocation(newLocation);
          });
        });
      }
    };
    
    document.head.appendChild(googleMapScript);
    
    return () => {
      // Clean up script tag
      googleMapScript.remove();
      window.initMap = () => {};
    };
  }, []);

  const handleSearch = () => {
    if (!map || !searchInput) return;
    
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: searchInput }, (results: any, status: any) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        const newLocation = {
          lat: location.lat(),
          lng: location.lng()
        };
        
        // Move map to new location
        map.setCenter(newLocation);
        
        // Remove existing marker if exists
        if (marker) {
          marker.setMap(null);
        }
        
        // Create new marker
        const newMarker = new window.google.maps.Marker({
          position: newLocation,
          map: map,
          draggable: true,
          animation: window.google.maps.Animation.DROP
        });
        
        setMarker(newMarker);
        setSelectedLocation(newLocation);
        onSelectLocation(newLocation);
        
        // Update location when marker is dragged
        newMarker.addListener('dragend', function() {
          const position = newMarker.getPosition();
          const newLocation = {
            lat: position.lat(),
            lng: position.lng()
          };
          setSelectedLocation(newLocation);
          onSelectLocation(newLocation);
        });
      }
    });
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation && map) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          // Move map to new location
          map.setCenter(newLocation);
          
          // Remove existing marker if exists
          if (marker) {
            marker.setMap(null);
          }
          
          // Create new marker
          const newMarker = new window.google.maps.Marker({
            position: newLocation,
            map: map,
            draggable: true,
            animation: window.google.maps.Animation.DROP
          });
          
          setMarker(newMarker);
          setSelectedLocation(newLocation);
          onSelectLocation(newLocation);
          
          // Update location when marker is dragged
          newMarker.addListener('dragend', function() {
            const position = newMarker.getPosition();
            const newLocation = {
              lat: position.lat(),
              lng: position.lng()
            };
            setSelectedLocation(newLocation);
            onSelectLocation(newLocation);
          });
        },
        () => {
          console.error('Error getting current location');
        }
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Search for address..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button type="button" onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
        <Button type="button" variant="outline" onClick={handleGetCurrentLocation}>
          <MapPin className="h-4 w-4 mr-2" />
          Current Location
        </Button>
      </div>
      
      <div 
        ref={mapRef} 
        className="h-[400px] w-full rounded-md border border-gray-200"
      ></div>
      
      {selectedLocation && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="latitude">Latitude</Label>
            <Input 
              id="latitude" 
              value={selectedLocation.lat.toFixed(6)} 
              readOnly 
            />
          </div>
          <div>
            <Label htmlFor="longitude">Longitude</Label>
            <Input 
              id="longitude" 
              value={selectedLocation.lng.toFixed(6)} 
              readOnly 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMapPicker;
