import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import DashboardScreen from '../screens/customer/DashboardScreen';
import SubmitRequestScreen from '../screens/customer/SubmitRequestScreen';
import RequestProgressScreen from '../screens/customer/RequestProgressScreen';
import RequestDetailsScreen from '../screens/customer/RequestDetailsScreen';
import CustomerProfileScreen from '../screens/customer/CustomerProfileScreen';
import ChatScreen from '../screens/customer/ChatScreen';
import MapTrackerScreen from '../screens/shared/MapTrackerScreen';
import AvailableJobsScreen from '../screens/technician/AvailableJobsScreen';
import TechnicianProfileScreen from '../screens/technician/TechnicianProfileScreen';

const colors = { ink: '#102A43', teal: '#0F766E', canvas: '#F5F8FA', white: '#FFFFFF', muted: '#829AB1', line: '#D9E2EC' };

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [customerTab, setCustomerTab] = useState('dashboard');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [technicianTab, setTechnicianTab] = useState('jobs');
  const [selectedJobForMap, setSelectedJobForMap] = useState(null);
  const [selectedChatTarget, setSelectedChatTarget] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const handleLogout = () => { 
    setUser(null); 
    setCustomerTab('dashboard'); 
    setTechnicianTab('jobs'); 
    setSelectedJobForMap(null); 
    setSelectedChatTarget(null);
    setAuthMode('login'); 
  };
  const isCustomer = user?.role === 'customer';
  const customerTabs = [
    { key: 'dashboard', label: 'Home', icon: 'home' },
    { key: 'progress', label: 'Requests', icon: 'receipt' },
    { key: 'chat', label: 'Messages', icon: 'chatbubble-ellipses' },
    { key: 'profile', label: 'Profile', icon: 'person' },
  ];
  const techTabs = [
    { key: 'jobs', label: 'Jobs', icon: 'briefcase' },
    { key: 'map', label: 'Map', icon: 'map' },
    { key: 'chat', label: 'Messages', icon: 'chatbubble-ellipses' },
    { key: 'profile', label: 'Profile', icon: 'person' },
  ];

  if (!user) return (
    <SafeAreaView style={styles.authContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
      {authMode === 'login' ? <LoginScreen onLoginSuccess={setUser} switchToRegister={() => setAuthMode('register')} switchToForgotPassword={() => setAuthMode('forgotPassword')} /> : authMode === 'register' ? <RegisterScreen switchToLogin={() => setAuthMode('login')} /> : <ForgotPasswordScreen switchToLogin={() => setAuthMode('login')} />}
    </SafeAreaView>
  );

  const activeTab = isCustomer ? customerTab : technicianTab;
  const setTab = isCustomer ? setCustomerTab : setTechnicianTab;
  const navItems = isCustomer ? customerTabs : techTabs;
  const screen = isCustomer ? (
    customerTab === 'dashboard' ? <DashboardScreen user={user} onNavigateToSubmit={() => setCustomerTab('submit')} onNavigateToProgress={() => setCustomerTab('progress')} /> :
    customerTab === 'submit' ? <SubmitRequestScreen currentUser={user} customerName={user.name} onNavigateToProgress={() => setCustomerTab('progress')} /> :
    customerTab === 'details' ? <RequestDetailsScreen request={selectedRequest} onBack={() => setCustomerTab('progress')} onMessageTechnician={() => { setSelectedChatTarget(selectedRequest); setCustomerTab('chat'); }} onTrackMap={(req) => { setSelectedRequest(req); setCustomerTab('map'); }} /> :
    customerTab === 'progress' ? <RequestProgressScreen customerName={user.name} onViewDetails={(req) => { setSelectedRequest(req); setCustomerTab('details'); }} onTrackMap={(req) => { setSelectedRequest(req); setCustomerTab('map'); }} /> :
    customerTab === 'map' ? <MapTrackerScreen currentUser={user} selectedJob={selectedRequest} onBack={() => setCustomerTab('progress')} /> :
    customerTab === 'profile' ? <CustomerProfileScreen user={user} onLogout={handleLogout} /> : 
    <ChatScreen currentUser={user} initialTarget={selectedChatTarget} />
  ) : (
    technicianTab === 'jobs' ? <AvailableJobsScreen technician={user} onNavigateToMap={(job) => { setSelectedJobForMap(job); setTechnicianTab('map'); }} onNavigateToChat={(job) => { setSelectedChatTarget(job); setTechnicianTab('chat'); }} /> : 
    technicianTab === 'map' ? <MapTrackerScreen currentUser={user} selectedJob={selectedJobForMap} onNavigateToJobs={() => setTechnicianTab('jobs')} /> : 
    technicianTab === 'chat' ? <ChatScreen currentUser={user} initialTarget={selectedChatTarget} /> :
    <TechnicianProfileScreen technician={user} onLogout={handleLogout} />
  );

  // Determine if the header should be shown (Only when on Home/Dashboard for customer, or Jobs for technician)
  const showHeader = isCustomer ? customerTab === 'dashboard' : technicianTab === 'jobs';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
      
      {/* Top Bar is now conditional: only rendered on the Home/Dashboard screen */}
      {showHeader && (
        <View style={styles.topBar}>
          <View>
            <Text style={styles.brand}>fix<Text style={styles.brandAccent}>link</Text></Text>
            <Text style={styles.role}>{isCustomer ? 'HOME SERVICES' : 'TECHNICIAN HUB'}</Text>
          </View>
          <TouchableOpacity style={styles.notification} onPress={() => setNotificationsOpen(true)}>
            <Ionicons name="notifications-outline" size={21} color={colors.ink} />
            <View style={styles.dot} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.screenContainer}>{screen}</View>

      <Modal visible={notificationsOpen} transparent animationType="fade" onRequestClose={() => setNotificationsOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setNotificationsOpen(false)}>
          <TouchableOpacity style={styles.notificationPanel} activeOpacity={1}>
            <View style={styles.panelHeader}><View><Text style={styles.panelKicker}>FIXLINK UPDATES</Text><Text style={styles.panelTitle}>Notifications</Text></View><TouchableOpacity style={styles.closeButton} onPress={() => setNotificationsOpen(false)}><Ionicons name="close" size={18} color={colors.ink} /></TouchableOpacity></View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.notice}><View style={styles.noticeIcon}><Ionicons name="checkmark-circle" size={19} color={colors.teal} /></View><View style={styles.noticeCopy}><Text style={styles.noticeTitle}>You’re all set</Text><Text style={styles.noticeText}>Your FixLink account is ready for service requests.</Text><Text style={styles.noticeTime}>Just now</Text></View></View>
              <View style={styles.notice}><View style={[styles.noticeIcon, styles.noticeIconGold]}><Ionicons name="sparkles" size={18} color="#B7791F" /></View><View style={styles.noticeCopy}><Text style={styles.noticeTitle}>{isCustomer ? 'Need something fixed?' : 'New jobs nearby'}</Text><Text style={styles.noticeText}>{isCustomer ? 'Add a request and we’ll match you with a verified technician.' : 'Refresh your jobs feed to see the latest repair requests.'}</Text><Text style={styles.noticeTime}>Today</Text></View></View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <View style={styles.bottomNav}>{navItems.map((item) => { const active = activeTab === item.key || (item.key === 'progress' && ['submit', 'details', 'map'].includes(activeTab)); return <TouchableOpacity key={item.key} style={styles.navItem} onPress={() => setTab(item.key)}><View style={[styles.navIcon, active && styles.navIconActive]}><Ionicons name={active ? item.icon : `${item.icon}-outline`} size={20} color={active ? colors.teal : colors.muted} /></View><Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text></TouchableOpacity>; })}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas }, authContainer: { flex: 1, backgroundColor: colors.canvas }, screenContainer: { flex: 1 },
  topBar: { minHeight: 76, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, backgroundColor: colors.canvas, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: colors.ink, fontSize: 25, fontWeight: '900', letterSpacing: -1.2 }, brandAccent: { color: colors.teal }, role: { color: colors.muted, fontSize: 9, letterSpacing: 1.5, fontWeight: '800', marginTop: 3 },
  notification: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }, dot: { position: 'absolute', top: 9, right: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(16,42,67,0.26)', alignItems: 'flex-end', paddingTop: 86, paddingHorizontal: 16 }, notificationPanel: { width: '100%', maxWidth: 390, maxHeight: 430, backgroundColor: colors.white, borderRadius: 22, padding: 20, shadowColor: '#102A43', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 12 }, panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, panelKicker: { color: colors.teal, fontSize: 10, letterSpacing: 1.5, fontWeight: '800', marginBottom: 5 }, panelTitle: { color: colors.ink, fontSize: 23, fontWeight: '800' }, closeButton: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }, notice: { flexDirection: 'row', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.line }, noticeIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#E6F6F3', alignItems: 'center', justifyContent: 'center' }, noticeIconGold: { backgroundColor: '#FFF8E7' }, noticeCopy: { flex: 1 }, noticeTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: 4 }, noticeText: { color: colors.muted, fontSize: 12, lineHeight: 17 }, noticeTime: { color: colors.muted, fontSize: 10, marginTop: 6, fontWeight: '700' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 9, paddingBottom: 8, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line }, navItem: { alignItems: 'center', minWidth: 65 }, navIcon: { width: 42, height: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, navIconActive: { backgroundColor: '#E6F6F3' }, navLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 3 }, navLabelActive: { color: colors.teal },
});