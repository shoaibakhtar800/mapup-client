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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { PlusCircle, MapPin, Undo2, Trash2, CheckCircle2, X } from "lucide-react";

interface Geofence {
  id: string;
  name: string;
  description: string;
  coordinates: [number, number][];
  category: string;
}

interface GeofenceManagerProps {
  geofences: Geofence[];
  isLoading: boolean;
  onCreateGeofence: (data: {
    name: string;
    description: string;
    category: string;
    coordinates: [number, number][];
  }) => Promise<void>;
  isDrawingGeofence: boolean;
  setIsDrawingGeofence: React.Dispatch<React.SetStateAction<boolean>>;
  drawPoints: [number, number][];
  setDrawPoints: React.Dispatch<React.SetStateAction<[number, number][]>>;
}

const categoryOptions = [
  { label: "Delivery Zone", value: "delivery_zone" },
  { label: "Restricted Zone", value: "restricted_zone" },
  { label: "Toll Zone", value: "toll_zone" },
  { label: "Customer Area", value: "customer_area" },
];

export default function GeofenceManager({
  geofences,
  isLoading,
  onCreateGeofence,
  isDrawingGeofence,
  setIsDrawingGeofence,
  drawPoints,
  setDrawPoints,
}: GeofenceManagerProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("delivery_zone");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartDrawing = () => {
    setIsDrawingGeofence(true);
    setDrawPoints([]);
    toast.info(
      "Drawing mode activated! Click on the map to define the polygon boundaries.",
    );
  };

  const handleUndoPoint = () => {
    setDrawPoints((prev) => prev.slice(0, -1));
  };

  const handleClearPoints = () => {
    setDrawPoints([]);
  };

  const handleCancelDrawing = () => {
    setIsDrawingGeofence(false);
    setDrawPoints([]);
    toast.info("Drawing cancelled.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a name for the geofence");
      return;
    }

    if (drawPoints.length < 3) {
      toast.error(
        "Polygon requires at least 3 unique points to define a boundary.",
      );
      return;
    }

    // Geofence specs require first and last coordinates to be identical (closed polygon)
    const closedCoordinates: [number, number][] = [
      ...drawPoints,
      drawPoints[0],
    ];

    setIsSubmitting(true);
    try {
      await onCreateGeofence({
        name,
        description,
        category,
        coordinates: closedCoordinates,
      });
      setName("");
      setDescription("");
      setCategory("delivery_zone");
      setDrawPoints([]);
      setIsDrawingGeofence(false);
      toast.success("Geofence created successfully!");
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to create geofence";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredGeofences = geofences.filter((g) => {
    if (filterCategory === "all") return true;
    return g.category === filterCategory;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Create Geofence Card */}
      <Card className="md:col-span-1 border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50">
            <PlusCircle className="w-5 h-5 text-indigo-500" />
            Create Geofence
          </CardTitle>
          <CardDescription>
            Define a new virtual polygon boundary area
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="geo-name">Name</Label>
              <Input
                id="geo-name"
                placeholder="e.g., Warehouse Hub"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="geo-desc">Description</Label>
              <Textarea
                id="geo-desc"
                placeholder="Optional description of the area"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="geo-cat">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 border-t pt-3 mt-4">
              <Label className="block mb-2 font-medium">
                Boundary coordinates
              </Label>
              {!isDrawingGeofence ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20"
                  onClick={handleStartDrawing}
                >
                  <MapPin className="w-4 h-4 text-indigo-500" />
                  Draw Boundary on Map
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex items-center justify-center gap-1.5 text-xs px-2"
                      onClick={handleUndoPoint}
                      disabled={drawPoints.length === 0}
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      Undo
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="flex items-center justify-center gap-1.5 text-xs px-2"
                      onClick={handleClearPoints}
                      disabled={drawPoints.length === 0}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center justify-center gap-1.5 text-xs px-2"
                      onClick={handleCancelDrawing}
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </Button>
                  </div>
                  <div className="text-[11px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 p-2 rounded max-h-24 overflow-y-auto font-mono text-zinc-500">
                    {drawPoints.length === 0 ? (
                      <span className="text-zinc-400 italic">
                        No points drawn yet
                      </span>
                    ) : (
                      drawPoints.map((pt, i) => (
                        <div key={i}>
                          P{i + 1}: {pt[0].toFixed(5)}, {pt[1].toFixed(5)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md flex items-center justify-center gap-2 mt-6"
              disabled={isSubmitting || drawPoints.length < 3}
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Geofence ({drawPoints.length} points)
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Geofences List */}
      <Card className="md:col-span-2 border-zinc-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-zinc-950 dark:text-zinc-50">
              Active Geofences
            </CardTitle>
            <CardDescription>
              List of all registered boundaries and zones
            </CardDescription>
          </div>
          <div className="w-44">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoryOptions.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-xs"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex flex-col p-3 rounded-lg border border-zinc-150 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/35"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-48" />
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-2.5 w-20" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredGeofences.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 italic border border-dashed rounded-lg border-zinc-200 dark:border-zinc-800">
              No geofences found. Draw your first boundary on the map!
            </div>
          ) : (
            <div className="space-y-3 max-h-90 overflow-y-auto pr-1">
              {filteredGeofences.map((geo) => {
                const catLabels: Record<string, string> = {
                  delivery_zone: "Delivery Zone",
                  restricted_zone: "Restricted Zone",
                  toll_zone: "Toll Zone",
                  customer_area: "Customer Area",
                };
                const catColors: Record<string, string> = {
                  delivery_zone:
                    "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200/50",
                  restricted_zone:
                    "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-200/50",
                  toll_zone:
                    "bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border-purple-200/50",
                  customer_area:
                    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200/50",
                };
                return (
                  <div
                    key={geo.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-zinc-150 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/35 hover:bg-zinc-100/30 dark:hover:bg-zinc-900/60 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                          {geo.name}
                        </h4>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 border font-medium ${catColors[geo.category]}`}
                        >
                          {catLabels[geo.category] || geo.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                        {geo.description || "No description"}
                      </p>
                      <div className="text-[10px] text-zinc-400">
                        ID: <span className="font-mono">{geo.id}</span> &bull;{" "}
                        {geo.coordinates.length - 1} vertices
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
