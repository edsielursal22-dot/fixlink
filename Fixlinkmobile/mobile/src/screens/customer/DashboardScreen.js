import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../theme';

const colors = {
  ink: '#102A43',
  muted: '#5A7A91',
  line: '#D9E2EC',
  canvas: '#F5F8FA',
  teal: '#0F766E',
  tealDark: '#075E59',
  orange: '#F59E0B',
  white: '#FFFFFF',
};

export default function DashboardScreen({ user, notificationCount = 0, onOpenNotifications, onNavigateToSubmit, onNavigateToProgress, onTrackAcceptedJob }) {
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brand}>FIX<Text style={styles.brandAccent}>LINK</Text></Text>
          <Text style={styles.role}>HOME SERVICES</Text>
        </View>
        <TouchableOpacity style={styles.notification} onPress={onOpenNotifications}>
          <Ionicons name="notifications-outline" size={21} color={colors.ink} />
          {notificationCount > 0 && (
            <View style={styles.dot}>
              <Text style={styles.dotText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.heroRow}>
        <View>
          <Text style={styles.eyebrow}>CUSTOMER SPACE</Text>
          <Text style={styles.greeting}>Good day, {firstName}</Text>
          <Text style={styles.heroCopy}>Let’s get your home back in shape.</Text>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text></View>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusIcon}><Ionicons name="shield-checkmark" size={22} color={colors.teal} /></View>
        <View style={styles.statusText}>
          <Text style={styles.statusTitle}>Your home, in good hands</Text>
          <Text style={styles.statusCopy}>Verified technicians are ready when you need them.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </View>

      <Text style={styles.sectionTitle}>What do you need today?</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.primaryAction} onPress={onNavigateToSubmit} activeOpacity={0.88}>
          <View style={styles.actionIcon}><Ionicons name="add" size={25} color={colors.white} /></View>
          <Text style={styles.primaryActionTitle}>New request</Text>
          <Text style={styles.primaryActionCopy}>Tell us what needs fixing</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} style={styles.actionArrow} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryAction} onPress={onTrackAcceptedJob || onNavigateToProgress} activeOpacity={0.88}>
          <View style={styles.secondaryIcon}><Ionicons name="pulse" size={23} color={colors.teal} /></View>
          <Text style={styles.secondaryActionTitle}>Track a job</Text>
          <Text style={styles.secondaryActionCopy}>See live request updates</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.teal} style={styles.actionArrow} />
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your activity</Text>
        <TouchableOpacity onPress={onNavigateToProgress}><Text style={styles.viewAll}>View all</Text></TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.emptyCard} onPress={onNavigateToProgress} activeOpacity={0.85}>
        <View style={styles.emptyIcon}><Ionicons name="receipt-outline" size={22} color={colors.teal} /></View>
        <View style={styles.emptyText}><Text style={styles.emptyTitle}>No active requests yet</Text><Text style={styles.emptyCopy}>Your service updates will appear here.</Text></View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </TouchableOpacity>

      <View style={styles.tipCard}>
        <Ionicons name="sparkles-outline" size={21} color={colors.orange} />
        <View style={{ flex: 1 }}><Text style={styles.tipTitle}>Quick tip</Text><Text style={styles.tipCopy}>Add a photo to your request so technicians can prepare before they arrive.</Text></View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 20, paddingBottom: 32 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  brand: { color: colors.ink, fontSize: 18, fontFamily: fonts.extraBold },
  brandAccent: { color: colors.teal },
  role: { color: colors.muted, fontSize: 9, letterSpacing: 1.5, fontFamily: fonts.bold, marginTop: 3 },
  notification: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  dot: { position: 'absolute', top: 5, right: 5, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  dotText: { color: colors.white, fontSize: 9, fontFamily: fonts.extraBold },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  eyebrow: { color: colors.teal, fontSize: 11, letterSpacing: 1.5, fontFamily: fonts.bold, marginBottom: 8 },
  greeting: { color: colors.ink, fontSize: 28, fontFamily: fonts.bold, letterSpacing: -0.8 },
  heroCopy: { color: colors.muted, fontSize: 14, marginTop: 7 },
  avatar: { width: 48, height: 48, borderRadius: 18, backgroundColor: '#D7F0ED', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.tealDark, fontSize: 18, fontFamily: fonts.bold },
  statusCard: { backgroundColor: colors.white, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, marginBottom: 28 },
  statusIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#E6F6F3', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  statusText: { flex: 1 }, statusTitle: { color: colors.ink, fontSize: 14, fontFamily: fonts.bold, marginBottom: 3 }, statusCopy: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontFamily: fonts.bold, letterSpacing: -0.3, marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  primaryAction: { flex: 1, minHeight: 184, backgroundColor: colors.teal, borderRadius: 20, padding: 16, overflow: 'hidden' },
  secondaryAction: { flex: 1, minHeight: 184, backgroundColor: colors.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  actionIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 23 },
  secondaryIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#E6F6F3', alignItems: 'center', justifyContent: 'center', marginBottom: 23 },
  primaryActionTitle: { color: colors.white, fontSize: 16, fontFamily: fonts.bold, marginBottom: 5 }, secondaryActionTitle: { color: colors.ink, fontSize: 16, fontFamily: fonts.bold, marginBottom: 5 },
  primaryActionCopy: { color: '#C7F1EC', fontSize: 12, lineHeight: 17 }, secondaryActionCopy: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  actionArrow: { position: 'absolute', right: 16, bottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, viewAll: { color: colors.teal, fontFamily: fonts.bold, fontSize: 13, marginBottom: 12 },
  emptyCard: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  emptyIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#E6F6F3', alignItems: 'center', justifyContent: 'center', marginRight: 12 }, emptyText: { flex: 1 }, emptyTitle: { color: colors.ink, fontSize: 14, fontFamily: fonts.bold, marginBottom: 3 }, emptyCopy: { color: colors.muted, fontSize: 12 },
  tipCard: { backgroundColor: '#FFF8E7', borderRadius: 18, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, tipTitle: { color: '#8A5B00', fontFamily: fonts.bold, fontSize: 13, marginBottom: 4 }, tipCopy: { color: '#9A711E', fontSize: 12, lineHeight: 17 },
});
