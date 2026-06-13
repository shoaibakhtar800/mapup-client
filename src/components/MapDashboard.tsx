"use client";

import React, { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

// Fix Leaflet's default marker icon issue in SSR
import "leaflet/dist/leaflet.css";

interface Geofence {
  id: string;
  name: string;
  description: string;
  coordinates: [number, number][];
  category: string;
}

interface Vehicle {
  id: string;
  vehicle_number: string;
  driver_name: string;
  vehicle_type: string;
  phone: string;
  status: string;
}

interface VehicleLocation {
  vehicle_id: string;
  vehicle_number: string;
  current_location: {
    latitude: number;
    longitude: number;
    timestamp: string;
  } | null;
  current_geofences: {
    geofence_id: string;
    geofence_name: string;
    category: string;
  }[];
}

interface MapDashboardProps {
  geofences: Geofence[];
  vehicles: Vehicle[];
  vehicleLocations: Record<string, VehicleLocation>;
  selectedVehicleId: string;
  onMapClickForLocation: (lat: number, lng: number) => void;
  isSettingLocation: boolean;
  isDrawingGeofence: boolean;
  drawPoints: [number, number][];
  setDrawPoints: React.Dispatch<React.SetStateAction<[number, number][]>>;
}

// Colors for geofence categories
const categoryColors: Record<string, string> = {
  delivery_zone: "#3b82f6", // blue
  restricted_zone: "#ef4444", // red
  toll_zone: "#8b5cf6", // purple
  customer_area: "#10b981", // green
};

// Custom SVG Icons for Vehicles
const getVehicleIcon = (vehicleType: string, isRestricted: boolean) => {
  const color = isRestricted ? "#ef4444" : "#10b981"; // Red if in restricted, Green if safe/active

  let svgPaths = `
		<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
		<path d="M19 18h2a1 1 0 0 0 1-1v-5.14a1 1 0 0 0-.293-.707l-3.86-3.86a1 1 0 0 0-.707-.293H15"/>
	`;
  if (vehicleType === "car") {
    svgPaths = `<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3C13 6.8 11.8 6 10.5 6H5C3.3 6 2 7.3 2 9v7c0 .6.4 1 1 1h2"/>`;
  }

  return L.divIcon({
    html: `
			<div class="relative flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-md border-2 transition-all duration-300 hover:scale-110" style="border-color: ${color}">
				<span class="absolute -top-1 -right-1 flex h-2 w-2">
					<span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style="background-color: ${color}"></span>
					<span class="relative inline-flex rounded-full h-2 w-2" style="background-color: ${color}"></span>
				</span>
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					${svgPaths}
					<circle cx="7" cy="18" r="2"/>
					<circle cx="17" cy="18" r="2"/>
				</svg>
			</div>
		`,
    className: "custom-div-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

export default function MapDashboard({
  geofences,
  vehicles,
  vehicleLocations,
  selectedVehicleId,
  onMapClickForLocation,
  isSettingLocation,
  isDrawingGeofence,
  drawPoints,
  setDrawPoints,
}: MapDashboardProps) {
  const [mapCenter] = useState<[number, number]>([37.7749, -122.4194]); // SF defaults
  const [mapZoom] = useState<number>(13);

  return (
    <div className="relative w-full h-full min-h-100 overflow-hidden">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapEventsHandler
          isSettingLocation={isSettingLocation}
          selectedVehicleId={selectedVehicleId}
          onMapClickForLocation={onMapClickForLocation}
          isDrawingGeofence={isDrawingGeofence}
          setDrawPoints={setDrawPoints}
        />

        {/* 1. Render Saved Geofences */}
        {geofences.map((geo) => {
          const color = categoryColors[geo.category] || "#3b82f6";
          const isInteractive = !isSettingLocation && !isDrawingGeofence;
          return (
            <Polygon
              key={`${geo.id}_${isInteractive}`}
              positions={geo.coordinates}
              interactive={isInteractive}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.25,
                weight: 2,
                interactive: isInteractive,
              }}
            >
              <Popup>
                <div className="p-1 text-zinc-900 font-sans">
                  <h4 className="font-semibold text-sm m-0 text-zinc-950">
                    {geo.name}
                  </h4>
                  <p className="text-xs text-zinc-500 my-1">
                    {geo.description || "No description"}
                  </p>
                  <span className="inline-block text-[10px] font-medium bg-zinc-100 uppercase tracking-wider px-2 py-0.5 rounded text-zinc-600">
                    {geo.category.replace("_", " ")}
                  </span>
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* 2. Render Vehicle Locations */}
        {Object.values(vehicleLocations).map((loc) => {
          if (!loc.current_location) return null;
          const vehicle = vehicles.find((v) => v.id === loc.vehicle_id);
          const isInRestricted = loc.current_geofences.some(
            (g) => g.category === "restricted_zone",
          );

          return (
            <Marker
              key={loc.vehicle_id}
              position={[
                loc.current_location.latitude,
                loc.current_location.longitude,
              ]}
              icon={getVehicleIcon(
                vehicle?.vehicle_type || "truck",
                isInRestricted,
              )}
            >
              <Popup>
                <div className="p-1 text-zinc-900 font-sans leading-5">
                  <h4 className="font-bold text-sm text-zinc-950 m-0">
                    {vehicle?.vehicle_number || loc.vehicle_number}
                  </h4>
                  <div className="text-xs text-zinc-600 mt-1">
                    <p>
                      <strong>Driver:</strong> {vehicle?.driver_name}
                    </p>
                    <p>
                      <strong>Phone:</strong> {vehicle?.phone}
                    </p>
                    <p>
                      <strong>Type:</strong>{" "}
                      <span className="capitalize">
                        {vehicle?.vehicle_type}
                      </span>
                    </p>
                    <p>
                      <strong>Last Updated:</strong>{" "}
                      {new Date(
                        loc.current_location.timestamp,
                      ).toLocaleTimeString()}
                    </p>
                  </div>

                  {loc.current_geofences.length > 0 && (
                    <div className="mt-2 border-t pt-1">
                      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                        Current Zones:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {loc.current_geofences.map((cg) => {
                          const isRestrictedZone =
                            cg.category === "restricted_zone";
                          return (
                            <span
                              key={cg.geofence_id}
                              className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                isRestrictedZone
                                  ? "bg-red-100 text-red-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {cg.geofence_name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 3. Render Geofence Drawing Progress */}
        {isDrawingGeofence && drawPoints.length > 0 && (
          <>
            <Polyline
              positions={drawPoints}
              pathOptions={{ color: "#ec4899", dashArray: "5, 5", weight: 2 }}
            />
            {drawPoints.map((pt, idx) => (
              <Marker
                key={idx}
                position={pt}
                icon={L.divIcon({
                  html: `<div class="w-3 h-3 rounded-full bg-pink-500 border border-white shadow-md"></div>`,
                  className: "draw-node-icon",
                  iconSize: [12, 12],
                  iconAnchor: [6, 6],
                })}
              />
            ))}
          </>
        )}
      </MapContainer>

      {/* Instruction HUDs */}
      {isSettingLocation && selectedVehicleId && (
        <div className="absolute bottom-4 left-4 bg-zinc-900/90 text-white text-xs px-3 py-2 rounded-lg backdrop-blur-sm shadow-lg pointer-events-none z-1000 border border-zinc-700/50 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Click anywhere on the map to set the new location for the active
          vehicle
        </div>
      )}
      {isDrawingGeofence && (
        <div className="absolute bottom-4 left-4 bg-zinc-900/90 text-white text-xs px-3 py-2 rounded-lg backdrop-blur-sm shadow-lg pointer-events-none z-1000 border border-zinc-700/50 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
            <strong>Drawing Mode Active</strong>
          </div>
          <div className="text-zinc-300 text-[10px]">
            Click to define vertices. Use form buttons to undo, clear, or
            complete.
          </div>
        </div>
      )}
    </div>
  );
}

interface MapEventsHandlerProps {
  isSettingLocation: boolean;
  selectedVehicleId: string;
  onMapClickForLocation: (lat: number, lng: number) => void;
  isDrawingGeofence: boolean;
  setDrawPoints: React.Dispatch<React.SetStateAction<[number, number][]>>;
}

function MapEventsHandler({
  isSettingLocation,
  selectedVehicleId,
  onMapClickForLocation,
  isDrawingGeofence,
  setDrawPoints,
}: MapEventsHandlerProps) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (isSettingLocation && selectedVehicleId) {
        onMapClickForLocation(lat, lng);
      } else if (isDrawingGeofence) {
        setDrawPoints((prev) => [...prev, [lat, lng]]);
      }
    },
  });
  return null;
}
