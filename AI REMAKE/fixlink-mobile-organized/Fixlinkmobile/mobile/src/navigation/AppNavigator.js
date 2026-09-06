import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import SubmitRequestScreen from '../screens/customer/SubmitRequestScreen';
import AvailableJobsScreen from '../screens/technician/AvailableJobsScreen';

export default function AppNavigator() {
  const [user, setUser] = useState(null); // Holds user info after login
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

  // If user is NOT logged in, show Auth screens
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
        <View style={styles.screenContainer}>
          {authMode === 'login' ? (
            <LoginScreen 
              onLoginSuccess={(userData) => setUser(userData)} 
              switchToRegister={() => setAuthMode('register')} 
            />
          ) : (
            <RegisterScreen 
              switchToLogin={() => setAuthMode('login')} 
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // If user IS logged in, render their respective dashboard
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      
      <View style={styles.headerBar}>
        <Text style={styles.welcomeText}>Welcome, {user.name} ({user.role})</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={() => setUser(null)}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.screenContainer}>
        {user.role === 'customer' ? <SubmitRequestScreen /> : <AvailableJobsScreen />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  headerBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#e9ecef',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ced4da',
  },
  welcomeText: { fontSize: 14, fontWeight: '600', color: '#495057' },
  logoutButton: { backgroundColor: '#dc3545', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4 },
  logoutText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  screenContainer: { flex: 1 },
});