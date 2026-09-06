import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { forgotPassword } from '../services/api';
import AppButton from '../../components/AppButton';

export default function ForgotPasswordScreen({ switchToLogin }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await forgotPassword({ email });
      setIsSent(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to send password reset instructions.');
    } finally {
      setLoading(false);
    }
  };

  if (isSent) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Ionicons name="mail-open-outline" size={70} color="#0F766E" />
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.subTitle}>We have sent password recovery instructions to your email address.</Text>
          <AppButton title="Back to Login" icon="arrow-back" onPress={switchToLogin} style={styles.btn} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subTitle}>Enter your registered email to receive recovery steps.</Text>
        
        <Text style={styles.label}>Email Address</Text>
        <TextInput 
          style={styles.input} 
          placeholder="name@example.com" 
          placeholderTextColor="#829AB1" 
          value={email} 
          onChangeText={setEmail} 
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <AppButton title="Send Reset Link" loading={loading} onPress={handleReset} style={styles.btn} />
        
        <Pressable onPress={switchToLogin} style={styles.backLink}>
          <Text style={styles.backLinkTxt}>Remember your password? <Text style={styles.linkAccent}>Sign in</Text></Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#F5F8FA' },
  card: { backgroundColor: '#fff', padding: 24, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#102A43', marginBottom: 8, textAlign: 'center' },
  subTitle: { fontSize: 14, color: '#829AB1', textAlign: 'center', marginBottom: 20 },
  label: { alignSelf: 'flex-start', fontSize: 14, fontWeight: '600', color: '#102A43', marginBottom: 8 },
  input: { width: '100%', backgroundColor: '#fff', padding: 15, marginBottom: 15, borderRadius: 12, borderWidth: 1, borderColor: '#D9E2EC', color: '#102A43' },
  btn: { width: '100%', marginTop: 10 },
  backLink: { marginTop: 20, alignItems: 'center' },
  backLinkTxt: { fontSize: 14, color: '#829AB1' },
  linkAccent: { color: '#0F766E', fontWeight: 'bold' }
});
