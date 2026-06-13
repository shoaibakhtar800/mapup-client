"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Eye,
  MapPin,
  Navigation,
  Phone,
  PlusCircle,
  User,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

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

interface VehicleManagerProps {
  vehicles: Vehicle[];
  vehicleLocations: Record<string, VehicleLocation>;
  isLoading: boolean;
  onRegisterVehicle: (data: {
    vehicle_number: string;
    driver_name: string;
    vehicle_type: string;
    phone: string;
  }) => Promise<void>;
  selectedVehicleId: string;
  setSelectedVehicleId: (id: string) => void;
  isSettingLocation: boolean;
  setIsSettingLocation: (val: boolean) => void;
}

const typeOptions = [
  { label: "Truck", value: "truck" },
  { label: "Car", value: "car" },
  { label: "Van", value: "van" },
  { label: "Motorcycle", value: "motorcycle" },
];

export default function VehicleManager({
  vehicles,
  vehicleLocations,
  isLoading,
  onRegisterVehicle,
  selectedVehicleId,
  setSelectedVehicleId,
  isSettingLocation,
  setIsSettingLocation,
}: VehicleManagerProps) {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [vehicleType, setVehicleType] = useState("truck");
  const [phone, setPhone] = useState("");

  const [isSubmittingReg, setIsSubmittingReg] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleNumber.trim()) return toast.error("Vehicle number is required");
    if (!driverName.trim()) return toast.error("Driver name is required");
    if (!phone.trim()) return toast.error("Driver contact phone is required");

    setIsSubmittingReg(true);
    try {
      await onRegisterVehicle({
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        driver_name: driverName.trim(),
        vehicle_type: vehicleType,
        phone: phone.trim(),
      });
      setVehicleNumber("");
      setDriverName("");
      setPhone("");
      toast.success("Vehicle registered successfully!");
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const activeLocation = selectedVehicleId
    ? vehicleLocations[selectedVehicleId]
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Register Vehicle Form */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50">
            <PlusCircle className="w-5 h-5 text-indigo-500" />
            Register Vehicle
          </CardTitle>
          <CardDescription>
            Enroll a new vehicle in the tracking network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="veh-num">Vehicle Number</Label>
              <Input
                id="veh-num"
                placeholder="e.g., KA-01-AB-1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="driver-name">Driver Name</Label>
              <Input
                id="driver-name"
                placeholder="John Doe"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="veh-type">Type</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                  <SelectTrigger id="veh-type">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="veh-phone">Driver Phone</Label>
                <Input
                  id="veh-phone"
                  placeholder="+1234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md flex items-center justify-center gap-2 mt-4"
              disabled={isSubmittingReg}
            >
              <CheckCircle2 className="w-4 h-4" />
              Register Vehicle
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Vehicles List */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-950 dark:text-zinc-50">
            Registered Fleet
          </CardTitle>
          <CardDescription>
            Click a vehicle to select it for tracking or location updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center text-zinc-400">
              Loading vehicles...
            </div>
          ) : vehicles.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 italic border border-dashed rounded-lg border-zinc-200 dark:border-zinc-800">
              No vehicles registered. Set up your fleet first!
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {vehicles.map((v) => {
                const isSelected = v.id === selectedVehicleId;
                const loc = vehicleLocations[v.id];
                const isRestricted = loc?.current_geofences.some(
                  (g) => g.category === "restricted_zone",
                );

                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      setSelectedVehicleId(v.id);
                      setIsSettingLocation(false);
                    }}
                    className={`group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "bg-indigo-50 border-indigo-300 dark:bg-indigo-950/25 dark:border-indigo-800"
                        : "bg-zinc-50/50 border-zinc-150 dark:bg-zinc-900/35 dark:border-zinc-800 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/70"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                          {v.vehicle_number}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase tracking-wider px-1.5 py-0 border font-medium"
                        >
                          {v.vehicle_type}
                        </Badge>
                        {isRestricted && (
                          <Badge className="text-[9px] bg-red-500 hover:bg-red-600 text-white border-0 font-medium">
                            Restricted
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> {v.driver_name} &bull;{" "}
                        <Phone className="w-3 h-3" /> {v.phone}
                      </p>
                    </div>
                    <Eye
                      className={`w-4 h-4 transition-opacity ${isSelected ? "opacity-100 text-indigo-500" : "opacity-0 group-hover:opacity-60 text-zinc-400"}`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Tracking / Location Update Panel */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50">
            <Navigation className="w-5 h-5 text-indigo-500" />
            Location & Tracking
          </CardTitle>
          <CardDescription>
            Update vehicle coordinates or review live positions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedVehicleId ? (
            <div className="py-16 text-center text-zinc-400 italic">
              Select a vehicle from the fleet list to begin tracking
            </div>
          ) : (
            <div className="space-y-5">
              {/* Current status display */}
              <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-800/80 p-3.5 rounded-lg space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Active: {selectedVehicle?.vehicle_number}
                </h4>
                {activeLocation?.current_location ? (
                  <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      Latitude:{" "}
                      <span className="font-mono text-zinc-800 dark:text-zinc-200">
                        {activeLocation.current_location.latitude.toFixed(5)}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      Longitude:{" "}
                      <span className="font-mono text-zinc-800 dark:text-zinc-200">
                        {activeLocation.current_location.longitude.toFixed(5)}
                      </span>
                    </p>
                    <p className="text-[10px] text-zinc-400 italic">
                      Updated:{" "}
                      {new Date(
                        activeLocation.current_location.timestamp,
                      ).toLocaleString()}
                    </p>
                    {activeLocation.current_geofences.length > 0 && (
                      <div className="pt-2 border-t mt-2">
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                          Inside Zones:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {activeLocation.current_geofences.map((g) => (
                            <Badge
                              key={g.geofence_id}
                              variant="secondary"
                              className={`text-[9px] px-1.5 py-0.5 border ${
                                g.category === "restricted_zone"
                                  ? "bg-red-50 text-red-600 border-red-200/50 dark:bg-red-950/20 dark:text-red-400"
                                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                              }`}
                            >
                              {g.geofence_name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 italic">
                    No location updates recorded yet
                  </p>
                )}
              </div>

              {/* Interactive Location Update */}
              <div className="space-y-3 pt-2">
                <h5 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Update Location
                </h5>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={isSettingLocation ? "default" : "outline"}
                    onClick={() => setIsSettingLocation(!isSettingLocation)}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-xs h-9 ${
                      isSettingLocation
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800"
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {isSettingLocation
                      ? "Active — Click on Map"
                      : "Pick from Map"}
                  </Button>
                </div>
                <p className="text-[11px] text-zinc-500 leading-normal mt-2">
                  {isSettingLocation ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">
                      Scroll up and click anywhere on the map to instantly set
                      the vehicle's position.
                    </span>
                  ) : (
                    "Click the button above then select a coordinate on the map to instantly update the vehicle's location."
                  )}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
