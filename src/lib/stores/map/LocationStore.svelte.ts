import { CAMPUS_BOUNDS } from "$lib/constants/map/terrain";
import { describeLocationFix } from "$lib/utils/geolocation";
import { toastStore } from "../index.svelte.js";

export default class UserLocation {
    coords: [number, number] | null = $state(null);
    /** Horizontal accuracy from the browser GPS fix, meters. */
    accuracyMeters: number | null = $state(null);
    bearing: number | null = $state(null);
    isTracking: boolean = $state(false);
    destination: [number, number] | null = $state(null);
    routeOrigin: [number, number] | null = $state(null);
    /** Multi-stop foot route (schedule import or 2-point fallback). */
    routeWaypoints: [number, number][] | null = $state(null);
    private watchId: number | null = null;
    /** Avoid re-toasting every watch tick; still toast once when accuracy improves. */
    private announcedGoodFix = false;
    private announcedApproximateFix = false;

    private isWithinBounds(lng: number, lat: number) {
        return (
            lng >= CAMPUS_BOUNDS.minLng &&
            lng <= CAMPUS_BOUNDS.maxLng &&
            lat >= CAMPUS_BOUNDS.minLat &&
            lat <= CAMPUS_BOUNDS.maxLat
        );
    }

    requestLocation = () => {
        if (!navigator.geolocation) {
            toastStore.show('Geolocation is not supported by your browser.', 'error');
            return;
        }

        if (this.isTracking) {
            if (!this.coords) {
                toastStore.show('Still getting your location...', 'info');
            }
            return;
        }

        this.isTracking = true;
        this.announcedGoodFix = false;
        this.announcedApproximateFix = false;
        toastStore.show('Requesting location access...', 'info');

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { longitude, latitude, heading, accuracy } = position.coords;

                if (!this.isWithinBounds(longitude, latitude)) {
                    toastStore.show(
                        'You appear to be outside the UPLB Campus. Location features are limited to the campus area.',
                        'error'
                    );
                    this.stopTracking();
                    return;
                }

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
                    toastStore.show(fix.message, 'success');
                } else if (
                    fix.level === 'approximate' &&
                    !this.announcedApproximateFix &&
                    !this.announcedGoodFix
                ) {
                    this.announcedApproximateFix = true;
                    toastStore.show(fix.message, 'info');
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
                toastStore.show(msg, 'error');
                this.stopTracking();
            },
            // maximumAge 0: avoid a stale cell/Wi‑Fi fix that can place you hundreds
            // of meters away (common indoors / on LTE). Keep watching for a better GPS fix.
            { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
        );
    };

    private stopTracking() {
        this.isTracking = false;
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

    setDestination = (coords: [number, number]) => {
        this.destination = coords;
        this.routeOrigin = this.coords;
        this.routeWaypoints = null;
    };

    clearDestination = () => {
        this.destination = null;
        this.routeOrigin = null;
        this.routeWaypoints = null;
    };

    setRouteWaypoints = (waypoints: [number, number][] | null) => {
        this.routeWaypoints = waypoints;
        if (waypoints && waypoints.length >= 2) {
            this.destination = null;
            this.routeOrigin = null;
        }
    };

    clearRouteWaypoints = () => {
        this.routeWaypoints = null;
    };
}