import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const colors = { ink: '#102A43', teal: '#0F766E', canvas: '#F5F8FA', white: '#FFFFFF', muted: '#829AB1', line: '#D9E2EC', error: '#E53935' };

export default function RequestDetailsScreen({ request, onBack, onMessageTechnician, onTrackMap }) {
  if (!request) return null;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#059669';
      case 'in progress': return '#D97706';
      case 'accepted': return colors.teal;
      case 'cancelled': return colors.error;
      default: return colors.teal;
    }
  };

  const isAccepted = ['accepted', 'in progress'].includes(request.status?.toLowerCase());

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
      
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backButtonContainer} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>DETAILS</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <Text style={styles.brand}>fix<Text style={styles.brandAccent}>link</Text></Text>
          <Text style={styles.roleHeader}>REPAIR REQUEST</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.kicker}>APPLIANCE</Text>
            <Text style={styles.title}>{request.applianceType}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.infoGroup}>
              <Text style={styles.inputLabel}>Problem Description</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <Ionicons name="document-text-outline" size={20} color={colors.muted} style={[styles.inputIcon, { marginTop: 14 }]} />
                <Text style={[styles.infoValue, { paddingTop: 14, paddingBottom: 14 }]}>{request.description || 'No description provided'}</Text>
              </View>
            </View>

            <View style={styles.infoGroup}>
              <Text style={styles.inputLabel}>Preferred Schedule</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="calendar-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                <Text style={styles.infoValue}>
                  {request.scheduledDate 
                    ? `${new Date(request.scheduledDate).toLocaleDateString()} at ${new Date(request.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                    : 'Not set'}
                </Text>
              </View>
            </View>

            <View style={styles.infoGroup}>
              <Text style={styles.inputLabel}>Service Location</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                <Text style={styles.infoValue}>{request.location || 'No location provided'}</Text>
              </View>
            </View>

            <View style={styles.infoGroup}>
              <Text style={styles.inputLabel}>Request Status</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="information-circle-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '15', borderColor: getStatusColor(request.status) + '40' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                    ● {request.status || 'Pending'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Mutual Tracking Status Banner for Unaccepted Requests */}
            {!isAccepted && request.status?.toLowerCase() !== 'completed' && (
              <View style={styles.trackingNoticeCard}>
                <Ionicons name="shield-outline" size={20} color={colors.teal} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.trackingNoticeTitle}>Location Tracking Privacy</Text>
                  <Text style={styles.trackingNoticeText}>
                    You and the technician can locate each other once a technician accepts your request.
                  </Text>
                </View>
              </View>
            )}

            {request.technicianName && (
              <View style={styles.technicianCard}>
                <Text style={styles.kicker}>ASSIGNED</Text>
                <Text style={styles.technicianSectionTitle}>Technician</Text>
                
                <View style={styles.technicianInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{request.technicianName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.technicianDetails}>
                    <Text style={styles.technicianName}>{request.technicianName}</Text>
                    <View style={styles.verifiedRow}>
                      <Ionicons name="checkmark-circle" size={14} color="#059669" />
                      <Text style={styles.verified}>Verified Technician</Text>
                    </View>
                    <Text style={styles.rating}>⭐ 4.8</Text>
                  </View>
                </View>

                {/* 4-Digit Completion Code Card */}
                {isAccepted && request.verificationCode && (
                  <View style={styles.codeCard}>
                    <View style={styles.codeCardHeader}>
                      <Ionicons name="key-outline" size={18} color={colors.teal} />
                      <Text style={styles.codeCardTitle}>Job Completion Code</Text>
                    </View>
                    <View style={styles.codeDigitsRow}>
                      {String(request.verificationCode).split('').map((digit, idx) => (
                        <View key={idx} style={styles.codeDigitBox}>
                          <Text style={styles.codeDigitText}>{digit}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={styles.codeCardSub}>
                      Provide this 4-digit code to the technician ONLY after they finish repairing your device.
                    </Text>
                  </View>
                )}

                {/* Track on Live Map Button when Accepted */}
                {isAccepted && onTrackMap && (
                  <TouchableOpacity style={styles.trackMapButton} onPress={() => onTrackMap(request)}>
                    <Ionicons name="map" size={18} color={colors.white} style={{ marginRight: 8 }} />
                    <Text style={styles.primaryButtonText}>Track Technician on Live Map</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.messageButton} onPress={onMessageTechnician}>
                  <Ionicons name="chatbubble-outline" size={18} color={colors.ink} style={{ marginRight: 8 }} />
                  <Text style={styles.secondaryButtonText}>Message Technician</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.white },
  backButtonContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backButton: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  navTitle: { color: colors.muted, fontSize: 10, letterSpacing: 2, fontWeight: '800' },
  scrollContent: { flexGrow: 1, padding: 20 },
  headerContainer: { alignItems: 'center', marginBottom: 28, marginTop: 10 },
  brand: { color: colors.ink, fontSize: 32, fontWeight: '900', letterSpacing: -1.5 },
  brandAccent: { color: colors.teal },
  roleHeader: { color: colors.muted, fontSize: 10, letterSpacing: 2, fontWeight: '800', marginTop: 4 },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.line, shadowColor: '#102A43', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6, marginBottom: 20 },
  cardHeader: { marginBottom: 20 },
  kicker: { color: colors.teal, fontSize: 10, letterSpacing: 1.5, fontWeight: '800', marginBottom: 4 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '800' },
  form: { gap: 16 },
  infoGroup: { gap: 6 },
  inputLabel: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14, minHeight: 50 },
  textAreaContainer: { minHeight: 80, alignItems: 'flex-start' },
  inputIcon: { marginRight: 10, alignSelf: 'center' },
  infoValue: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, alignSelf: 'center' },
  statusText: { fontSize: 13, fontWeight: '800' },
  technicianCard: { backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16, marginTop: 8, gap: 12 },
  technicianSectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  technicianInfo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.teal, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: colors.white, fontSize: 20, fontWeight: '900' },
  technicianDetails: { flex: 1, gap: 2 },
  technicianName: { fontSize: 16, fontWeight: '800', color: colors.ink },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verified: { fontSize: 12, color: '#059669', fontWeight: '700' },
  rating: { fontSize: 13, color: '#D97706', fontWeight: '700', marginTop: 2 },
  messageButton: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  secondaryButtonText: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  trackMapButton: { backgroundColor: colors.teal, height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: colors.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  trackingNoticeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.tealLight, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#B2E2D8', marginTop: 4 },
  trackingNoticeTitle: { fontSize: 13, fontWeight: '800', color: colors.teal, marginBottom: 2 },
  trackingNoticeText: { fontSize: 12, color: colors.ink, lineHeight: 16 },
  codeCard: { backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#BBF7D0', alignItems: 'center', gap: 10, marginVertical: 4 },
  codeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  codeCardTitle: { fontSize: 13, fontWeight: '800', color: '#059669', letterSpacing: 0.5 },
  codeDigitsRow: { flexDirection: 'row', gap: 10, marginVertical: 4 },
  codeDigitBox: { width: 44, height: 48, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#059669', justifyContent: 'center', alignItems: 'center', shadowColor: '#059669', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  codeDigitText: { fontSize: 24, fontWeight: '900', color: colors.ink },
  codeCardSub: { fontSize: 11, color: '#065F46', textAlign: 'center', lineHeight: 15, fontWeight: '600' }
});