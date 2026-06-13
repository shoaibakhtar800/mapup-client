'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BellRing, Sparkles, Wifi, WifiOff } from 'lucide-react';

interface WSAlertVehicle {
	vehicle_id: string;
	vehicle_number: string;
	driver_name: string;
}

interface WSAlertGeofence {
	geofence_id: string;
	geofence_name: string;
	category: string;
}

interface WSAlertLocation {
	latitude: number;
	longitude: number;
}

interface WSAlertMessage {
	event_id: string;
	event_type: string;
	timestamp: string;
	vehicle: WSAlertVehicle;
	geofence: WSAlertGeofence;
	location: WSAlertLocation;
}

interface AlertNotificationFeedProps {
	apiUrl: string;
	onNewAlert?: (alert: WSAlertMessage) => void;
}
export default function AlertNotificationFeed({ apiUrl, onNewAlert }: AlertNotificationFeedProps) {
	const [alerts, setAlerts] = useState<WSAlertMessage[]>([]);
	const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
	const wsRef = useRef<WebSocket | null>(null);
	const seenAlertIdsRef = useRef<Set<string>>(new Set());

	const onNewAlertRef = useRef(onNewAlert);
	useEffect(() => {
		onNewAlertRef.current = onNewAlert;
	}, [onNewAlert]);

	useEffect(() => {
		let reconnectTimer: NodeJS.Timeout;
		let isCleanedUp = false;

		const connectWS = () => {
			if (isCleanedUp) return;
			
			setStatus('connecting');
			// Convert HTTP url to WS url
			const wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws/alerts';
			console.log('Connecting to WebSocket at:', wsUrl);

			const ws = new WebSocket(wsUrl);
			wsRef.current = ws;

			ws.onopen = () => {
				if (isCleanedUp) {
					ws.close();
					return;
				}
				setStatus('connected');
				toast.success('Live alerts link established successfully!');
			};

			ws.onmessage = (event) => {
				if (isCleanedUp) return;
				try {
					const data = JSON.parse(event.data) as WSAlertMessage;
					console.log('Received live geofence crossing:', data);

					// Check if we already processed this alert ID synchronously
					if (seenAlertIdsRef.current.has(data.event_id)) {
						return;
					}
					seenAlertIdsRef.current.add(data.event_id);

					// 1. Play alert feedback (only for new, unique alerts)
					const isRestricted = data.geofence.category === 'restricted_zone';
					const isEntry = data.event_type === 'entry';

					if (isRestricted && isEntry) {
						toast.error(`RESTRICTED AREA BREACH: ${data.vehicle.vehicle_number} has entered restricted zone "${data.geofence.geofence_name}"!`, {
							duration: 10000,
						});
					} else {
						toast.info(`Geofence Cross: ${data.vehicle.vehicle_number} ${data.event_type}ed ${data.geofence.geofence_name}`, {
							duration: 4000,
						});
					}

					// 2. Trigger callback if page needs to reload tables/locations
					if (onNewAlertRef.current) {
						onNewAlertRef.current(data);
					}

					// 3. Add to local list (keep latest 50 in memory)
					setAlerts((prev) => [data, ...prev.slice(0, 49)]);
				} catch (err) {
					console.error('Failed to parse websocket message payload:', err);
				}
			};

			ws.onclose = () => {
				if (isCleanedUp) return;
				setStatus('disconnected');
				// Retry connection in 5 seconds
				reconnectTimer = setTimeout(() => {
					connectWS();
				}, 5000);
			};

			ws.onerror = (error) => {
				console.error('WebSocket Error:', error);
				ws.close();
			};
		};

		connectWS();

		return () => {
			isCleanedUp = true;
			if (wsRef.current) {
				wsRef.current.close();
			}
			clearTimeout(reconnectTimer);
		};
	}, [apiUrl]);

	const clearAll = () => {
		setAlerts([]);
	};

	return (
		<Card className="h-full flex flex-col border-zinc-200 dark:border-zinc-800 shadow-md">
			<CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
				<div>
					<CardTitle className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50">
						<BellRing className="w-5 h-5 text-indigo-500" />
						Real-Time Alerts
					</CardTitle>
					<CardDescription>Live geofencing event listener feed</CardDescription>
				</div>

				<div className="flex items-center gap-1.5">
					{status === 'connected' && (
						<Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200/50 flex items-center gap-1 text-[10px] h-6">
							<Wifi className="w-3.5 h-3.5" /> Live
						</Badge>
					)}
					{status === 'connecting' && (
						<Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200/50 flex items-center gap-1 text-[10px] h-6 animate-pulse">
							Connecting...
						</Badge>
					)}
					{status === 'disconnected' && (
						<Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-200/50 flex items-center gap-1 text-[10px] h-6">
							<WifiOff className="w-3.5 h-3.5" /> Offline
						</Badge>
					)}
				</div>
			</CardHeader>
			<CardContent className="flex-1 flex flex-col min-h-0">
				{alerts.length > 0 && (
					<div className="flex justify-end mb-2">
						<Button
							variant="ghost"
							size="xs"
							className="text-[10px] h-6 text-zinc-400 hover:text-zinc-600"
							onClick={clearAll}
						>
							Clear Feed
						</Button>
					</div>
				)}

				<div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
					{alerts.length === 0 ? (
						<div className="py-24 text-center text-zinc-400 italic text-xs border border-dashed rounded-lg border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-2">
							<Sparkles className="w-6 h-6 text-zinc-300 animate-pulse" />
							Waiting for location updates to trigger alerts...
						</div>
					) : (
						alerts.map((al) => {
							const isEntry = al.event_type === 'entry';
							const isRestricted = al.geofence.category === 'restricted_zone';

							return (
								<div
									key={al.event_id}
									className={`p-3 rounded-lg border transition-all duration-300 transform scale-100 slide-in-from-top-2 animate-in ${
										isRestricted && isEntry
											? 'bg-red-50/70 border-red-300 dark:bg-red-950/20 dark:border-red-900/60'
											: 'bg-zinc-50 border-zinc-150 dark:bg-zinc-900/30 dark:border-zinc-800'
									}`}
								>
									<div className="flex items-start justify-between">
										<div>
											<div className="flex items-center gap-1.5 flex-wrap">
												<span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
													{al.vehicle.vehicle_number}
												</span>
												<Badge
													variant="outline"
													className={`text-[8px] uppercase px-1.5 py-0 font-medium ${
														isEntry
															? 'bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400'
															: 'bg-orange-50 text-orange-700 border-orange-200/50 dark:bg-orange-950/20 dark:text-orange-400'
													}`}
												>
													{isEntry ? 'Entered' : 'Exited'}
												</Badge>
											</div>
											<h5 className="font-semibold text-xs text-zinc-700 dark:text-zinc-300 mt-1">
												{al.geofence.geofence_name}
											</h5>
											<div className="text-[10px] text-zinc-500 dark:text-zinc-400 space-y-0.5 mt-1">
												<p><strong>Driver:</strong> {al.vehicle.driver_name}</p>
												<p><strong>Position:</strong> {al.location.latitude.toFixed(5)}, {al.location.longitude.toFixed(5)}</p>
											</div>
										</div>
										<span className="text-[9px] text-zinc-400 whitespace-nowrap">
											{new Date(al.timestamp).toLocaleTimeString()}
										</span>
									</div>
								</div>
							);
						})
					)}
				</div>
			</CardContent>
		</Card>
	);
}
