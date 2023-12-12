import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { OpenStreetMapProvider, GeoSearchControl } from 'leaflet-geosearch';

import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';

import * as L from "leaflet";
import { func } from 'prop-types';

const LeafletComponent = (props) => {
  const { searchMarkers = [], updateMarker = func } = props;
  const defaultPosition = [12.9389, 80.2612];
  const [position, setPosition] = useState(defaultPosition);
  const [searchControl, setSearchControl] = useState(null);

  const RedMarkerIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const GreenMarkerIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });


  useEffect(() => {
    // Create the search control outside the SearchBox component
    const control = new GeoSearchControl({
      provider: new OpenStreetMapProvider(),
      style: 'bar',
      autoComplete: true,
      autoCompleteDelay: 250,
    });
    setSearchControl(control);

    return () => {
      // No need to remove the control here
    };
  }, []);

  const SearchBox = () => {
    const map = useMap();

    useEffect(() => {
      if (searchControl) {
        map.addControl(searchControl);

        const onSearchLocation = function (e) {
          setPosition([e.location.y, e.location.x]);
          updateMarker([e.location.y, e.location.x]);
        };

        map.on('geosearch/showlocation', onSearchLocation);

        // Cleanup when component unmounts
        return () => {
          map.off('geosearch/showlocation', onSearchLocation);

          if (searchControl && searchControl._container) {
            searchControl._container.remove();
          }
        };
      }
    }, [map, searchControl]);

    return null;
  };

  const handleMarkerDrag = (e) => {
    setPosition([e.target._latlng.lat, e.target._latlng.lng]);
    updateMarker([e.target._latlng.lat, e.target._latlng.lng]);
  };

  return (
    <MapContainer
      center={defaultPosition}
      zoom={10}
      style={{ height: '400px', width: '100%' }}
    >
      <SearchBox />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker
        position={position}
        draggable={true}
        eventHandlers={{ dragend: handleMarkerDrag }}
      >
        <Popup>
          Latitude: {position[0]} <br />
          Longitude: {position[1]}
        </Popup>
      </Marker>
      {
        searchMarkers?.map((marker,index) => {
          return <Marker
            position={[marker.latitude, marker.longitude]}
            draggable={false}
            icon={index==0 ? GreenMarkerIcon : RedMarkerIcon}
          // eventHandlers={{ dragend: handleMarkerDrag }}
          >
            <Popup>
              {marker.shop_name} <br />
              {marker.address}
            </Popup>
          </Marker>
        })
      }
    </MapContainer>
  );
};

export default LeafletComponent;
