import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import LocationIQMap from '../../components/LocationIQMap';
import {
  fetchJobLiveTracking,
  fetchTechnicianJobs,
  updateCustomerLocation,
  updateTechnicianLocation
} from '../services/api';
import { geocodeAddress, getDrivingRoute } from '../services/locationIq';
import { fonts } from '../../theme';

const colors = {
  ink: '#102A43',
  teal: '#0F766E',
  tealDark: '#075E59',
  canvas: '#F5F8FA',
  white: '#FFFFFF',
  muted: '#5A7A91',
  line: '#D9E2EC',
  navy: '#102A43',
  gold: '#D97706',
};

// Default Bogo City center near Cebu Roosevelt Memorial Colleges
const BOGO_DEFAULT_COORDS = { latitude: 11.0505, longitude: 124.0045 };

const distanceInKm = (first, second) => {
  if (![first?.latitude, first?.longitude, second?.latitude, second?.longitude].every(Number.isFinite)) return null;
  const toRadians = (value) => value * Math.PI / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(first.latitude)) * Math.cos(toRadians(second.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

export default function MapTrackerScreen({ currentUser, selectedJob: initialJob, onBack, onNavigateToJobs }) {
  const isTechnician = currentUser?.role === 'technician';
  const [activeJob, setActiveJob] = useState(initialJob);
  const [acceptedJobsList, setAcceptedJobsList] = useState([]);
  const [loadingActiveJob, setLoadingActiveJob] = useState(false);
  const [jobsExpanded, setJobsExpanded] = useState(true);

  // Load technician's active jobs list so they can easily switch between customers
  useEffect(() => {
    if (isTechnician && currentUser?.uid) {
      setLoadingActiveJob(true);
      fetchTechnicianJobs(currentUser.uid)
        .then((jobs) => {
          const activeList = Array.isArray(jobs)
            ? jobs.filter((j) => ['Accepted', 'In Progress'].includes(j.status))
            : [];
          setAcceptedJobsList(activeList);
          // If no initialJob was passed (e.g. tech tapped bottom Map tab), pick the first active job
          if (!initialJob && activeList.length > 0) {
            setActiveJob(activeList[0]);
          }
        })
        .catch((err) => console.warn('Could not load active jobs:', err))
        .finally(() => setLoadingActiveJob(false));
    }
  }, [currentUser?.uid, isTechnician, initialJob]);

  // Sync activeJob when initialJob prop changes from parent navigation
  useEffect(() => {
    if (initialJob) {
      setActiveJob(initialJob);
    }
  }, [initialJob]);

  const isAccepted = ['Accepted', 'In Progress'].includes(activeJob?.status);

  // Initialize Coordinates safely
  const initialTechnicianCoords = useMemo(() => {
    const lat = Number(isTechnician ? currentUser?.latitude : activeJob?.technicianLatitude || activeJob?.latitude);
    const lon = Number(isTechnician ? currentUser?.longitude : activeJob?.technicianLongitude || activeJob?.longitude);
    return {
      latitude: Number.isFinite(lat) && lat !== 0 ? lat : BOGO_DEFAULT_COORDS.latitude,
      longitude: Number.isFinite(lon) && lon !== 0 ? lon : BOGO_DEFAULT_COORDS.longitude,
      name: isTechnician ? (currentUser?.name || 'Technician') : (activeJob?.technicianName || 'Technician'),
    };
  }, [currentUser, activeJob, isTechnician]);

  const initialCustomerCoords = useMemo(() => {
    const lat = Number(activeJob?.latitude);
    const lon = Number(activeJob?.longitude);
    const hasValidCoords = Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0;

    return {
      latitude: hasValidCoords ? lat : BOGO_DEFAULT_COORDS.latitude + 0.003,
      longitude: hasValidCoords ? lon : BOGO_DEFAULT_COORDS.longitude + 0.003,
      name: isTechnician ? (activeJob?.customerName || 'Customer') : (currentUser?.name || 'Customer'),
      address: activeJob?.location || 'Customer location',
    };
  }, [currentUser, activeJob, isTechnician]);

  const [technicianCoords, setTechnicianCoords] = useState(initialTechnicianCoords);
  const [customerCoords, setCustomerCoords] = useState(initialCustomerCoords);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distanceKm, setDistanceKm] = useState(null);
  const [travelMinutes, setTravelMinutes] = useState(null);
  const [isRouting, setIsRouting] = useState(false);

  // Sync state when initialCoords change
  useEffect(() => {
    setTechnicianCoords(initialTechnicianCoords);
    setCustomerCoords(initialCustomerCoords);
  }, [initialTechnicianCoords, initialCustomerCoords]);

  // Geocode address dynamically if coordinates were missing or need verification
  useEffect(() => {
    if (!activeJob?.location) return;
    const lat = Number(activeJob.latitude);
    const lon = Number(activeJob.longitude);
    const hasValidCoords = Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0;

    if (!hasValidCoords) {
      geocodeAddress(activeJob.location).then((res) => {
        if (res?.latitude && res?.longitude) {
          setCustomerCoords((prev) => ({
            ...prev,
            latitude: res.latitude,
            longitude: res.longitude,
            address: activeJob.location,
          }));
        }
      }).catch((err) => console.warn('Geocoding job location failed:', err));
    }
  }, [activeJob?.id, activeJob?.location, activeJob?.latitude, activeJob?.longitude]);

  // GPS Watcher
  useEffect(() => {
    if (!isAccepted || !activeJob?.id) return undefined;
    let active = true;
    let watcher;

    const syncLocation = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') return;

        if (!isTechnician) {
          watcher = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, timeInterval: 8000, distanceInterval: 15 },
            async (pos) => {
              const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
              if (active) setCustomerCoords((curr) => ({ ...curr, ...next }));
              try { await updateCustomerLocation(activeJob.id, currentUser.uid, next); } catch (e) {}
            }
          );
        } else {
          watcher = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, timeInterval: 8000, distanceInterval: 15 },
            async (pos) => {
              const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, name: currentUser.name || 'Technician' };
              if (active) setTechnicianCoords(next);
              try { await updateTechnicianLocation(currentUser.uid, next); } catch (e) {}
            }
          );
        }
      } catch (err) {
        console.warn('GPS watcher error:', err);
      }
    };

    syncLocation();
    return () => { active = false; watcher?.remove(); };
  }, [currentUser, isAccepted, activeJob?.id, isTechnician]);

  // Compute road route via LocationIQ (with automatic caching and straight-line fallback)
  useEffect(() => {
    let isMounted = true;
    const loadRoute = async () => {
      if (!isAccepted || !customerCoords?.latitude || !technicianCoords?.latitude) {
        setRouteCoordinates([]);
        return;
      }
      try {
        const route = await getDrivingRoute(technicianCoords, customerCoords);
        if (isMounted && route?.geometry?.coordinates) {
          setRouteCoordinates(route.geometry.coordinates.map(([lon, lat]) => [lat, lon]));
          if (route.distance) setDistanceKm(Number((route.distance / 1000).toFixed(1)));
          if (route.duration) setTravelMinutes(Math.max(1, Math.round(route.duration / 60)));
        }
      } catch (e) {
        console.warn('Driving route load notice:', e);
      }
    };

    loadRoute();
    return () => { isMounted = false; };
  }, [customerCoords?.latitude, customerCoords?.longitude, technicianCoords?.latitude, technicianCoords?.longitude, isAccepted]);

  // Fallback distance calculation if driving route distance is pending
  useEffect(() => {
    if (distanceKm == null) {
      const calc = distanceInKm(technicianCoords, customerCoords);
      if (calc != null) {
        setDistanceKm(Number(calc.toFixed(1)));
        setTravelMinutes(Math.max(1, Math.round((calc / 25) * 60)));
      }
    }
  }, [technicianCoords, customerCoords, distanceKm]);

  // Handler: Open Turn-by-Turn GPS navigation in Google Maps / Apple Maps
  const handleOpenGoogleMapsNavigation = async () => {
    if (!customerCoords?.latitude || !customerCoords?.longitude) {
      Alert.alert('Location Loading', 'Please wait a moment while the customer location is resolved.');
      return;
    }
    const destLat = customerCoords.latitude;
    const destLng = customerCoords.longitude;
    const label = encodeURIComponent(customerCoords.address || customerCoords.name || 'Customer Location');

    const appUrl = Platform.select({
      ios: `maps:0,0?q=${label}&daddr=${destLat},${destLng}`,
      android: `google.navigation:q=${destLat},${destLng}&mode=d`
    });
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;

    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) {
        await Linking.openURL(appUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch (err) {
      await Linking.openURL(webUrl);
    }
  };

  // Handler: Re-calculate and center in-app route
  const handleRefreshInAppRoute = async () => {
    setIsRouting(true);
    try {
      const route = await getDrivingRoute(technicianCoords, customerCoords);
      if (route?.geometry?.coordinates) {
        setRouteCoordinates(route.geometry.coordinates.map(([lon, lat]) => [lat, lon]));
        const dist = (route.distance / 1000).toFixed(1);
        const mins = Math.max(1, Math.round(route.duration / 60));
        setDistanceKm(Number(dist));
        setTravelMinutes(mins);
        Alert.alert('Route Centered', `Driving distance: ${dist} km\nEstimated travel time: ~${mins} minutes.`);
      } else {
        Alert.alert('Route Centered', 'In-app road path refreshed.');
      }
    } catch (e) {
      Alert.alert('Notice', 'Driving route re-centered.');
    } finally {
      setIsRouting(false);
    }
  };

  // If no job is active (e.g. technician tapped Map tab directly without accepted jobs)
  if (!activeJob && !loadingActiveJob) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="map-outline" size={48} color={colors.teal} />
        </View>
        <Text style={styles.emptyTitle}>No Active Job Selected</Text>
        <Text style={styles.emptySubtitle}>
          Select an accepted repair from your Jobs feed to start turn-by-turn navigation to the customer's home.
        </Text>
        <TouchableOpacity style={styles.emptyButton} onPress={onNavigateToJobs || onBack}>
          <Ionicons name="briefcase-outline" size={18} color={colors.white} />
          <Text style={styles.emptyButtonText}>Go to My Jobs</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapArea}>
        <LocationIQMap
          key={activeJob?.id || 'job'}
          technicianCoords={technicianCoords}
          customerCoords={customerCoords}
          routeCoordinates={routeCoordinates}
          currentUserRole={currentUser?.role || 'technician'}
          isAccepted={isAccepted}
          style={styles.map}
        />
        {isTechnician && acceptedJobsList.length > 1 && (
          <View style={styles.selectorBar}>
            {jobsExpanded ? (
              <>
                <View style={styles.selectorHeader}>
                  <Text style={styles.selectorKicker}>ACTIVE ({acceptedJobsList.length})</Text>
                  <TouchableOpacity onPress={() => setJobsExpanded(false)} style={styles.collapseBtn}>
                    <Ionicons name="chevron-down" size={16} color={colors.muted} />
                  </TouchableOpacity>
                </View>
                <View style={styles.chipRow}>
                  {acceptedJobsList.map((job) => {
                    const isSelected = activeJob?.id === job.id;
                    return (
                      <TouchableOpacity
                        key={job.id}
                        style={[styles.jobChip, isSelected && styles.jobChipActive]}
                        onPress={() => setActiveJob(job)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.jobChipDot, isSelected && styles.jobChipDotActive]} />
                        <Text style={[styles.jobChipText, isSelected && styles.jobChipTextActive]} numberOfLines={1}>
                          {job.applianceType} ({job.customerName?.split(' ')[0] || 'Cust'})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              <TouchableOpacity style={styles.expandBtn} onPress={() => setJobsExpanded(true)} activeOpacity={0.8}>
                <Ionicons name="chevron-up" size={16} color={colors.white} />
                <Text style={styles.expandBtnText}>{acceptedJobsList.length}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.detailsPanel}>
        <View style={styles.metricsCard}>
          <View style={styles.metric}>
            <Ionicons name="car-outline" size={20} color={colors.teal} />
            <Text style={styles.metricValue}>
              {distanceKm != null ? `${distanceKm} km` : '--'}
            </Text>
            <Text style={styles.metricLabel}>Distance</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Ionicons name="time-outline" size={20} color={colors.teal} />
            <Text style={styles.metricValue}>
              {travelMinutes != null ? `${travelMinutes} min` : (routeCoordinates.length ? 'In app' : '--')}
            </Text>
            <Text style={styles.metricLabel}>Est. Travel Time</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Ionicons name="shield-checkmark-outline" size={21} color={colors.teal} />
            <Text style={styles.metricValue}>{isAccepted ? 'Active' : 'Locked'}</Text>
            <Text style={styles.metricLabel}>Live GPS</Text>
          </View>
        </View>

        <View style={styles.customerCard}>
          <View style={styles.customerIcon}>
            <Ionicons name="person" size={21} color={colors.teal} />
          </View>
          <View style={styles.customerCopy}>
            <Text style={styles.customerKicker}>SERVICE DESTINATION</Text>
            <Text style={styles.customerName}>{customerCoords.name}</Text>
            <Text style={styles.customerMeta} numberOfLines={1}>
              {activeJob?.applianceType || 'Repair request'} • {customerCoords.address}
            </Text>
          </View>
        </View>

        {/* Dynamic Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.googleMapsButton}
            onPress={handleOpenGoogleMapsNavigation}
            activeOpacity={0.85}
          >
            <Ionicons name="navigate" size={18} color={colors.white} />
            <Text style={styles.googleMapsText} numberOfLines={1}>Navigate in Google Maps GPS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.inAppButton}
            onPress={handleRefreshInAppRoute}
            disabled={isRouting}
            activeOpacity={0.85}
          >
            {isRouting ? (
              <ActivityIndicator color={colors.teal} size="small" />
            ) : (
              <>
                <Ionicons name="locate-outline" size={18} color={colors.teal} />
                <Text style={styles.inAppText}>Center Map</Text>
              </>
            )}
          </TouchableOpacity>

          {(onBack || onNavigateToJobs) && (
            <TouchableOpacity style={styles.backButton} onPress={onBack || onNavigateToJobs}>
              <Text style={styles.backText}>{isTechnician ? 'Back to jobs' : 'Back to requests'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  selectorBar: { position: 'absolute', right: 12, top: 12, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, shadowColor: '#102A43', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
  selectorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  selectorKicker: { fontSize: 9, fontFamily: fonts.bold, color: colors.muted, letterSpacing: 0.6 },
  collapseBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center' },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.teal, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  expandBtnText: { color: colors.white, fontSize: 11, fontFamily: fonts.bold },
  chipRow: { flexDirection: 'column', gap: 5 },
  jobChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
  jobChipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  jobChipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.muted, marginRight: 6 },
  jobChipDotActive: { backgroundColor: colors.white },
  jobChipText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.ink },
  jobChipTextActive: { color: colors.white },
  mapArea: { flex: 1, minHeight: 250, position: 'relative' },
  map: { flex: 1 },
  detailsPanel: { backgroundColor: colors.white, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16, borderTopLeftRadius: 26, borderTopRightRadius: 26, shadowColor: '#102A43', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: -5 }, elevation: 8 },
  metricsCard: { backgroundColor: '#F4F8FA', borderRadius: 16, minHeight: 84, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 14 },
  metric: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  metricDivider: { height: 40, width: 1, backgroundColor: colors.line },
  metricValue: { color: colors.ink, fontSize: 15, fontFamily: fonts.bold, marginTop: 3 },
  metricLabel: { color: colors.muted, fontSize: 10, marginTop: 2, textAlign: 'center' },
  customerCard: { minHeight: 74, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  customerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E6F6F3', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  customerCopy: { flex: 1 },
  customerKicker: { color: colors.teal, fontSize: 9, letterSpacing: 1.2, fontFamily: fonts.bold, marginBottom: 2 },
  customerName: { color: colors.ink, fontSize: 15, fontFamily: fonts.bold },
  customerMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  actionButtons: { gap: 10 },
  googleMapsButton: { width: '100%', height: 48, borderRadius: 14, backgroundColor: colors.navy, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  googleMapsText: { color: colors.white, fontSize: 14, fontFamily: fonts.bold },
  inAppButton: { width: '100%', height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: colors.teal, backgroundColor: '#E6F6F3', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  inAppText: { color: colors.teal, fontSize: 13, fontFamily: fonts.bold },
  backButton: { height: 44, borderRadius: 14, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  backText: { color: colors.teal, fontSize: 13, fontFamily: fonts.bold },
  // Empty State Styles
  emptyContainer: { flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 26, backgroundColor: '#E6F6F3', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { color: colors.ink, fontSize: 21, fontFamily: fonts.bold, marginBottom: 8 },
  emptySubtitle: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 24 },
  emptyButton: { height: 48, borderRadius: 14, backgroundColor: colors.teal, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 8 },
  emptyButtonText: { color: colors.white, fontSize: 14, fontFamily: fonts.bold },
});
