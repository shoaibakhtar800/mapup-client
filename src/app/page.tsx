"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import AlertConfigurator from "@/components/AlertConfigurator";
import AlertNotificationFeed from "@/components/AlertNotificationFeed";
import GeofenceManager from "@/components/GeofenceManager";
import VehicleManager from "@/components/VehicleManager";
import ViolationHistory from "@/components/ViolationHistory";

import { BellRing, CarFront, History, Landmark, MapIcon } from "lucide-react";

// Dynamically import MapDashboard to avoid Leaflet SSR issues
const MapDashboard = dynamic(() => import("@/components/MapDashboard"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-125 flex items-center justify-center bg-zinc-50 border border-zinc-150 rounded-xl dark:bg-zinc-900 dark:border-zinc-800">
      <div className="text-zinc-400 font-medium animate-pulse">
        Initializing Maps Engine...
      </div>
    </div>
  ),
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

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

interface CreateGeofenceParams {
  name: string;
  description: string;
  coordinates: [number, number][];
  category: string;
}

interface RegisterVehicleParams {
  vehicle_number: string;
  driver_name: string;
  vehicle_type: string;
  phone: string;
}

interface UpdateLocationParams {
  vehicle_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface ConfigureAlertParams {
  geofence_id: string;
  vehicle_id?: string;
  event_type: string;
}

interface WSAlertMessage {
  event_id: string;
  event_type: string;
  timestamp: string;
  vehicle: {
    vehicle_id: string;
    vehicle_number: string;
    driver_name: string;
  };
  geofence: {
    geofence_id: string;
    geofence_name: string;
    category: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
}

export default function Home() {
  const queryClient = useQueryClient();

  // Active tracker selections
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [isSettingLocation, setIsSettingLocation] = useState<boolean>(false);
  const [isDrawingGeofence, setIsDrawingGeofence] = useState<boolean>(false);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);

  // Controlled tab state so we can auto-switch programmatically
  const [activeTab, setActiveTab] = useState<string>("geofences");

  // Cache of current locations for all vehicles
  const [vehicleLocations, setVehicleLocations] = useState<
    Record<string, VehicleLocation>
  >({});

  // Filter states for Violation Logs
  const [violationFilters, setViolationFilters] = useState<{
    vehicle_id?: string;
    geofence_id?: string;
    start_date?: string;
    end_date?: string;
    limit: number;
  }>({
    limit: 50,
  });

  // --- 1. Queries ---
  const { data: geofenceData, isLoading: isGeofencesLoading } = useQuery({
    queryKey: ["geofences"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/geofences`);
      if (!res.ok) throw new Error("Failed to fetch geofences");
      const json = await res.json();
      return json.geofences as Geofence[];
    },
  });

  const { data: vehicleData, isLoading: isVehiclesLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/vehicles`);
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      const json = await res.json();
      return json.vehicles as Vehicle[];
    },
  });

  const { data: alertsData, isLoading: isAlertsLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/alerts`);
      if (!res.ok) throw new Error("Failed to fetch alert rules");
      const json = await res.json();
      return json.alerts || [];
    },
  });

  const {
    data: violationsData,
    isLoading: isViolationsLoading,
    refetch: refetchViolations,
  } = useQuery({
    queryKey: ["violations", violationFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (violationFilters.vehicle_id)
        params.append("vehicle_id", violationFilters.vehicle_id);
      if (violationFilters.geofence_id)
        params.append("geofence_id", violationFilters.geofence_id);
      if (violationFilters.start_date)
        params.append("start_date", violationFilters.start_date);
      if (violationFilters.end_date)
        params.append("end_date", violationFilters.end_date);
      params.append("limit", String(violationFilters.limit));

      const res = await fetch(
        `${API_URL}/violations/history?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Failed to fetch violation logs");
      return await res.json();
    },
  });

  // --- Load locations for all vehicles on startup ---
  useEffect(() => {
    if (vehicleData && vehicleData.length > 0) {
      vehicleData.forEach(async (v) => {
        try {
          const res = await fetch(`${API_URL}/vehicles/location/${v.id}`);
          if (res.ok) {
            const json = await res.json();
            setVehicleLocations((prev) => ({
              ...prev,
              [v.id]: {
                vehicle_id: json.vehicle_id,
                vehicle_number: json.vehicle_number,
                current_location: json.current_location,
                current_geofences: json.current_geofences || [],
              },
            }));
          }
        } catch (err) {
          console.error(`Error loading location for vehicle ${v.id}:`, err);
        }
      });
    }
  }, [vehicleData]);

  // --- 2. Mutations ---
  const createGeofenceMutation = useMutation({
    mutationFn: async (data: CreateGeofenceParams) => {
      const res = await fetch(`${API_URL}/geofences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to create geofence");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geofences"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] }); // Restricted zones auto-create alerts
    },
  });

  const registerVehicleMutation = useMutation({
    mutationFn: async (data: RegisterVehicleParams) => {
      const res = await fetch(`${API_URL}/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to register vehicle");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: async (data: UpdateLocationParams) => {
      const res = await fetch(`${API_URL}/vehicles/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to update location");
      }
      return { res: await res.json(), req: data };
    },
    onSuccess: (data: {
      res: {
        current_geofences: {
          geofence_id: string;
          geofence_name: string;
        }[];
      };
      req: UpdateLocationParams;
    }) => {
      // Update local locations map
      setVehicleLocations((prev) => ({
        ...prev,
        [data.req.vehicle_id]: {
          vehicle_id: data.req.vehicle_id,
          vehicle_number:
            vehicleData?.find((v) => v.id === data.req.vehicle_id)
              ?.vehicle_number || "",
          current_location: {
            latitude: data.req.latitude,
            longitude: data.req.longitude,
            timestamp: data.req.timestamp,
          },
          current_geofences:
            data.res.current_geofences.map((cg) => ({
              geofence_id: cg.geofence_id,
              geofence_name: cg.geofence_name,
              category:
                geofenceData?.find((g) => g.id === cg.geofence_id)?.category ||
                "delivery_zone",
            })) || [],
        },
      }));

      // Reset setting state
      setIsSettingLocation(false);

      // Refresh logs
      refetchViolations();
    },
  });

  const configureAlertMutation = useMutation({
    mutationFn: async (data: ConfigureAlertParams) => {
      const res = await fetch(`${API_URL}/alerts/configure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to configure alert");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  // --- 3. Interaction Handlers ---
  const handleMapClickForLocation = async (lat: number, lng: number) => {
    if (!selectedVehicleId) return;
    const loadingToast = toast.loading("Updating vehicle location...");
    try {
      await updateLocationMutation.mutateAsync({
        vehicle_id: selectedVehicleId,
        latitude: lat,
        longitude: lng,
        timestamp: new Date().toISOString(),
      });
      toast.dismiss(loadingToast);
      toast.success("Vehicle location updated on map successfully!");
      // Auto-switch to Fleet tab so user sees the updated position info
      setActiveTab("vehicles");
    } catch (err: unknown) {
      toast.dismiss(loadingToast);
      const errMsg =
        err instanceof Error ? err.message : "Failed to update location";
      toast.error(errMsg);
    }
  };

  // Triggered when a live WS event is received
  const handleWSNotification = (wsMsg: WSAlertMessage) => {
    // Live update the map markers directly
    setVehicleLocations((prev) => ({
      ...prev,
      [wsMsg.vehicle.vehicle_id]: {
        vehicle_id: wsMsg.vehicle.vehicle_id,
        vehicle_number: wsMsg.vehicle.vehicle_number,
        current_location: {
          latitude: wsMsg.location.latitude,
          longitude: wsMsg.location.longitude,
          timestamp: wsMsg.timestamp,
        },
        // If entering, ensure it is added. If exiting, make sure it is removed.
        current_geofences:
          wsMsg.event_type === "entry"
            ? [
                ...(
                  prev[wsMsg.vehicle.vehicle_id]?.current_geofences || []
                ).filter((g) => g.geofence_id !== wsMsg.geofence.geofence_id),
                {
                  geofence_id: wsMsg.geofence.geofence_id,
                  geofence_name: wsMsg.geofence.geofence_name,
                  category: wsMsg.geofence.category,
                },
              ]
            : (prev[wsMsg.vehicle.vehicle_id]?.current_geofences || []).filter(
                (g) => g.geofence_id !== wsMsg.geofence.geofence_id,
              ),
      },
    }));

    // Refresh violations list to show new event
    refetchViolations();
  };

  return (
    <div className="flex-1 w-full flex flex-col bg-zinc-50 dark:bg-black font-sans pb-16">
      {/* Top Header */}
      <header className="border-b border-zinc-200 bg-white/80 dark:bg-zinc-950/80 dark:border-zinc-800 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-md shadow-indigo-500/20">
              <MapIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">
                MapUp GeoFence
              </h1>
              <span className="text-[10px] font-medium text-zinc-400 tracking-widest uppercase">
                Control Panel
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex-1 flex flex-col gap-6">
        {/* Top Map + Real-time Alerts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:h-125 items-stretch">
          <div className="lg:col-span-3 h-125 lg:h-full">
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden h-full">
              <CardContent className="p-0 h-full">
                <MapDashboard
                  geofences={geofenceData || []}
                  vehicles={vehicleData || []}
                  vehicleLocations={vehicleLocations}
                  selectedVehicleId={selectedVehicleId}
                  onMapClickForLocation={handleMapClickForLocation}
                  isSettingLocation={isSettingLocation}
                  isDrawingGeofence={isDrawingGeofence}
                  drawPoints={drawPoints}
                  setDrawPoints={setDrawPoints}
                />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1 h-100 lg:h-full">
            <AlertNotificationFeed
              apiUrl={API_URL}
              onNewAlert={handleWSNotification}
            />
          </div>
        </div>

        {/* Bottom Feature Tabs Panel */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-12 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm">
            <TabsTrigger
              value="geofences"
              className="w-full min-w-0 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-md"
            >
              <Landmark className="w-4 h-4 shrink-0" />
              <span className="truncate">Zones</span>
            </TabsTrigger>

            <TabsTrigger
              value="vehicles"
              className="w-full min-w-0 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-md"
            >
              <CarFront className="w-4 h-4 shrink-0" />
              <span className="truncate">Fleet</span>
            </TabsTrigger>

            <TabsTrigger
              value="alerts"
              className="w-full min-w-0 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-md"
            >
              <BellRing className="w-4 h-4 shrink-0" />
              <span className="truncate">Rules</span>
            </TabsTrigger>

            <TabsTrigger
              value="violations"
              className="w-full min-w-0 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-md"
            >
              <History className="w-4 h-4 shrink-0" />
              <span className="truncate">Logs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geofences" className="mt-6">
            <GeofenceManager
              geofences={geofenceData || []}
              isLoading={isGeofencesLoading}
              onCreateGeofence={async (data) => {
                await createGeofenceMutation.mutateAsync(data);
              }}
              isDrawingGeofence={isDrawingGeofence}
              setIsDrawingGeofence={setIsDrawingGeofence}
              drawPoints={drawPoints}
              setDrawPoints={setDrawPoints}
            />
          </TabsContent>

          <TabsContent value="vehicles" className="mt-6">
            <VehicleManager
              vehicles={vehicleData || []}
              vehicleLocations={vehicleLocations}
              isLoading={isVehiclesLoading}
              onRegisterVehicle={async (data) => {
                await registerVehicleMutation.mutateAsync(data);
              }}
              selectedVehicleId={selectedVehicleId}
              setSelectedVehicleId={setSelectedVehicleId}
              isSettingLocation={isSettingLocation}
              setIsSettingLocation={setIsSettingLocation}
            />
          </TabsContent>

          <TabsContent value="alerts" className="mt-6">
            <AlertConfigurator
              geofences={geofenceData || []}
              vehicles={vehicleData || []}
              alerts={alertsData}
              isLoading={isAlertsLoading}
              onConfigureAlert={async (data) => {
                await configureAlertMutation.mutateAsync(data);
              }}
            />
          </TabsContent>

          <TabsContent value="violations" className="mt-6">
            <ViolationHistory
              geofences={geofenceData || []}
              vehicles={vehicleData || []}
              violations={violationsData?.violations || []}
              totalCount={violationsData?.total_count || 0}
              isLoading={isViolationsLoading}
              filters={violationFilters}
              setFilters={setViolationFilters}
              refetch={refetchViolations}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
