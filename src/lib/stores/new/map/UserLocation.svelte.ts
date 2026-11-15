import { CAMPUS_BOUNDS } from '#lib/constants/map/terrain.js';
import { getToast } from '#lib/utils/context.js';
import {
	compassHeading,
	describeLocationFix,
	type OrientationReading
} from '#lib/utils/geolocation.js';
import type ToastStore from '../ui/ToastStore.svelte.js';
import type { MapStore } from './map-stores.svelte.js';

export default class UserLocation {
	coords: [number, number] | null = $state(null);
	/** Horizontal accuracy from the browser GPS fix, meters. */
	accuracyMeters: number | null = $state(null);
	bearing: number | null = $state(null);
	deviceHeading: number | null = $state(null);
	heading: number | null = $derived(this.deviceHeading ?? this.bearing);
	isTracking: boolean = $state(false);
	followMode: 'off' | 'follow' | 'heading' = $state('off');
	destination: [number, number] | null = $state(null);
	routeOrigin: [number, number] | null = $state(null);
	/** Multi-stop foot route (schedule import or 2-point fallback). */
	routeWaypoints: [number, number][] | null = $state(null);
	private toastStore: ToastStore;
	private watchId: number | null = null;
	private flyOnFix = false;
	private stopHeading: (() => void) | null = null;
	/** Avoid re-toasting every watch tick; still toast once when accuracy improves. */
	private announcedGoodFix = false;
	private announcedApproximateFix = false;

	constructor () {
		this.toastStore = getToast();
	}

	private isWithinBounds(lng: number, lat: number) {
		return (
			lng >= CAMPUS_BOUNDS.minLng &&
			lng <= CAMPUS_BOUNDS.maxLng &&
			lat >= CAMPUS_BOUNDS.minLat &&
			lat <= CAMPUS_BOUNDS.maxLat
		);
	}

	requestLocation() {
		if (!navigator.geolocation) {
			this.toastStore.show('Geolocation is not supported by your browser.', 'error');
			return;
		}

		if (this.isTracking) {
			if (!this.coords) {
				this.toastStore.show('Still getting your location...', 'info');
			}
			return;
		}

		this.isTracking = true;
		this.startHeading();
		this.announcedGoodFix = false;
		this.announcedApproximateFix = false;
		this.toastStore.show('Requesting location access...', 'info');

		this.watchId = navigator.geolocation.watchPosition(
			(position) => {
				console.log(position);
				const { longitude, latitude, heading, accuracy } = position.coords;

				// if (!this.isWithinBounds(longitude, latitude)) {
				// 	/* toastStore.show(
                //         'You appear to be outside the UPLB Campus. Location features are limited to the campus area.',
                //         'error'
                //     ); */
				// 	this.stopTracking();
				// 	// console.log("within bounds");
				// 	return;
				// }

				this.coords = [longitude, latitude];
				this.accuracyMeters = Number.isFinite(accuracy) && accuracy > 0 ? accuracy : null;
				this.bearing = heading;
				// Update route origin if destination exists but origin hasn't been set
				if (this.destination && !this.routeOrigin) {
					this.routeOrigin = [longitude, latitude];
				}

				const fix = describeLocationFix(this.accuracyMeters);
				if (fix.level === 'good' && !this.announcedGoodFix) {
					this.announcedGoodFix = true;
					// toastStore.show(fix.message, 'success');
				} else if (
					fix.level === 'approximate' &&
					!this.announcedApproximateFix &&
					!this.announcedGoodFix
				) {
					this.announcedApproximateFix = true;
					// toastStore.show(fix.message, 'info');
				}
			},
			(error) => {
				let msg = 'An unknown error occurred while getting location.';
				switch (error.code) {
					case error.PERMISSION_DENIED:
						msg = 'Location access denied. Please enable it in your settings.';
						break;
					case error.POSITION_UNAVAILABLE:
						msg = 'Location information is unavailable.';
						break;
					case error.TIMEOUT:
						msg = 'Location request timed out.';
						break;
				}
				this.toastStore.show(msg, 'error');
				this.stopTracking();
			},
			// maximumAge 0: avoid a stale cell/Wi‑Fi fix that can place you hundreds
			// of meters away (common indoors / on LTE). Keep watching for a better GPS fix.
			{ enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
		);
	}

	cycleFollow(map: MapStore) {
		if (!this.coords) {
			this.flyOnFix = true;
			this.followMode = 'follow';
			this.requestLocation();
			return;
		}
		const mapInstance = map.getRawInstance();
		if (!mapInstance) {
			this.toastStore.show('Map component is still initializing', 'info');
			return;
		}
		if (this.followMode === 'off') {
			this.followMode = 'follow';
			mapInstance.flyTo({
				center: this.coords,
				zoom: Math.max(mapInstance.getZoom(), 17),
				duration: 1200
			});
			return;
		}
		if (this.followMode === 'follow' && this.heading !== null) {
			this.followMode = 'heading';
			mapInstance.easeTo({ center: this.coords, bearing: this.heading, duration: 600 });
			return;
		}
		const bearing = this.followMode === 'heading' ? 0 : mapInstance.getBearing();
		this.followMode = 'follow';
		mapInstance.easeTo({ center: this.coords, bearing, duration: 600 });
	}

	follow(map: MapStore) {
		const mapInstance = map.getRawInstance();
		if (!mapInstance || !this.coords || this.followMode === 'off') return;
		if (this.flyOnFix) {
			this.flyOnFix = false;
			mapInstance.flyTo({
				center: this.coords,
				zoom: Math.max(mapInstance.getZoom(), 17),
				duration: 1200
			});
			return;
		}
		mapInstance.easeTo({
			center: this.coords,
			...(this.followMode === 'heading' && this.heading !== null ? { bearing: this.heading } : {}),
			duration: 300
		});
	}

	// iOS only grants the compass inside a tap, so this runs from requestLocation.
	private startHeading() {
		if (this.stopHeading || typeof DeviceOrientationEvent === 'undefined') return;
		const eventName =
			'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
		const onOrientation = (event: Event) => {
			const next = compassHeading(
				event as unknown as OrientationReading,
				screen.orientation?.angle ?? 0
			);
			if (next === null) return;
			const rounded = Math.round(next);
			const previous = this.deviceHeading;
			if (previous !== null && Math.abs(((rounded - previous + 540) % 360) - 180) < 2) return;
			this.deviceHeading = rounded;
		};
		const listen = () => window.addEventListener(eventName, onOrientation);
		this.stopHeading = () => {
			window.removeEventListener(eventName, onOrientation);
			this.deviceHeading = null;
		};
		const requestPermission = (
			DeviceOrientationEvent as unknown as {
				requestPermission?: () => Promise<'granted' | 'denied'>;
			}
		).requestPermission;
		if (typeof requestPermission !== 'function') {
			listen();
			return;
		}
		requestPermission()
			.then((state) => {
				if (state === 'granted' && this.stopHeading) listen();
			})
			.catch(() => {});
	}

	private stopTracking() {
		this.isTracking = false;
		this.followMode = 'off';
		this.flyOnFix = false;
		this.stopHeading?.();
		this.stopHeading = null;
		this.coords = null;
		this.accuracyMeters = null;
		this.routeOrigin = null;
		this.announcedGoodFix = false;
		this.announcedApproximateFix = false;
		if (this.watchId !== null) {
			navigator.geolocation.clearWatch(this.watchId);
			this.watchId = null;
		}
	}

	setDestination(coords: [number, number]) {
		this.destination = coords;
		this.routeOrigin = this.coords;
		this.routeWaypoints = null;
	}

	clearDestination() {
		this.destination = null;
		this.routeOrigin = null;
		this.routeWaypoints = null;
	}

	setRouteWaypoints(waypoints: [number, number][] | null) {
		this.routeWaypoints = waypoints;
		if (waypoints && waypoints.length >= 2) {
			this.destination = null;
			this.routeOrigin = null;
		}
	}

	clearRouteWaypoints() {
		this.routeWaypoints = null;
	}
}
