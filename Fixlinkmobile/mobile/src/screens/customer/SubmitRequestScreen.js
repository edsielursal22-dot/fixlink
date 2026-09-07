import React, { useState } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Modal, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { submitRepairRequest } from "../services/api";
import { geocodeAddress } from "../services/locationIq";

const colors = { ink: '#102A43', teal: '#0F766E', canvas: '#F5F8FA', white: '#FFFFFF', muted: '#829AB1', line: '#D9E2EC', error: '#E53935' };

const APPLIANCE_OPTIONS = [
  'Router / Wi-Fi Equipment', 
  'Tablet', 
  'Home Theater / Speaker System', 
  'Printer', 
  'Water Heater', 
  'CCTV / Security Camera', 
  'Laptop', 
  'Electric Stove / Induction Cooker', 
  'Computer Monitor', 
  'Washing Machine', 
  'Refrigerator', 
  'Power Bank / Charger', 
  'Computer Keyboard / Mouse', 
  'Desktop Computer (System Unit)', 
  'Mobile Phone', 
  'Others'
];

export default function SubmitRequestScreen({ currentUser, customerName, onNavigateToProgress }) {
  const [applianceType, setApplianceType] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState(null);
  const [customAppliance, setCustomAppliance] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [mode, setMode] = useState('date');
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const handleLocate = async () => {
    setLocating(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocating(false);
      Alert.alert('Permission Denied', 'Permission to access location was denied');
      return;
    }

    try {
      let locationData = await Location.getCurrentPositionAsync({});
      const lat = locationData.coords.latitude;
      const lon = locationData.coords.longitude;
      setCoords({ latitude: lat, longitude: lon });

      let geocode = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lon
      });
      
      if (geocode && geocode.length > 0) {
        const address = geocode[0];
        const formattedAddress = `${address.street || ''} ${address.city || ''} ${address.region || ''}`.trim();
        setLocation(formattedAddress || `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`);
      } else {
        setLocation(`Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch location details.');
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (!applianceType || !description || !location || (applianceType === 'Others' && !customAppliance)) {
      Alert.alert("Error", "Please fill out all required fields.");
      return;
    }
    setLoading(true);
    try {
      let finalCoords = coords;
      // If customer manually typed address without clicking Locate Me, geocode using LocationIQ
      if (!finalCoords && location) {
        try {
          const geocoded = await geocodeAddress(location);
          if (geocoded) {
            finalCoords = { latitude: geocoded.latitude, longitude: geocoded.longitude };
          }
        } catch (geoErr) {
          console.warn('Geocoding fallback failed:', geoErr);
        }
      }

      const finalApplianceType = applianceType === 'Others' ? customAppliance : applianceType;
      await submitRepairRequest({ 
        customerName: currentUser?.name || customerName,
        customerUid: currentUser?.uid,
        applianceType: finalApplianceType, 
        description, 
        location, 
        ...(finalCoords?.latitude && { latitude: finalCoords.latitude }),
        ...(finalCoords?.longitude && { longitude: finalCoords.longitude }),
        isOther: applianceType === 'Others',
        scheduledDate: date
      });
      
      Alert.alert(
        "Request Submitted!",
        "We're finding a technician that matches your request.",
        [
          { text: "View Progress", onPress: onNavigateToProgress }
        ]
      );

      setApplianceType("");
      setDescription("");
      setLocation("");
      setCoords(null);
      setCustomAppliance("");
      setDate(new Date());
    } catch (error) {
      Alert.alert("Error", "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeaderContainer}>
        <Text style={styles.kicker}>NEW SERVICE</Text>
        <Text style={styles.sectionTitle}>Submit Repair Request</Text>
      </View>

      <View style={styles.card}>
        {/* Appliance Type Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.kicker}>APPLIANCE</Text>
          <Text style={styles.inputLabel}>Appliance Type</Text>
          <TouchableOpacity style={styles.selectInput} onPress={() => setModalVisible(true)} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
              <Ionicons name="hardware-chip-outline" size={18} color={colors.muted} />
              <Text style={[styles.selectInputText, !applianceType && { color: colors.muted }]}>
                {applianceType || "Select Appliance Type"}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.kicker}>DETAILS</Text>
          <Text style={styles.inputLabel}>Description</Text>
          <View style={styles.textAreaContainer}>
            <Ionicons name="chatbox-outline" size={18} color={colors.muted} style={{ marginTop: 2 }} />
            <TextInput 
              style={styles.textArea} 
              placeholder="Describe the issue in detail..." 
              placeholderTextColor={colors.muted}
              value={description} 
              onChangeText={setDescription} 
              multiline 
            />
          </View>
        </View>

        {/* Preferred Schedule */}
        <View style={styles.inputGroup}>
          <Text style={styles.kicker}>TIMELINE</Text>
          <Text style={styles.inputLabel}>Preferred Schedule</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.selectInput, { flex: 1 }]} onPress={() => { setMode('date'); setShowDatePicker(true); }} activeOpacity={0.7}>
              <Ionicons name="calendar-outline" size={16} color={colors.teal} />
              <Text style={styles.selectInputText}>{date.toLocaleDateString()}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.selectInput, { flex: 1 }]} onPress={() => { setMode('time'); setShowDatePicker(true); }} activeOpacity={0.7}>
              <Ionicons name="time-outline" size={16} color={colors.teal} />
              <Text style={styles.selectInputText}>{date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode={mode}
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        {/* Location Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.kicker}>LOCATION</Text>
          <Text style={styles.inputLabel}>Service Location</Text>
          <View style={styles.locationContainer}>
            <View style={[styles.selectInput, { flex: 1, marginBottom: 0 }]}>
              <Ionicons name="location-outline" size={18} color={colors.muted} />
              <TextInput 
                style={[styles.selectInputText, { paddingVertical: 0, flex: 1 }]} 
                placeholder="Enter or detect your location" 
                placeholderTextColor={colors.muted}
                value={location} 
                onChangeText={(text) => {
                  setLocation(text);
                  setCoords(null);
                }} 
              />
            </View>
            <TouchableOpacity style={styles.locateButton} onPress={handleLocate} activeOpacity={0.8} disabled={locating}>
              {locating ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="locate" size={16} color={colors.white} />
                  <Text style={styles.locateButtonText}>Locate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>Submit Request</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Selection Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.sectionTitle}>Select Appliance</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color={colors.ink} />
              </TouchableOpacity>
            </View>

            {applianceType === 'Others' && (
              <View style={{ marginBottom: 12 }}>
                <TextInput 
                  style={styles.selectInput} 
                  placeholder="Please specify device type" 
                  placeholderTextColor={colors.muted}
                  value={customAppliance} 
                  onChangeText={setCustomAppliance}
                />
              </View>
            )}

            <FlatList
              data={APPLIANCE_OPTIONS}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { setApplianceType(item); setModalVisible(false); }} activeOpacity={0.7}>
                  <Text style={styles.modalItemText}>{item}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, padding: 20, backgroundColor: colors.canvas },
  sectionHeaderContainer: { marginBottom: 16, marginTop: 10 },
  kicker: { color: colors.teal, fontSize: 10, letterSpacing: 1.5, fontWeight: '800', marginBottom: 2 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.line, shadowColor: '#102A43', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  
  selectInput: { height: 52, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectInputText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  
  textAreaContainer: { backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', gap: 10, minHeight: 100 },
  textArea: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink, textAlignVertical: 'top', paddingTop: 0 },
  
  row: { flexDirection: 'row', gap: 12 },
  
  locationContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locateButton: { backgroundColor: colors.teal, height: 52, paddingHorizontal: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6, shadowColor: '#0F766E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  locateButtonText: { color: colors.white, fontSize: 13, fontWeight: '800' },

  primaryButton: { backgroundColor: colors.teal, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: '#0F766E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(16, 42, 67, 0.4)', justifyContent: 'flex-end' },
  modalView: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '75%', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  modalCloseIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.canvas, justifyContent: 'center', alignItems: 'center' },
  modalItem: { paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalItemText: { fontSize: 15, fontWeight: '600', color: colors.ink }
});