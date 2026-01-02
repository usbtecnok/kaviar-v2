import React, { useState, useRef } from 'react';
import { TextField, Box, List, ListItem, ListItemText, Paper } from '@mui/material';
import { LoadScript } from '@react-google-maps/api';

const libraries = ['places'];

const AddressAutocomplete = ({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  onPlaceSelect,
  icon 
}) => {
  const [predictions, setPredictions] = useState([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    onChange(inputValue);

    if (inputValue.length > 2 && window.google) {
      if (!autocompleteService.current) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
      }

      autocompleteService.current.getPlacePredictions(
        {
          input: inputValue,
          componentRestrictions: { country: 'br' },
          types: ['address']
        },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            setPredictions(predictions || []);
            setShowPredictions(true);
          }
        }
      );
    } else {
      setPredictions([]);
      setShowPredictions(false);
    }
  };

  const handlePlaceSelect = (prediction) => {
    onChange(prediction.description);
    setShowPredictions(false);
    
    if (onPlaceSelect && window.google) {
      if (!placesService.current) {
        const map = new window.google.maps.Map(document.createElement('div'));
        placesService.current = new window.google.maps.places.PlacesService(map);
      }

      placesService.current.getDetails(
        { placeId: prediction.place_id },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            onPlaceSelect({
              address: prediction.description,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              placeId: prediction.place_id
            });
          }
        }
      );
    }
  };

  return (
    <LoadScript
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
      libraries={libraries}
    >
      <Box position="relative">
        <Box display="flex" alignItems="center" gap={1}>
          {icon}
          <TextField
            fullWidth
            label={label}
            placeholder={placeholder}
            value={value}
            onChange={handleInputChange}
            onFocus={() => value.length > 2 && setShowPredictions(true)}
            onBlur={() => setTimeout(() => setShowPredictions(false), 200)}
          />
        </Box>
        
        {showPredictions && predictions.length > 0 && (
          <Paper
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 1000,
              maxHeight: 200,
              overflow: 'auto'
            }}
          >
            <List dense>
              {predictions.map((prediction) => (
                <ListItem
                  key={prediction.place_id}
                  button
                  onClick={() => handlePlaceSelect(prediction)}
                >
                  <ListItemText
                    primary={prediction.structured_formatting.main_text}
                    secondary={prediction.structured_formatting.secondary_text}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </LoadScript>
  );
};

export default AddressAutocomplete;
