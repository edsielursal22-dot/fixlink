import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import LocationIQMap from '../../components/LocationIQMap';
import { fetchJobLiveTracking, updateCustomerLocation, updateTechnicianLocation } from '../services/api';
import { getDrivingRoute } from '../services/locationIq';

const colors = {
  ink: '#102A43',
  teal: '#0F766E',
  canvas: '#F5F8FA',
  white: '#FFFFFF',
  muted: '#627D98',
  line: '#D9E2EC',
  navy: '#102A43',
};

const fallbackTechnician = { latitude: 11.0493, longitude: 124.0049 };
const fallbackCustomer = { latitude: 11.0535, longitude: 124.0012 };

const getCoordinates = (source, fallback) => ({
  latitude: Number(source?.latitude) || fallback.latitude,
  longitude: Number(source?.longitude) || fallback.longitude,
});

const distanceInKm = (first, second) => {
  if (![first?.latitude, first?.longitude, second?.latitude, second?.longitude].every(Number.isFinite)) return null;
  const toRadians = (value) => value * Math.PI / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(toRadians(first.latitude)) * Math.cos(toRadians(second.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

export default function MapTrackerScreen({ currentUser, selectedJob, onBack, onNavigateToJobs }) {
  const isTechnician = currentUser?.role === 'technician';
  const initialTechnicianCoords = useMemo(() => ({
    ...getCoordinates(isTechnician ? currentUser : selectedJob, fallbackTechnician),
    name: isTechnician ? (currentUser?.name || 'Technician') : (selectedJob?.technicianName || 'Technician'),
  }), [currentUser, selectedJob, isTechnician]);
  const initialCustomerCoords = useMemo(() => ({
    ...getCoordinates(isTechnician ? selectedJob : currentUser, fallbackCustomer),
    name: isTechnician ? (selectedJob?.customerName || 'Customer') : (currentUser?.name || selectedJob?.customerName || 'Customer'),
    address: selectedJob?.location || 'Customer service location',
  }), [currentUser, selectedJob, isTechnician]);
  const isAccepted = ['Accepted', 'In Progress'].includes(selectedJob?.status);
  const [technicianCoords, setTechnicianCoords] = useState(initialTechnicianCoords);
  const [customerCoords, setCustomerCoords] = useState(initialCustomerCoords);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distanceKm, setDistanceKm] = useState(null);

  useEffect(() => {
    setTechnicianCoords(initialTechnicianCoords);
    setCustomerCoords(initialCustomerCoords);
  }, [initialTechnicianCoords, initialCustomerCoords]);

  useEffect(() => {
    if (!isAccepted || !selectedJob?.id) return undefined;
    let active = true;
    let watcher;
    const syncTechnicianLocation = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;
      if (currentUser?.role !== 'technician') {
        watcher = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 }, async (position) => {
          const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          if (active) setCustomerCoords((current) => ({ ...current, ...next }));
          try { await updateCustomerLocation(selectedJob.id, currentUser.uid, next); } catch (error) { console.warn('Customer location sync failed:', error); }
        });
        return;
      }
      watcher = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 }, async (position) => {
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude, name: currentUser.name || 'Technician' };
        if (active) setTechnicianCoords(next);
        try { await updateTechnicianLocation(currentUser.uid, next); } catch (error) { console.warn('Location sync failed:', error); }
      });
    };
    syncTechnicianLocation();
    return () => { active = false; watcher?.remove(); };
  }, [currentUser, isAccepted, selectedJob?.id]);

  useEffect(() => {
    if (!isAccepted || !selectedJob?.id) return undefined;
    let active = true;
    const loadLiveTracking = async () => {
      try {
        const tracking = await fetchJobLiveTracking(selectedJob.id);
        if (!active) return;
        if (tracking.technician?.latitude && tracking.technician?.longitude) setTechnicianCoords(tracking.technician);
        if (tracking.customer?.latitude && tracking.customer?.longitude) setCustomerCoords(tracking.customer);
      } catch (error) { console.warn('Live tracking refresh failed:', error); }
    };
    loadLiveTracking();
    const intervalId = setInterval(loadLiveTracking, 5000);
    return () => { active = false; clearInterval(intervalId); };
  }, [currentUser?.role, isAccepted, selectedJob?.id]);

  useEffect(() => {
    setDistanceKm(distanceInKm(technicianCoords, customerCoords));
  }, [technicianCoords, customerCoords]);

  useEffect(() => {
    let isMounted = true;
    const loadRoute = async () => {
      if (!isAccepted) {
        setRouteCoordinates([]);
        return;
      }
      const route = await getDrivingRoute(technicianCoords, customerCoords);
      if (isMounted && route?.geometry?.coordinates) {
        setRouteCoordinates(route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]));
      }
    };
    loadRoute();
    return () => { isMounted = false; };
  }, [customerCoords, technicianCoords, isAccepted]);

  const refreshInAppRoute = async () => {
    const route = await getDrivingRoute(technicianCoords, customerCoords);
    if (route?.geometry?.coordinates) setRouteCoordinates(route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="map" size={22} color={colors.teal} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>LOCATIONIQ REAL-TIME TRACKER</Text>
          <Text style={styles.title}>{currentUser?.role === 'technician' ? 'Technician Navigation' : 'Technician Tracker'}</Text>
        </View>
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{isAccepted ? 'Accepted' : 'Pending'}</Text>
        </View>
      </View>

      <View style={styles.mapArea}>
        <LocationIQMap
          technicianCoords={technicianCoords}
          customerCoords={customerCoords}
          routeCoordinates={routeCoordinates}
          currentUserRole={currentUser?.role || 'technician'}
          isAccepted={isAccepted}
          style={styles.map}
        />
      </View>

      <View style={styles.detailsPanel}>
        <View style={styles.metricsCard}>
          <View style={styles.metric}>
            <Ionicons name="car-outline" size={20} color={colors.teal} />
            <Text style={styles.metricValue}>{distanceKm == null ? '--' : distanceKm.toFixed(1)} km</Text>
            <Text style={styles.metricLabel}>Distance</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Ionicons name="time-outline" size={20} color={colors.teal} />
            <Text style={styles.metricValue}>{routeCoordinates.length ? 'In app' : '--'} </Text>
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
            <Text style={styles.customerKicker}>SERVICE CUSTOMER</Text>
            <Text style={styles.customerName}>{customerCoords.name}</Text>
            <Text style={styles.customerMeta} numberOfLines={1}>
              {selectedJob?.applianceType || 'Repair request'} - {customerCoords.address}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.navigateButton} onPress={refreshInAppRoute} activeOpacity={0.85}>
          <Ionicons name="navigate-outline" size={21} color={colors.white} />
          <Text style={styles.navigateText}>Navigate in FixLink</Text>
        </TouchableOpacity>

        {(onBack || onNavigateToJobs) && (
          <TouchableOpacity style={styles.backButton} onPress={onBack || onNavigateToJobs}>
            <Ionicons name="arrow-back" size={17} color={colors.teal} />
            <Text style={styles.backText}>Back to jobs</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: { minHeight: 76, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line },
  headerIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: '#E6F6F3', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.teal, fontSize: 9, letterSpacing: 1.4, fontWeight: '800', marginBottom: 3 },
  title: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6F6F3', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.teal, marginRight: 6 },
  statusText: { color: colors.teal, fontSize: 12, fontWeight: '800' },
  mapArea: { flex: 1, minHeight: 250, position: 'relative' },
  map: { flex: 1 },
  detailsPanel: { backgroundColor: colors.white, paddingHorizontal: 24, paddingTop: 22, paddingBottom: 18, borderTopLeftRadius: 28, borderTopRightRadius: 28, shadowColor: '#102A43', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: -5 }, elevation: 8 },
  metricsCard: { backgroundColor: '#F4F8FA', borderRadius: 18, minHeight: 92, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 16 },
  metric: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  metricDivider: { height: 48, width: 1, backgroundColor: colors.line },
  metricValue: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: 4 },
  metricLabel: { color: colors.muted, fontSize: 10, marginTop: 3, textAlign: 'center' },
  customerCard: { minHeight: 82, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  customerIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E6F6F3', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  customerCopy: { flex: 1 },
  customerKicker: { color: colors.teal, fontSize: 9, letterSpacing: 1.2, fontWeight: '800', marginBottom: 4 },
  customerName: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  customerMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  navigateButton: { minHeight: 54, borderRadius: 17, backgroundColor: colors.navy, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  navigateText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  backButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 12 },
  backText: { color: colors.teal, fontSize: 12, fontWeight: '800' },
});
