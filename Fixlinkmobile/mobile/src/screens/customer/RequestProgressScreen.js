import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Alert, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchCompletedJobs, fetchCustomerRequests, submitTechnicianReview } from '../services/api';

const colors = { ink: '#102A43', teal: '#0F766E', canvas: '#F5F8FA', white: '#FFFFFF', muted: '#829AB1', line: '#D9E2EC', error: '#E53935' };

export default function RequestProgressScreen({ customerName, onViewDetails, onTrackMap }) {
  const [completedJobs, setCompletedJobs] = useState([]);
  const [trackedRequests, setTrackedRequests] = useState([]);
  const [reviewRatings, setReviewRatings] = useState({});
  const [reviewComments, setReviewComments] = useState({});
  const [reviewSubmitting, setReviewSubmitting] = useState(null);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#059669';
      case 'in progress': return '#D97706';
      case 'accepted': return colors.teal;
      case 'pending': return '#D97706';
      case 'cancelled': return colors.error;
      default: return colors.muted;
    }
  };

  useEffect(() => {
    fetchCompletedJobs(customerName).then(setCompletedJobs).catch(() => setCompletedJobs([]));
  }, [customerName]);

  useEffect(() => {
    let active = true;
    const refreshStatuses = () => fetchCustomerRequests(customerName).then((items) => { if (active) setTrackedRequests(items); }).catch(() => {});
    refreshStatuses();
    const interval = setInterval(refreshStatuses, 10000);
    return () => { active = false; clearInterval(interval); };
  }, [customerName]);

  const handleReviewSubmit = async (jobId) => {
    if (!reviewRatings[jobId]) {
      Alert.alert('Error', 'Please select a rating before submitting.');
      return;
    }
    setReviewSubmitting(jobId);
    try {
      await submitTechnicianReview(jobId, { customerName, rating: reviewRatings[jobId], comment: reviewComments[jobId] });
      Alert.alert('Success', 'Review submitted successfully!');
      fetchCompletedJobs(customerName).then(setCompletedJobs);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review.');
    } finally {
      setReviewSubmitting(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerContainer}>
        <Text style={styles.brand}>fix<Text style={styles.brandAccent}>link</Text></Text>
        <Text style={styles.roleHeader}>TRACK REQUESTS & REPAIRS</Text>
      </View>

      <View style={styles.sectionHeaderContainer}>
        <Text style={styles.kicker}>LIVE STATUS</Text>
        <Text style={styles.sectionTitle}>My Active Requests</Text>
      </View>

      {trackedRequests.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="clipboard-outline" size={32} color={colors.muted} />
          <Text style={styles.emptyText}>No active repair requests found.</Text>
        </View>
      ) : (
        trackedRequests.map(req => {
          const isAccepted = ['accepted', 'in progress'].includes(req.status?.toLowerCase());
          return (
            <View key={req.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.kicker}>APPLIANCE</Text>
                  <Text style={styles.applianceTitle}>{req.applianceType}</Text>
                  {req.technicianName && <Text style={styles.techName}>Tech: {req.technicianName}</Text>}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(req.status) + '15', borderColor: getStatusColor(req.status) + '40' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(req.status) }]}>● {req.status}</Text>
                </View>
              </View>

              <Text style={styles.description} numberOfLines={2}>{req.description}</Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={14} color={colors.muted} />
                  <Text style={styles.metaText}>{new Date(req.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={14} color={colors.muted} />
                  <Text style={styles.metaText} numberOfLines={1}>{req.location}</Text>
                </View>
              </View>

              {isAccepted && req.verificationCode && (
                <View style={styles.miniCodeBadge}>
                  <Ionicons name="key" size={14} color="#059669" />
                  <Text style={styles.miniCodeText}>
                    Completion Code: <Text style={styles.miniCodeHighlight}>{req.verificationCode}</Text>
                  </Text>
                </View>
              )}

              <View style={styles.cardActionsRow}>
                {isAccepted && onTrackMap && (
                  <TouchableOpacity style={styles.trackMapCardButton} onPress={() => onTrackMap(req)}>
                    <Ionicons name="map" size={15} color={colors.white} style={{ marginRight: 6 }} />
                    <Text style={styles.trackMapCardText}>Track on Map</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.viewDetailsButton, isAccepted && { flex: 1 }]} onPress={() => onViewDetails(req)}>
                  <Ionicons name="eye-outline" size={16} color={colors.teal} style={{ marginRight: 6 }} />
                  <Text style={styles.viewDetailsText}>Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {completedJobs.length > 0 && (
        <>
          <View style={[styles.sectionHeaderContainer, { marginTop: 24 }]}>
            <Text style={styles.kicker}>FEEDBACK</Text>
            <Text style={styles.sectionTitle}>Completed Repairs</Text>
          </View>

          {completedJobs.map(job => (
            <View key={job.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kicker}>FINISHED</Text>
                  <Text style={styles.applianceTitle}>{job.applianceType}</Text>
                  <Text style={styles.techName}>Tech: {job.technicianName || 'Assigned Tech'}</Text>
                </View>
              </View>

              <View style={styles.reviewContainer}>
                <Text style={styles.inputLabel}>Rate your experience</Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity key={star} onPress={() => setReviewRatings({ ...reviewRatings, [job.id]: star })} style={styles.starTouchable}>
                      <Text style={[styles.star, reviewRatings[job.id] >= star && styles.selectedStar]}>★</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="chatbox-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.reviewInput}
                    placeholder="How was the service? (Optional)"
                    placeholderTextColor={colors.muted}
                    multiline
                    onChangeText={(text) => setReviewComments({ ...reviewComments, [job.id]: text })}
                  />
                </View>

                <TouchableOpacity 
                  style={styles.reviewButton} 
                  onPress={() => handleReviewSubmit(job.id)} 
                  disabled={reviewSubmitting === job.id}
                >
                  {reviewSubmitting === job.id ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Submit Review</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, padding: 20, backgroundColor: colors.canvas },
  headerContainer: { alignItems: 'center', marginBottom: 24 },
  brand: { color: colors.ink, fontSize: 32, fontWeight: '900', letterSpacing: -1.5 },
  brandAccent: { color: colors.teal },
  roleHeader: { color: colors.muted, fontSize: 10, letterSpacing: 2, fontWeight: '800', marginTop: 4 },
  sectionHeaderContainer: { marginBottom: 12 },
  kicker: { color: colors.teal, fontSize: 10, letterSpacing: 1.5, fontWeight: '800', marginBottom: 2 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.line, shadowColor: '#102A43', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  applianceTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  techName: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  description: { fontSize: 14, color: colors.muted, marginBottom: 16, lineHeight: 20 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: '800' },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  miniCodeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 12, gap: 6 },
  miniCodeText: { fontSize: 12, color: '#065F46', fontWeight: '700' },
  miniCodeHighlight: { fontSize: 15, fontWeight: '900', color: '#059669', letterSpacing: 2 },
  cardActionsRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  trackMapCardButton: { flex: 1, height: 44, borderRadius: 12, backgroundColor: colors.teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: colors.teal, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  trackMapCardText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  viewDetailsButton: { height: 44, borderRadius: 12, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  viewDetailsText: { color: colors.teal, fontWeight: '800', fontSize: 13 },
  emptyCard: { backgroundColor: colors.white, borderRadius: 20, padding: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, gap: 12, marginBottom: 16 },
  emptyText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  reviewContainer: { marginTop: 12, gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line },
  inputLabel: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  stars: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  starTouchable: { padding: 2 },
  star: { fontSize: 32, color: colors.line },
  selectedStar: { color: '#F59E0B' },
  inputContainer: { flexDirection: 'row', backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14, minHeight: 70, alignItems: 'flex-start' },
  inputIcon: { marginRight: 10, marginTop: 14 },
  reviewInput: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: '600', paddingVertical: 12, height: 70, textAlignVertical: 'top' },
  reviewButton: { backgroundColor: colors.teal, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#0F766E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 }
});