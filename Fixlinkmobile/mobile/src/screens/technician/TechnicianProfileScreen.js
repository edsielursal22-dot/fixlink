import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { fetchTechnicianProfile, uploadPortfolioPhotos } from '../services/api';
import Skeleton from '../../components/Skeleton';

export default function TechnicianProfileScreen({ technician, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadProfile = async () => {
    try {
      setProfile(await fetchTechnicianProfile(technician.uid));
    } catch (error) {
      Alert.alert('Profile unavailable', error.response?.data?.error || 'Unable to load your profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const choosePortfolioPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Photo permission needed', 'Allow photo access to add completed repair photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 6, quality: 0.75 });
    if (!result.canceled) setSelectedPhotos(result.assets);
  };

  const savePortfolio = async () => {
    if (!selectedPhotos.length) return;
    setUploading(true);
    try {
      const result = await uploadPortfolioPhotos(technician.uid, selectedPhotos);
      setProfile((current) => ({ ...current, portfolio: result.portfolio }));
      setSelectedPhotos([]);
      Alert.alert('Portfolio updated', 'Your completed repair photos are now in your portfolio.');
    } catch (error) {
      Alert.alert('Upload failed', error.response?.data?.error || 'Unable to upload portfolio photos.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <Skeleton style={{ width: 72, height: 72, borderRadius: 36, marginRight: 16 }} />
        <View style={styles.identity}>
          <Skeleton style={{ width: '80%', height: 26, marginBottom: 6 }} />
          <Skeleton style={{ width: '40%', height: 14 }} />
        </View>
      </View>
      <View style={styles.stats}>
        <Skeleton style={{ width: '30%', height: 60 }} />
        <Skeleton style={{ width: '30%', height: 60 }} />
        <Skeleton style={{ width: '30%', height: 60 }} />
      </View>
      <Skeleton style={{ width: '60%', height: 18, marginBottom: 12 }} />
      <Skeleton style={{ width: '100%', height: 40, marginBottom: 20 }} />
      <Skeleton style={{ width: '40%', height: 18, marginBottom: 12 }} />
      <View style={styles.photoGrid}>
        {[1,2,3].map(i => <Skeleton key={i} style={{ width: '31%', aspectRatio: 1 }} />)}
      </View>
    </View>
  );
  if (!profile) return <View style={styles.center}><Text style={styles.muted}>Profile could not be loaded.</Text></View>;
  const skills = Array.isArray(profile.skills)
    ? profile.skills
    : String(profile.skills || '').split(',').map((skill) => skill.trim()).filter(Boolean);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(profile.name || 'T').charAt(0).toUpperCase()}</Text></View>
        <View style={styles.identity}><Text style={styles.name}>{profile.name}</Text><Text style={styles.role}>Technician</Text>{profile.verified && <Text style={styles.badge}>Verified technician</Text>}</View>
      </View>
      <View style={styles.stats}><View><Text style={styles.statValue}>{profile.completedJobs}</Text><Text style={styles.statLabel}>Completed jobs</Text></View><View><Text style={styles.statValue}>{profile.averageRating || '—'}</Text><Text style={styles.statLabel}>Average rating</Text></View><View><Text style={styles.statValue}>{profile.yearsExperience || 0}</Text><Text style={styles.statLabel}>Years experience</Text></View></View>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeadingRow}><View><Text style={styles.kicker}>EXPERTISE</Text><Text style={styles.sectionTitle}>Skills and specializations</Text></View><Ionicons name="construct-outline" size={22} color="#0F766E" /></View>
        {skills.length > 0 ? <View style={styles.skillGrid}>{skills.map((skill) => <View key={skill} style={styles.skillChip}><Ionicons name="checkmark-circle" size={15} color="#0F766E" /><Text style={styles.skillText}>{skill}</Text></View>)}</View> : <Text style={styles.muted}>No skills listed.</Text>}
      </View>
      {profile.reviews && profile.reviews.length > 0 ? (
        <View>
          <Text style={styles.sectionTitle}>Reviews</Text>
          {profile.reviews.map((r, i) => <View key={i} style={styles.review}><Text style={styles.reviewRating}>{'★'.repeat(r.rating)}</Text><Text style={styles.bodyText}>{r.comment}</Text></View>)}
        </View>
      ) : <Text style={styles.muted}>No reviews yet.</Text>}
      <Text style={styles.sectionTitle}>Portfolio</Text>
      <Text style={styles.helper}>Add photos of completed repairs to help customers understand your work.</Text>
      <TouchableOpacity style={styles.secondaryButton} onPress={choosePortfolioPhotos}><Text style={styles.secondaryButtonText}>{selectedPhotos.length > 0 ? selectedPhotos.length + ' photo(s) selected' : 'Choose completed repair photos'}</Text></TouchableOpacity>
      {selectedPhotos.length > 0 && <View style={styles.photoGrid}>{selectedPhotos.map((photo) => <Image key={photo.uri} source={{ uri: photo.uri }} style={styles.photo} />)}</View>}
      {selectedPhotos.length > 0 && <TouchableOpacity style={styles.button} onPress={savePortfolio} disabled={uploading}>{uploading ? <ActivityIndicator color='#fff' /> : <Text style={styles.buttonText}>Save portfolio photos</Text>}</TouchableOpacity>}
      <View style={styles.photoGrid}>{(profile.portfolio || []).map((photo) => <Image key={photo.url} source={{ uri: photo.url }} style={styles.photo} />)}</View>
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}><Ionicons name="log-out-outline" size={18} color="#C2410C" /><Text style={styles.logoutText}>Log out</Text></TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#F5F8FA', flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F8FA' },
  profileHeader: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D9E2EC', borderRadius: 22, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 16, shadowColor: '#102A43', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  avatar: { width: 72, height: 72, borderRadius: 22, backgroundColor: '#0F766E', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: '#FFFFFF', fontSize: 30, fontWeight: '800' },
  identity: { flex: 1 },
  name: { color: '#102A43', fontSize: 24, fontWeight: '800' },
  role: { color: '#627D98', fontSize: 13, marginTop: 4, fontWeight: '600' },
  badge: { color: '#0F766E', fontWeight: '800', marginTop: 6, fontSize: 12 },
  stats: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D9E2EC', borderRadius: 18, padding: 18, marginBottom: 24, shadowColor: '#102A43', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  statValue: { color: '#0F766E', fontSize: 23, fontWeight: '800', textAlign: 'center' },
  statLabel: { color: '#627D98', fontSize: 11, marginTop: 6, fontWeight: '700', textAlign: 'center' },
  sectionTitle: { color: '#102A43', fontSize: 18, fontWeight: '800', marginTop: 8, marginBottom: 12 },
  kicker: { color: '#0F766E', fontSize: 10, letterSpacing: 1.4, fontWeight: '800', marginBottom: 4 },
  sectionCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D9E2EC', borderRadius: 18, padding: 16, marginBottom: 18 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E6F6F3', borderWidth: 1, borderColor: '#B9E8E1', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  skillText: { color: '#075E59', fontSize: 12, fontWeight: '800', flexShrink: 1 },
  bodyText: { color: '#486581', lineHeight: 22, fontSize: 14 },
  muted: { color: '#829AB1', fontStyle: 'italic' },
  review: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D9E2EC', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#102A43', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 7, elevation: 1 },
  reviewRating: { color: '#F59E0B', marginBottom: 8, fontSize: 18 },
  helper: { color: '#627D98', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  secondaryButton: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#D9E2EC', borderStyle: 'dashed' },
  secondaryButtonText: { color: '#0F766E', fontWeight: '800', fontSize: 14 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  photo: { width: '31%', aspectRatio: 1, borderRadius: 12 },
  button: { backgroundColor: '#0F766E', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 16, shadowColor: '#0F766E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  logoutButton: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA', backgroundColor: '#FFF7ED', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22 },
  logoutText: { color: '#C2410C', fontSize: 14, fontWeight: '800' },
});