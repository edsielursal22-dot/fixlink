import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Alert
} from 'react-native';
import api, { fetchRepairRequests } from '../../services/api';

export default function AvailableJobsScreen() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = async () => {
    try {
      const data = await fetchRepairRequests();
      setRequests(data);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || error.error || 'Failed to load available jobs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const handleAcceptJob = async (jobId) => {
    try {
      // Sends the accept request to your backend route
      await api.put(`/requests/${jobId}/accept`);
      Alert.alert('Success', 'You have successfully accepted this job!');
      loadRequests(); // Refresh the list so the UI updates with the new status
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to accept job.');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.applianceText}>{item.applianceType}</Text>
        {/* Dynamically display status from database, defaulting to Pending */}
        <Text style={[
          styles.statusBadge, 
          item.status === 'Accepted' && styles.acceptedBadge
        ]}>
          {item.status || 'Pending'}
        </Text>
      </View>
      <Text style={styles.customerText}>Customer: {item.customerName}</Text>
      <Text style={styles.descriptionText} numberOfLines={2}>{item.description}</Text>
      <Text style={styles.locationText}>📍 {item.location}</Text>
      
      <TouchableOpacity 
        style={[
          styles.acceptButton, 
          item.status === 'Accepted' && styles.disabledButton
        ]} 
        onPress={() => handleAcceptJob(item.id)}
        disabled={item.status === 'Accepted'}
      >
        <Text style={styles.acceptButtonText}>
          {item.status === 'Accepted' ? 'Accepted' : 'Accept Job'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0056b3" />
        <Text style={styles.loadingText}>Loading available jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Technician Portal</Text>
      <Text style={styles.subtitle}>Available Repair Requests</Text>

      {requests.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.noJobsText}>No repair requests found right now.</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0056b3']} />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0056b3',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ced4da',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  applianceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  statusBadge: {
    backgroundColor: '#ffc107',
    color: '#212529',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },
  acceptedBadge: {
    backgroundColor: '#28a745',
    color: '#fff',
  },
  customerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    color: '#0056b3',
    marginBottom: 12,
  },
  acceptButton: {
    backgroundColor: '#28a745',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 10,
    color: '#6c757d',
  },
  noJobsText: {
    fontSize: 16,
    color: '#6c757d',
  },
});