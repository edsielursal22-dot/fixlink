import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const colors = {
  ink: '#102A43',
  muted: '#627D98',
  line: '#D9E2EC',
  canvas: '#F5F8FA',
  teal: '#0F766E',
  tealDark: '#075E59',
  orange: '#F59E0B',
  white: '#FFFFFF',
};

export default function DashboardScreen({ user, onNavigateToSubmit, onNavigateToProgress, onTrackAcceptedJob }) {
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  eyebrow: { color: colors.teal, fontSize: 11, letterSpacing: 1.5, fontWeight: '800', marginBottom: 8 },
  greeting: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  heroCopy: { color: colors.muted, fontSize: 14, marginTop: 7 },
  avatar: { width: 48, height: 48, borderRadius: 18, backgroundColor: '#D7F0ED', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.tealDark, fontSize: 18, fontWeight: '800' },
  statusCard: { backgroundColor: colors.white, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, marginBottom: 28 },
  statusIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#E6F6F3', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  statusText: { flex: 1 }, statusTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: 3 }, statusCopy: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  primaryAction: { flex: 1, minHeight: 184, backgroundColor: colors.teal, borderRadius: 20, padding: 16, overflow: 'hidden' },
  secondaryAction: { flex: 1, minHeight: 184, backgroundColor: colors.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  actionIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 23 },
  secondaryIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#E6F6F3', alignItems: 'center', justifyContent: 'center', marginBottom: 23 },
  primaryActionTitle: { color: colors.white, fontSize: 16, fontWeight: '800', marginBottom: 5 }, secondaryActionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginBottom: 5 },
  primaryActionCopy: { color: '#C7F1EC', fontSize: 12, lineHeight: 17 }, secondaryActionCopy: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  actionArrow: { position: 'absolute', right: 16, bottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, viewAll: { color: colors.teal, fontWeight: '800', fontSize: 13, marginBottom: 12 },
  emptyCard: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  emptyIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#E6F6F3', alignItems: 'center', justifyContent: 'center', marginRight: 12 }, emptyText: { flex: 1 }, emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: 3 }, emptyCopy: { color: colors.muted, fontSize: 12 },
  tipCard: { backgroundColor: '#FFF8E7', borderRadius: 18, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, tipTitle: { color: '#8A5B00', fontWeight: '800', fontSize: 13, marginBottom: 4 }, tipCopy: { color: '#9A711E', fontSize: 12, lineHeight: 17 },
});
