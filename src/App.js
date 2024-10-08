import React from "react";
import { GoogleMap, useLoadScript, Marker, InfoWindow, } from "@react-google-maps/api";

import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";

import {
  Combobox,
  ComboboxInput,
  ComboboxPopover,
  ComboboxList,
  ComboboxOption,
} from "@reach/combobox";

import "@reach/combobox/styles.css";
import mapStyles from "./mapStyles";


const libraries = ["places"];
const mapContainerStyle = {
  width: '100vw',
  height: '100vh',
}
const center = {
  lat: 55.929180,
  lng: 12.308100,
}
const options = {
  styles: mapStyles,
  disableDefaultUI: true,
  zoomControl: true,
}

export default function App() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [markers, setMarkers] = React.useState([]);

  const [selected, setSelected] = React.useState(null);


  const onMapClick = React.useCallback((event) => {
    //console.log(event);
    setMarkers(current => [...current, {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
      time: new Date(),
    }])
  }, []);

  //callback to not use re-renders
  const mapRef = React.useRef();
  const onMapLoad = React.useCallback((map) => {
    mapRef.current = map;
  }, []);


  const panTo = React.useCallback(({lat, lng}) => {
    mapRef.current.panTo({ lat, lng});
    mapRef.current.setZoom(14);
  }, []);


  if (loadError) return "Error loading maps";
  if (!isLoaded) return "Loading maps";


  return (
    <div>
      <h1>Rooms with sensors</h1>

      <Search panTo={panTo} />
      <Locate panTo={panTo} />

      <GoogleMap 
        mapContainerStyle={mapContainerStyle} 
        zoom={8} 
        center={center}
        options={options}
        onClick={onMapClick}
        onLoad={onMapLoad}
      >
        {markers.map((marker) => ( 
          <Marker 
            //key={marker.time.toISOSString()}
            key={`${marker.lat}-${marker.lng}`} 
            position={{ lat: marker.lat, lng: marker.lng}} 
            onClick={() => {
              setSelected(marker);
            }}
          />
        ))}

        {selected ? (
          <InfoWindow 
            position={{ lat: selected.lat, lng: selected.lng }} 
            onCloseClick={() => {
              setSelected(null);
            }}
          >
            <div>
              <h2>Room allocated</h2>
              <p>At location { ("lat:" + selected.lat) } + { ( "lng:" + selected.lng) }</p>
            </div>
          </InfoWindow>) : null}
      </GoogleMap>
    </div>
  );
}


function Locate({ panTo }) {
  return (
    <button 
      className="locate" 
      onClick={() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            //console.log(position);
            panTo({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          }, 
          () => null, 
          options
        );
      }}
    >
      <img src="compass.svg" alt="compass - locate me" />
    </button>
  );
}


function Search({ panTo }) {
  const { 
    ready, 
    value, 
    suggestions: {
       status, 
       data 
    }, 
    setValue, 
    clearSuggestions, 
  } = 
  usePlacesAutocomplete({
    requestOptions: {
      location: { lat: () =>  55.929180, lng: () => 12.308100 },
      radius: 200 * 1000,
    },
  });

  return (
    <div className="search">
      <Combobox 
        onSelect={async (address) => {
          //console.log(address);
          setValue(address, false);
          clearSuggestions();

          try {
            const results = await getGeocode({ address })
            //console.log(results[0]);

            const { lat, lng } = await getLatLng(results[0]);
            //console.log(lat, lng);
            panTo({ lat, lng });

          } catch(error) {
            console.log("error!")
          }
        }}
      >
        <ComboboxInput 
          value={value} 
          onChange={(e) => {
            setValue(e.target.value);
          }}
          disabled={!ready}
          placeholder="Enter an address"
        />
        <ComboboxPopover>
          <ComboboxList>
            { status === "OK" && data.map(({ id, description }) => (
              <ComboboxOption key={id} value={description} />
            ))}
          </ComboboxList>
        </ComboboxPopover>
      </Combobox>
    </div>
  );
}