import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Modal, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import DateTimePicker from "../../components/DateTimePicker";
import { submitRepairRequest, fetchPlatformCategories } from "../services/api";
import { geocodeAddress } from "../services/locationIq";
import { fonts } from '../../theme';

const colors = { ink: '#102A43', teal: '#0F766E', canvas: '#F5F8FA', white: '#FFFFFF', muted: '#5A7A91', line: '#D9E2EC', error: '#E53935' };

const APPLIANCE_OPTIONS = [
  'Home Appliances',
  'Mobile Devices',
  'Networking & Internet Devices',
  'Television & Entertainment',
  'Computer & Laptop',
  'Personal & Beauty Electronics',
  'Air Conditioning & Cooling',
  'Office & Business Equipment',
  'Other Electronic Devices',
  'CCTV & Security Devices'
];

const TIME_SLOTS = [
  'Morning (8AM-12PM)',
  'Afternoon (1PM-5PM)',
  'Evening (5PM-8PM)'
];

export default function SubmitRequestScreen({ currentUser, customerName, onNavigateToProgress }) {
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [selectedDevice, setSelectedDevice] = useState("");
  const [drillCategory, setDrillCategory] = useState(null);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState(null);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [date, setDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('Afternoon (1PM-5PM)');
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [mode, setMode] = useState('date');
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    fetchPlatformCategories().then(setCategoryOptions).catch(() => setCategoryOptions([]));
  }, []);

  const applianceOptions = categoryOptions.length
    ? categoryOptions.map((category) => String(category.name || '').trim()).filter(Boolean)
    : APPLIANCE_OPTIONS;

  const displayAppliance = selectedDevice
    ? `${selectedCategoryName} — ${selectedDevice}`
    : selectedCategoryName || "Select Appliance Type";

  const pickCategory = (category) => {
    const devices = Array.isArray(category.devices) ? category.devices.map((device) => String(device).trim()).filter(Boolean) : [];
    if (devices.length === 0) {
      setSelectedCategoryName(category.name);
      setSelectedDevice("");
      setModalVisible(false);
      return;
    }
    setDrillCategory({ ...category, devices });
  };

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

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event?.type === 'dismissed' || !selectedDate) return;

    if (mode === 'date') {
      const updated = new Date(date);
      updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setDate(updated);
    } else {
      const updated = new Date(date);
      updated.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      setDate(updated);
      const formattedTime = selectedDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      setSelectedTimeSlot(formattedTime);
      setIsCustomTime(true);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCategoryName || !description || !location) {
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

      const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const finalPreferredTime = selectedTimeSlot || date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

      const finalApplianceType = selectedDevice || selectedCategoryName;

      await submitRepairRequest({ 
        customerName: currentUser?.name || customerName,
        customerUid: currentUser?.uid,
        applianceType: finalApplianceType, 
        category: selectedCategoryName,
        description, 
        location, 
        ...(finalCoords?.latitude && { latitude: finalCoords.latitude }),
        ...(finalCoords?.longitude && { longitude: finalCoords.longitude }),
        preferredDate: formattedDate,
        preferredTime: finalPreferredTime,
        scheduledDate: date.toISOString()
      });
      
      Alert.alert(
        "Request Submitted!",
        "We're finding a technician that matches your request.",
        [
          { text: "View Progress", onPress: onNavigateToProgress }
        ]
      );

      setSelectedCategoryName("");
      setSelectedDevice("");
      setDrillCategory(null);
      setDescription("");
      setLocation("");
      setCoords(null);
      setDate(new Date());
      setSelectedTimeSlot('Afternoon (1PM-5PM)');
      setIsCustomTime(false);
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
              <Text numberOfLines={1} style={[styles.selectInputText, !selectedCategoryName && { color: colors.muted }]}>
                {displayAppliance}
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
          
          <TouchableOpacity 
            style={styles.selectInput} 
            onPress={() => { setMode('date'); setShowDatePicker(true); }} 
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="calendar-outline" size={18} color={colors.teal} />
              <Text style={styles.selectInputText}>
                {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={colors.muted} />
          </TouchableOpacity>

          <Text style={[styles.inputLabel, { fontSize: 12, marginTop: 12, marginBottom: 6 }]}>Preferred Time Window</Text>
          <View style={styles.slotContainer}>
            {TIME_SLOTS.map((slot) => {
              const isActive = selectedTimeSlot === slot && !isCustomTime;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[styles.slotChip, isActive && styles.slotChipActive]}
                  onPress={() => {
                    setSelectedTimeSlot(slot);
                    setIsCustomTime(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.slotChipText, isActive && styles.slotChipTextActive]}>{slot}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.slotChip, isCustomTime && styles.slotChipActive]}
              onPress={() => {
                setMode('time');
                setShowDatePicker(true);
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="time-outline" size={14} color={isCustomTime ? colors.teal : colors.muted} />
                <Text style={[styles.slotChipText, isCustomTime && styles.slotChipTextActive]}>
                  {isCustomTime ? selectedTimeSlot : 'Exact Time...'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode={mode}
            minimumDate={mode === 'date' ? new Date() : undefined}
            display="default"
            onChange={handleDateChange}
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
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => { setModalVisible(false); setDrillCategory(null); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              {drillCategory ? (
                <TouchableOpacity style={styles.modalBackIcon} onPress={() => setDrillCategory(null)} activeOpacity={0.7}>
                  <Ionicons name="arrow-back" size={20} color={colors.ink} />
                </TouchableOpacity>
              ) : <View style={styles.modalBackIcon} />}

              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={styles.sectionTitle}>{drillCategory ? 'Select Device' : 'Select Appliance'}</Text>
                {drillCategory ? (
                  <Text style={styles.modalSubtitle}>{drillCategory.name}</Text>
                ) : (
                  <Text style={styles.modalSubtitle}>Choose a category then pick your device</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => { setModalVisible(false); setDrillCategory(null); }} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color={colors.ink} />
              </TouchableOpacity>
            </View>

            {drillCategory ? (
              <FlatList
                data={drillCategory.devices}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = selectedCategoryName === drillCategory.name && selectedDevice === item;
                  return (
                    <TouchableOpacity
                      style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                      onPress={() => { setSelectedCategoryName(drillCategory.name); setSelectedDevice(item); setDrillCategory(null); setModalVisible(false); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>{item}</Text>
                      {isSelected ? <Ionicons name="checkmark-circle" size={18} color={colors.teal} /> : <Ionicons name="chevron-forward" size={16} color={colors.muted} />}
                    </TouchableOpacity>
                  );
                }}
              />
            ) : (
              <FlatList
                data={applianceOptions}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const category = categoryOptions.find((c) => String(c.name || '').trim() === item);
                  const deviceCount = category && Array.isArray(category.devices) ? category.devices.filter(Boolean).length : 0;
                  const isSelected = selectedCategoryName === item;
                  return (
                    <TouchableOpacity
                      style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                      onPress={() => pickCategory(category || { name: item, devices: [] })}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>{item}</Text>
                        {deviceCount > 0 && <Text style={styles.modalItemCount}>{deviceCount} devices</Text>}
                      </View>
                      {isSelected ? <Ionicons name="checkmark-circle" size={18} color={colors.teal} /> : <Ionicons name="chevron-forward" size={16} color={colors.muted} />}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, padding: 20, backgroundColor: colors.canvas },
  sectionHeaderContainer: { marginBottom: 16, marginTop: 10 },
  kicker: { color: colors.teal, fontSize: 10, letterSpacing: 1.5, fontFamily: fonts.bold, marginBottom: 2 },
  sectionTitle: { fontSize: 20, fontFamily: fonts.bold, color: colors.ink },
  
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.line, shadowColor: '#102A43', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontFamily: fonts.bold, color: colors.ink, marginBottom: 8 },
  
  selectInput: { height: 52, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectInputText: { fontSize: 14, fontFamily: fonts.medium, color: colors.ink },
  
  textAreaContainer: { backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', gap: 10, minHeight: 100 },
  textArea: { flex: 1, fontSize: 14, fontFamily: fonts.medium, color: colors.ink, textAlignVertical: 'top', paddingTop: 0 },
  
  row: { flexDirection: 'row', gap: 12 },
  slotContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  slotChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.canvas },
  slotChipActive: { backgroundColor: '#E6F6F3', borderColor: colors.teal },
  slotChipText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.muted },
  slotChipTextActive: { color: colors.teal },
  
  locationContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locateButton: { backgroundColor: colors.teal, height: 52, paddingHorizontal: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6, shadowColor: '#0F766E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  locateButtonText: { color: colors.white, fontSize: 13, fontFamily: fonts.bold },

  primaryButton: { backgroundColor: colors.teal, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: '#0F766E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  primaryButtonText: { color: colors.white, fontSize: 14, fontFamily: fonts.bold, letterSpacing: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(16, 42, 67, 0.4)', justifyContent: 'flex-end' },
  modalView: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '75%', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  modalBackIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.canvas, justifyContent: 'center', alignItems: 'center' },
  modalCloseIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.canvas, justifyContent: 'center', alignItems: 'center' },
  modalSubtitle: { color: colors.muted, fontSize: 11, fontFamily: fonts.medium, marginTop: 3 },
  modalItem: { paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalItemSelected: { backgroundColor: '#E6F6F3', paddingHorizontal: 12, borderRadius: 12 },
  modalItemText: { fontSize: 15, fontFamily: fonts.medium, color: colors.ink },
  modalItemTextSelected: { color: colors.teal, fontFamily: fonts.bold },
  modalItemCount: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.muted, marginRight: 8 }
});