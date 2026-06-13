'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bell, ShieldAlert, ArrowRightLeft, CheckCircle2 } from 'lucide-react';

interface Geofence {
	id: string;
	name: string;
	category: string;
}

interface Vehicle {
	id: string;
	vehicle_number: string;
	driver_name: string;
}

interface AlertConfig {
	alert_id: string;
	geofence_id: string;
	geofence_name: string;
	vehicle_id: string;
	vehicle_number: string;
	event_type: string;
	status: string;
	created_at: string;
}

interface AlertConfiguratorProps {
	geofences: Geofence[];
	vehicles: Vehicle[];
	alerts: AlertConfig[];
	isLoading: boolean;
	onConfigureAlert: (data: {
		geofence_id: string;
		vehicle_id?: string;
		event_type: string;
	}) => Promise<void>;
}

export default function AlertConfigurator({
	geofences,
	vehicles,
	alerts,
	isLoading,
	onConfigureAlert,
}: AlertConfiguratorProps) {
	const [geoId, setGeoId] = useState('');
	const [vehicleId, setVehicleId] = useState('all');
	const [eventType, setEventType] = useState('entry');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!geoId) {
			toast.error('Please select a geofence');
			return;
		}

		setIsSubmitting(true);
		try {
			await onConfigureAlert({
				geofence_id: geoId,
				vehicle_id: vehicleId === 'all' ? undefined : vehicleId,
				event_type: eventType,
			});
			setGeoId('');
			setVehicleId('all');
			setEventType('entry');
			toast.success('Alert configuration saved successfully!');
		} catch (error: any) {
			toast.error(error.message || 'Configuration failed');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
			{/* Rule Configurator Form */}
			<Card className="md:col-span-1 border-zinc-200 dark:border-zinc-800">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50">
						<Bell className="w-5 h-5 text-indigo-500" />
						Configure Alert Rule
					</CardTitle>
					<CardDescription>
						Define rules to send real-time triggers on entry or exit
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="rule-geo">Target Geofence</Label>
							<Select value={geoId} onValueChange={setGeoId}>
								<SelectTrigger id="rule-geo">
									<SelectValue placeholder="Select Geofence" />
								</SelectTrigger>
								<SelectContent>
									{geofences.map((geo) => (
										<SelectItem key={geo.id} value={geo.id}>
											{geo.name} ({geo.category.replace('_', ' ')})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="rule-veh">Monitored Vehicle</Label>
							<Select value={vehicleId} onValueChange={setVehicleId}>
								<SelectTrigger id="rule-veh">
									<SelectValue placeholder="All Vehicles (Default)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Vehicles (Global rule)</SelectItem>
									{vehicles.map((v) => (
										<SelectItem key={v.id} value={v.id}>
											{v.vehicle_number} - {v.driver_name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="rule-event">Event Type</Label>
							<Select value={eventType} onValueChange={setEventType}>
								<SelectTrigger id="rule-event">
									<SelectValue placeholder="Select Event" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="entry">Entry (Vehicle enters area)</SelectItem>
									<SelectItem value="exit">Exit (Vehicle leaves area)</SelectItem>
									<SelectItem value="both">Both (Enters or leaves area)</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<Button
							type="submit"
							className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md flex items-center justify-center gap-2 mt-4"
							disabled={isSubmitting || !geoId}
						>
							<CheckCircle2 className="w-4 h-4" />
							Create Alert Rule
						</Button>
					</form>
				</CardContent>
			</Card>

			{/* Configured Rules List */}
			<Card className="md:col-span-2 border-zinc-200 dark:border-zinc-800">
				<CardHeader>
					<CardTitle className="text-zinc-950 dark:text-zinc-50">Active Rules Directory</CardTitle>
					<CardDescription>
						All triggers currently loaded and active in the system
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="py-12 flex justify-center text-zinc-400">Loading rules...</div>
					) : alerts.length === 0 ? (
						<div className="py-12 text-center text-zinc-400 italic border border-dashed rounded-lg border-zinc-200 dark:border-zinc-800">
							No custom alert rules configured. Create one above to map custom notifications!
						</div>
					) : (
						<div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
							{alerts.map((al) => {
								const eventBadges: Record<string, string> = {
									entry: 'bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400',
									exit: 'bg-orange-50 text-orange-700 border-orange-200/50 dark:bg-orange-950/20 dark:text-orange-400',
									both: 'bg-indigo-50 text-indigo-700 border-indigo-200/50 dark:bg-indigo-950/20 dark:text-indigo-400',
								};
								const isGlobal = !al.vehicle_id || al.vehicle_number === 'All Vehicles';
								const isRestricted = geofences.find(g => g.id === al.geofence_id)?.category === 'restricted_zone';

								return (
									<div
										key={al.alert_id}
										className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-zinc-150 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/35"
									>
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
													{al.geofence_name}
												</h4>
												<Badge
													variant="outline"
													className={`text-[9px] uppercase px-1.5 py-0 border font-medium ${eventBadges[al.event_type]}`}
												>
													{al.event_type}
												</Badge>
												{isRestricted && (
													<Badge className="text-[9px] bg-red-500 text-white font-medium flex items-center gap-1 border-0">
														<ShieldAlert className="w-3 h-3" /> Auto
													</Badge>
												)}
											</div>
											<p className="text-xs text-zinc-500 dark:text-zinc-400">
												Applies to: <span className={isGlobal ? 'font-semibold text-zinc-700 dark:text-zinc-300' : 'font-mono'}>{al.vehicle_number}</span>
											</p>
											<div className="text-[10px] text-zinc-400">
												Rule ID: <span className="font-mono">{al.alert_id}</span> &bull; Configured: {new Date(al.created_at).toLocaleDateString()}
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
