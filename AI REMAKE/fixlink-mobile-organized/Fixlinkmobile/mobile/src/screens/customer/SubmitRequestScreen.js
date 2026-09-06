import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  ActivityIndicator 
} from 'react-native';
import { submitRepairRequest } from '../../services/api';

export default function SubmitRequestScreen() {
  const [customerName, setCustomerName] = useState('');
  const [applianceType, setApplianceType] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Basic frontend validation
    if (!customerName || !applianceType || !description || !location) {
      Alert.alert('Error', 'Please fill out all required fields.');
      return;
    }

    setLoading(true);
    try {
      const result = await submitRepairRequest({
        customerName,
        applianceType,
        description,
        location,
      });

      Alert.alert('Success', `${result.message}\nRequest ID: ${result.requestId}`);
      
      // Clear form fields after success
      setCustomerName('');
      setApplianceType('');
      setDescription('');
      setLocation('');
    } catch (error) {
      Alert.alert('Submission Failed', error.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>FixLink</Text>
      <Text style={styles.subtitle}>Request an Appliance Repair</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Customer Name</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Enter your full name" 
          value={customerName}
          onChangeText={setCustomerName}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Appliance Type</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g., Refrigerator, Washing Machine" 
          value={applianceType}
          onChangeText={setApplianceType}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Issue Description</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder="Describe the problem..." 
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Location / Address</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Enter your complete address" 
          value={location}
          onChangeText={setLocation}
        />
      </View>

      <TouchableOpacity 
        style={styles.submitButton} 
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Repair Request</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F8F9FA',
    flexGrow: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0056b3',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#212529',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#0056b3',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});