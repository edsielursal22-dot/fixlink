import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { acceptRepairRequest, fetchRepairRequests, fetchTechnicianJobs } from '../services/api';

const colors = { ink: '#102A43', muted: '#627D98', line: '#D9E2EC', canvas: '#F5F8FA', teal: '#0F766E', tealDark: '#075E59', white: '#FFFFFF' };
const fallbackJobs = [
  { id: 'sample-1', applianceType: 'Refrigerator', description: 'Not cooling properly, strange ticking noise from the compressor compartment.', location: 'Mandaue City, Cebu', preferredTime: 'Today, 2:00 PM', distanceKm: 4.2 },
  { id: 'sample-2', applianceType: 'Washing Machine', description: 'Drum is not spinning during the high-speed cycle and shows an OE error code.', location: 'Cebu City', preferredTime: 'Today, 4:30 PM', distanceKm: 8.7 },
  { id: 'sample-3', applianceType: 'Air Conditioner', description: 'Routine general cleaning and chemical wash required for two units.', location: 'Lapu-Lapu City', preferredTime: 'Tomorrow, 10:00 AM', distanceKm: 12.4 },
];

export default function AvailableJobsScreen({ technician, onNavigateToMap, onNavigateToChat }) {
  const [jobs, setJobs] = useState([]);
  const [acceptedJobs, setAcceptedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingJobId, setAcceptingJobId] = useState(null);

  const loadJobs = async () => {
    try {
      const [result, assigned] = await Promise.all([
        fetchRepairRequests(technician?.uid),
        fetchTechnicianJobs(technician?.uid),
      ]);
      setJobs(Array.isArray(result) ? result : []);
      setAcceptedJobs(Array.isArray(assigned) ? assigned.filter((job) => ['Accepted', 'In Progress'].includes(job.status)) : []);
    } catch (error) {
      setJobs(fallbackJobs);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadJobs(); }, [technician?.uid]);

  const handleRefresh = () => { setRefreshing(true); loadJobs(); };

  const handleAcceptJob = async (job) => {
    if (!technician?.uid || acceptingJobId) return;
    setAcceptingJobId(job.id);
    try {
      const accepted = await acceptRepairRequest(job.id, technician.uid, technician.name || 'Technician');
      setJobs((currentJobs) => currentJobs.filter((currentJob) => currentJob.id !== job.id));
      setAcceptedJobs((currentJobs) => [{ ...job, id: accepted.jobId, status: 'Accepted', technicianUid: technician.uid, technicianName: technician.name }, ...currentJobs]);
      Alert.alert('Job accepted', 'The customer and live route are now available in your assigned job map.');
    } catch (error) {
      Alert.alert('Unable to accept job', error?.error || 'This job may already have been accepted by another technician.');
    } finally {
      setAcceptingJobId(null);
    }
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.teal} /><Text style={styles.loadingText}>Finding jobs near you...</Text></View>;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.teal} />}>
      <View style={styles.heroRow}>
        <View style={styles.heroCopy}><Text style={styles.eyebrow}>TECHNICIAN HUB</Text><Text style={styles.greeting}>Jobs for your skills</Text><Text style={styles.subtitle}>Review nearby repair work and choose your next dispatch.</Text></View>
        <View style={styles.jobCount}><Text style={styles.jobCountValue}>{jobs.length}</Text><Text style={styles.jobCountLabel}>nearby</Text></View>
      </View>

      <View style={styles.statusCard}><View style={styles.statusIcon}><Ionicons name="radio-outline" size={21} color={colors.teal} /></View><View style={styles.statusCopy}><Text style={styles.statusTitle}>Availability is on</Text><Text style={styles.statusText}>Only jobs matching your verified skills appear here.</Text></View><View style={styles.liveDot} /></View>

      <View style={styles.sectionHeader}><View><Text style={styles.kicker}>YOUR WORK</Text><Text style={styles.sectionTitle}>My accepted jobs</Text></View><Text style={styles.acceptedCount}>{acceptedJobs.length}</Text></View>
      {acceptedJobs.length === 0 ? <View style={styles.acceptedEmpty}><Ionicons name="checkmark-done-outline" size={22} color={colors.teal} /><Text style={styles.acceptedEmptyText}>Accepted jobs will appear here.</Text></View> : acceptedJobs.map((job) => (
        <View key={job.id} style={styles.acceptedCard}>
          <View style={styles.acceptedIcon}><Ionicons name="briefcase" size={20} color={colors.teal} /></View>
          <View style={styles.acceptedCopy}><Text style={styles.kicker}>{job.status}</Text><Text style={styles.acceptedTitle}>{job.applianceType || 'Repair request'}</Text><Text style={styles.acceptedMeta} numberOfLines={1}>{job.customerName || 'Customer'} - {job.location || 'Location pending'}</Text></View>
          <TouchableOpacity style={styles.acceptedAction} onPress={() => onNavigateToMap?.(job)}><Ionicons name="map-outline" size={18} color={colors.white} /></TouchableOpacity>
          <TouchableOpacity style={styles.acceptedAction} onPress={() => onNavigateToChat?.(job)}><Ionicons name="chatbubble-outline" size={18} color={colors.white} /></TouchableOpacity>
        </View>
      ))}

      <View style={styles.sectionHeader}><View><Text style={styles.kicker}>DISPATCH QUEUE</Text><Text style={styles.sectionTitle}>Available repairs</Text></View><TouchableOpacity onPress={handleRefresh}><Ionicons name="refresh-outline" size={21} color={colors.teal} /></TouchableOpacity></View>

      {jobs.length === 0 ? (
        <View style={styles.emptyCard}><View style={styles.emptyIcon}><Ionicons name="briefcase-outline" size={28} color={colors.teal} /></View><Text style={styles.emptyTitle}>No matching jobs yet</Text><Text style={styles.emptyText}>Stay available and refresh when you are ready for the next dispatch.</Text></View>
      ) : jobs.map((job) => (
        <View key={job.id} style={styles.jobCard}>
          {(() => {
            const isAssigned = ['Accepted', 'In Progress'].includes(job.status);
            return (
              <>
          <View style={styles.jobTopRow}><View style={styles.categoryIcon}><Ionicons name="construct-outline" size={21} color={colors.teal} /></View><View style={styles.jobHeading}><Text style={styles.kicker}>SERVICE REQUEST</Text><Text style={styles.jobTitle}>{job.applianceType || 'Repair request'}</Text></View>{job.distanceKm != null && <View style={styles.distancePill}><Ionicons name="navigate-outline" size={12} color={colors.teal} /><Text style={styles.distanceText}>{job.distanceKm} km</Text></View>}</View>
          <Text style={styles.problem} numberOfLines={3}>{job.description || 'No issue description provided.'}</Text>
          <View style={styles.metaBlock}><View style={styles.metaItem}><Ionicons name="location-outline" size={16} color={colors.muted} /><Text style={styles.metaText} numberOfLines={1}>{job.location || 'Location pending'}</Text></View><View style={styles.metaItem}><Ionicons name="calendar-outline" size={16} color={colors.muted} /><Text style={styles.metaText}>{job.preferredTime || job.preferredDate || 'Schedule to confirm'}</Text></View></View>
          <View style={styles.actionRow}>{onNavigateToMap && <TouchableOpacity style={styles.secondaryAction} onPress={() => onNavigateToMap(job)}><Ionicons name="map-outline" size={17} color={colors.teal} /><Text style={styles.secondaryActionText}>View route</Text></TouchableOpacity>}{onNavigateToChat && <TouchableOpacity style={styles.secondaryAction} onPress={() => onNavigateToChat(job)}><Ionicons name="chatbubble-ellipses-outline" size={17} color={colors.teal} /><Text style={styles.secondaryActionText}>Message</Text></TouchableOpacity>}<TouchableOpacity style={styles.primaryAction} onPress={() => handleAcceptJob(job)} disabled={acceptingJobId !== null}>{acceptingJobId === job.id ? <ActivityIndicator color={colors.white} size="small" /> : <><Text style={styles.primaryActionText}>Accept job</Text><Ionicons name="checkmark" size={17} color={colors.white} /></>}</TouchableOpacity></View>
              </>
            );
          })()}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas }, content: { padding: 20, paddingBottom: 32 }, loading: { flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }, loadingText: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: 10 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }, heroCopy: { flex: 1, paddingRight: 16 }, eyebrow: { color: colors.teal, fontSize: 10, letterSpacing: 1.5, fontWeight: '800', marginBottom: 7 }, greeting: { color: colors.ink, fontSize: 27, fontWeight: '800' }, subtitle: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 6 }, jobCount: { width: 62, height: 62, borderRadius: 20, backgroundColor: '#D7F0ED', alignItems: 'center', justifyContent: 'center' }, jobCountValue: { color: colors.tealDark, fontSize: 20, fontWeight: '900' }, jobCountLabel: { color: colors.teal, fontSize: 10, fontWeight: '800' },
  statusCard: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 26 }, statusIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#E6F6F3', alignItems: 'center', justifyContent: 'center', marginRight: 12 }, statusCopy: { flex: 1 }, statusTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: 3 }, statusText: { color: colors.muted, fontSize: 12, lineHeight: 17 }, liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#22C55E' }, sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }, kicker: { color: colors.teal, fontSize: 10, letterSpacing: 1.4, fontWeight: '800', marginBottom: 3 }, sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' }, acceptedCount: { color: colors.teal, fontSize: 15, fontWeight: '900', marginBottom: 2 }, acceptedEmpty: { backgroundColor: '#E6F6F3', borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 22 }, acceptedEmptyText: { color: colors.tealDark, fontSize: 12, fontWeight: '700' }, acceptedCard: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: '#B9E8E1', padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 12, shadowColor: colors.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }, acceptedIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#E6F6F3', alignItems: 'center', justifyContent: 'center', marginRight: 10 }, acceptedCopy: { flex: 1 }, acceptedTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' }, acceptedMeta: { color: colors.muted, fontSize: 11, marginTop: 3 }, acceptedAction: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  jobCard: { backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 18, marginBottom: 14, shadowColor: colors.ink, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 }, jobTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 }, categoryIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#E6F6F3', alignItems: 'center', justifyContent: 'center', marginRight: 11 }, jobHeading: { flex: 1 }, jobTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' }, distancePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF8E7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 }, distanceText: { color: '#8A5B00', fontSize: 11, fontWeight: '800' }, problem: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 15 }, metaBlock: { borderTopWidth: 1, borderTopColor: colors.line, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 11, gap: 9, marginBottom: 14 }, metaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 }, metaText: { flex: 1, color: colors.muted, fontSize: 12, fontWeight: '600' }, actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, secondaryAction: { height: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.canvas, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }, secondaryActionText: { color: colors.teal, fontSize: 11, fontWeight: '800' }, primaryAction: { flex: 1, height: 42, borderRadius: 12, backgroundColor: colors.teal, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, primaryActionText: { color: colors.white, fontSize: 12, fontWeight: '800' }, emptyCard: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 30, alignItems: 'center' }, emptyIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#E6F6F3', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginBottom: 5 }, emptyText: { color: colors.muted, fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
