"use client";

import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  History,
  Search,
  RefreshCw,
  X,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

interface Geofence {
  id: string;
  name: string;
}

interface Vehicle {
  id: string;
  vehicle_number: string;
}

interface Violation {
  id: string;
  vehicle_id: string;
  vehicle_number: string;
  geofence_id: string;
  geofence_name: string;
  event_type: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface ViolationHistoryProps {
  geofences: Geofence[];
  vehicles: Vehicle[];
  violations: Violation[];
  totalCount: number;
  isLoading: boolean;
  filters: {
    vehicle_id?: string;
    geofence_id?: string;
    start_date?: string;
    end_date?: string;
    limit: number;
  };
  setFilters: React.Dispatch<
    React.SetStateAction<{
      vehicle_id?: string;
      geofence_id?: string;
      start_date?: string;
      end_date?: string;
      limit: number;
    }>
  >;
  refetch: () => void;
}

export default function ViolationHistory({
  geofences,
  vehicles,
  violations,
  totalCount,
  isLoading,
  filters,
  setFilters,
  refetch,
}: ViolationHistoryProps) {
  // Local temp filter states
  const [vehId, setVehId] = useState(filters.vehicle_id || "all");
  const [geoId, setGeoId] = useState(filters.geofence_id || "all");
  const [startD, setStartD] = useState(
    filters.start_date ? filters.start_date.split("T")[0] : "",
  );
  const [endD, setEndD] = useState(
    filters.end_date ? filters.end_date.split("T")[0] : "",
  );
  const [limitVal, setLimitVal] = useState(String(filters.limit));

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();

    setFilters({
      vehicle_id: vehId === "all" ? undefined : vehId,
      geofence_id: geoId === "all" ? undefined : geoId,
      start_date: startD ? new Date(startD).toISOString() : undefined,
      end_date: endD
        ? new Date(endD + "T23:59:59.999Z").toISOString()
        : undefined,
      limit: parseInt(limitVal, 10) || 50,
    });
    toast.success("Filters applied successfully");
  };

  const handleResetFilters = () => {
    setVehId("all");
    setGeoId("all");
    setStartD("");
    setEndD("");
    setLimitVal("50");

    setFilters({
      limit: 50,
    });
    toast.info("Filters reset to default");
  };

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50">
            <Search className="w-5 h-5 text-indigo-500" />
            Filter Violation Logs
          </CardTitle>
          <CardDescription>
            Refine history search by vehicle, zone, date range, or output limit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleApplyFilters}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end"
          >
            <div className="space-y-1.5">
              <Label htmlFor="hist-veh">Vehicle</Label>
              <Select value={vehId} onValueChange={setVehId}>
                <SelectTrigger id="hist-veh">
                  <SelectValue placeholder="All Vehicles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vehicles</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.vehicle_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hist-geo">Geofence Zone</Label>
              <Select value={geoId} onValueChange={setGeoId}>
                <SelectTrigger id="hist-geo">
                  <SelectValue placeholder="All Zones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  {geofences.map((geo) => (
                    <SelectItem key={geo.id} value={geo.id}>
                      {geo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hist-start">Start Date</Label>
              <Input
                id="hist-start"
                type="date"
                value={startD}
                onChange={(e) => setStartD(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hist-end">End Date</Label>
              <Input
                id="hist-end"
                type="date"
                value={endD}
                onChange={(e) => setEndD(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="hist-limit">Max Records</Label>
                <Select value={limitVal} onValueChange={setLimitVal}>
                  <SelectTrigger id="hist-limit">
                    <SelectValue placeholder="50" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="250">250</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-1">
                <Button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-0 flex items-center justify-center"
                >
                  Search
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetFilters}
                  className="h-9 px-2 hover:bg-zinc-100"
                  title="Reset filters"
                >
                  <X className="w-4 h-4 text-zinc-500" />
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Violation Log Listing */}
      <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50">
              <History className="w-5 h-5 text-indigo-500" />
              Violation Events Log
            </CardTitle>
            <CardDescription>
              List of recorded geofence crossings ({totalCount} total matches)
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={refetch}
            className="h-8 w-8 hover:bg-zinc-50"
            title="Reload list"
          >
            <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="overflow-x-auto rounded-lg border border-zinc-150 dark:border-zinc-800">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-150 dark:border-zinc-800">
                    {["Event ID", "Vehicle", "Geofence Area", "Crossing", "Coordinates", "Timestamp"].map((h) => (
                      <th key={h} className="p-3 text-zinc-400 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                      <td className="p-3"><Skeleton className="h-3 w-20" /></td>
                      <td className="p-3"><Skeleton className="h-3.5 w-24" /></td>
                      <td className="p-3"><Skeleton className="h-3 w-28" /></td>
                      <td className="p-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="p-3"><Skeleton className="h-3 w-32" /></td>
                      <td className="p-3"><Skeleton className="h-3 w-28" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : violations.length === 0 ? (
            <div className="py-20 text-center text-zinc-400 italic border border-dashed rounded-lg border-zinc-200 dark:border-zinc-800">
              No crossing events recorded yet matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-150 dark:border-zinc-800">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-150 dark:border-zinc-800 font-semibold text-zinc-600">
                    <th className="p-3">Event ID</th>
                    <th className="p-3">Vehicle</th>
                    <th className="p-3">Geofence Area</th>
                    <th className="p-3">Crossing</th>
                    <th className="p-3">Coordinates</th>
                    <th className="p-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                  {violations.map((v) => {
                    const isEntry = v.event_type === "entry";
                    return (
                      <tr
                        key={v.id}
                        className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors"
                      >
                        <td className="p-3 font-mono text-[10px] text-zinc-400">
                          {v.id}
                        </td>
                        <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">
                          {v.vehicle_number}
                        </td>
                        <td className="p-3 text-zinc-700 dark:text-zinc-300">
                          {v.geofence_name}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`text-[9px] uppercase tracking-wider px-2 py-0.5 font-medium flex items-center gap-1 w-fit border ${
                              isEntry
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400"
                                : "bg-orange-50 text-orange-700 border-orange-200/50 dark:bg-orange-950/20 dark:text-orange-400"
                            }`}
                          >
                            {isEntry ? (
                              <ShieldCheck className="w-3.5 h-3.5" />
                            ) : (
                              <ShieldAlert className="w-3.5 h-3.5" />
                            )}
                            {v.event_type}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-[10px] text-zinc-500">
                          {v.latitude.toFixed(5)}, {v.longitude.toFixed(5)}
                        </td>
                        <td className="p-3 text-zinc-500">
                          {new Date(v.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
