import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  SafeAreaView, 
  StatusBar, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchCustomerRequests, fetchJobMessages, fetchTechnicianJobs, sendJobMessage } from '../services/api';

const colors = { ink: '#102A43', teal: '#0F766E', canvas: '#F5F8FA', white: '#FFFFFF', muted: '#829AB1', line: '#D9E2EC', error: '#E53935' };

export default function ChatScreen({ currentUser, initialTarget = null }) {
  const isTechnician = currentUser?.role === 'technician';
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messagesByConv, setMessagesByConv] = useState({});
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Load conversations based on user's active accepted jobs
  useEffect(() => {
    let isMounted = true;
    const loadConversations = async () => {
      try {
        let convList = [];
        if (isTechnician) {
          const jobs = await fetchTechnicianJobs(currentUser.uid);
          convList = (jobs || [])
            .filter(j => ['Accepted', 'In Progress', 'Completed'].includes(j.status))
            .map(j => ({
              id: j.id,
              name: j.customerName || 'Customer',
              initials: (j.customerName || 'C').charAt(0).toUpperCase(),
              subtitle: `${j.applianceType} • ${j.status}`,
              status: j.status,
              phone: j.phone || null,
              roleLabel: 'Customer'
            }));
        } else {
          const reqs = await fetchCustomerRequests(currentUser.name, currentUser.uid);
          convList = (reqs || [])
            .filter(r => r.technicianName)
            .map(r => ({
              id: r.id,
              name: r.technicianName,
              initials: (r.technicianName || 'T').charAt(0).toUpperCase(),
              subtitle: `${r.applianceType} • ${r.status}`,
              status: r.status,
              phone: r.technicianPhone || null,
              roleLabel: 'Verified Technician'
            }));
        }

        if (isMounted) {
          setConversations(convList);

          // If initial target was requested
          if (initialTarget) {
            const matched = convList.find(c => c.id === initialTarget.id) || {
              id: initialTarget.id || 'direct',
              name: isTechnician ? (initialTarget.customerName || 'Customer') : (initialTarget.technicianName || 'Technician'),
              initials: (isTechnician ? initialTarget.customerName : initialTarget.technicianName || 'U').charAt(0).toUpperCase(),
              subtitle: initialTarget.applianceType || 'Repair Job',
              roleLabel: isTechnician ? 'Customer' : 'Verified Technician'
            };
            setSelectedConversation(matched);
          }
          setLoading(false);
        }
      } catch (err) {
        console.warn('Error loading chat conversations:', err);
        if (isMounted) setLoading(false);
      }
    };

    loadConversations();

    return () => { isMounted = false; };
  }, [currentUser, isTechnician, initialTarget]);

  useEffect(() => {
    const jobId = selectedConversation?.id;
    if (!jobId || jobId === 'direct') return undefined;

    let isMounted = true;
    const loadMessages = async () => {
      try {
        const messages = await fetchJobMessages(jobId);
        if (isMounted) {
          setMessagesByConv(prev => ({
            ...prev,
            [jobId]: (messages || []).map(message => ({
              ...message,
              time: message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
            }))
          }));
        }
      } catch (error) {
        console.warn('Error loading job messages:', error);
      }
    };

    loadMessages();
    const intervalId = setInterval(loadMessages, 3000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [selectedConversation?.id]);

  const activeConvId = selectedConversation?.id || 'default';
  const currentMessages = messagesByConv[activeConvId] || [];

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || !selectedConversation?.id || selectedConversation.id === 'direct' || sending) return;
    setSending(true);
    try {
      const message = await sendJobMessage(selectedConversation.id, {
        senderUid: currentUser.uid,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        text
      });
      setMessagesByConv(prev => ({
        ...prev,
        [activeConvId]: [...(prev[activeConvId] || []), {
          ...message,
          time: message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
        }]
      }));
      setInputText('');
    } catch (error) {
      console.warn('Error sending job message:', error);
    } finally {
      setSending(false);
    }
  };

  if (selectedConversation) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.backButtonContainer} onPress={() => setSelectedConversation(null)}>
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>IN-APP COORDINATION</Text>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Header Card */}
          <View style={styles.chatHeaderCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{selectedConversation.initials}</Text>
            </View>
            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatHeaderName}>{selectedConversation.name}</Text>
              <View style={styles.verifiedRow}>
                <Ionicons name="shield-checkmark" size={13} color="#059669" />
                <Text style={styles.verifiedText}>{selectedConversation.roleLabel}</Text>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.statusSubtext}>{selectedConversation.subtitle}</Text>
              </View>
            </View>
          </View>

          {/* Messages Feed */}
          <ScrollView contentContainerStyle={styles.chatArea} showsVerticalScrollIndicator={false}>
            {currentMessages.map(msg => {
              const isMe = msg.senderUid === currentUser.uid || msg.senderRole === currentUser.role;
              return (
                <View key={msg.id} style={[styles.msgWrapper, isMe ? styles.myMsgWrapper : styles.otherMsgWrapper]}>
                  <View style={[styles.msgBubble, isMe ? styles.myMsg : styles.otherMsg]}>
                    <Text style={[styles.msgText, isMe ? styles.myMsgText : styles.otherMsgText]}>
                      {msg.text}
                    </Text>
                    {msg.time && (
                      <Text style={[styles.msgTime, isMe ? styles.myMsgTime : styles.otherMsgTime]}>
                        {msg.time}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Input Area */}
          <View style={styles.inputArea}>
            <View style={styles.inputContainer}>
              <TextInput 
                style={styles.textInput} 
                placeholder="Type a message (e.g. gate code, arrival)..." 
                placeholderTextColor={colors.muted}
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
              <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage} disabled={sending}>
                <Ionicons name="send" size={17} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <Text style={styles.brand}>fix<Text style={styles.brandAccent}>link</Text></Text>
          <Text style={styles.roleHeader}>COORDINATION MESSAGES</Text>
        </View>

        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.kicker}>CONVERSATIONS</Text>
          <Text style={styles.sectionTitle}>
            {isTechnician ? "Customer Contacts" : "Technician Messages"}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.teal} />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="chatbubbles-outline" size={36} color={colors.muted} />
            <Text style={styles.emptyTitle}>No Active Conversations</Text>
            <Text style={styles.emptyText}>
              {isTechnician 
                ? "When you accept a service request, you can coordinate directly with the customer here."
                : "Once a technician accepts your repair request, you can message them here to coordinate scheduling."}
            </Text>
          </View>
        ) : (
          conversations.map(item => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.conversationItem} 
              onPress={() => setSelectedConversation(item)} 
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.initials}</Text>
              </View>
              <View style={styles.conversationInfo}>
                <View style={styles.convHeaderRow}>
                  <Text style={styles.convName}>{item.name}</Text>
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>{item.status || 'Active'}</Text>
                  </View>
                </View>
                <Text style={styles.lastMsg} numberOfLines={1}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.white },
  backButtonContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backButton: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  navTitle: { color: colors.muted, fontSize: 10, letterSpacing: 2, fontWeight: '800' },
  scrollContent: { flexGrow: 1, padding: 20 },
  headerContainer: { alignItems: 'center', marginBottom: 24, marginTop: 6 },
  brand: { color: colors.ink, fontSize: 32, fontWeight: '900', letterSpacing: -1.5 },
  brandAccent: { color: colors.teal },
  roleHeader: { color: colors.muted, fontSize: 10, letterSpacing: 2, fontWeight: '800', marginTop: 4 },
  sectionHeaderContainer: { marginBottom: 14 },
  kicker: { color: colors.teal, fontSize: 10, letterSpacing: 1.5, fontWeight: '800', marginBottom: 2 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  
  conversationItem: { flexDirection: 'row', padding: 16, backgroundColor: colors.white, borderRadius: 20, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.line, shadowColor: '#102A43', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.teal, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { color: colors.white, fontWeight: '900', fontSize: 17 },
  conversationInfo: { flex: 1 },
  convHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  convName: { fontWeight: '800', fontSize: 15, color: colors.ink },
  badgePill: { backgroundColor: '#E6F6F3', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgePillText: { color: colors.teal, fontSize: 10, fontWeight: '800' },
  lastMsg: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  
  chatHeaderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 12 },
  chatHeaderInfo: { flex: 1 },
  chatHeaderName: { fontSize: 16, fontWeight: '800', color: colors.ink },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  verifiedText: { color: '#059669', fontSize: 12, fontWeight: '700' },
  dotSeparator: { color: colors.muted, fontSize: 10 },
  statusSubtext: { color: colors.muted, fontSize: 11, fontWeight: '600' },

  chatArea: { padding: 16, flexGrow: 1, justifyContent: 'flex-end', gap: 10 },
  msgWrapper: { width: '100%', marginVertical: 2 },
  myMsgWrapper: { alignItems: 'flex-end' },
  otherMsgWrapper: { alignItems: 'flex-start' },
  msgBubble: { maxWidth: '78%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, shadowColor: '#102A43', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  myMsg: { backgroundColor: colors.teal, borderBottomRightRadius: 4 },
  otherMsg: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  myMsgText: { color: colors.white },
  otherMsgText: { color: colors.ink },
  msgTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  myMsgTime: { color: 'rgba(255,255,255,0.7)' },
  otherMsgTime: { color: colors.muted },

  inputArea: { padding: 14, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, borderRadius: 24, paddingLeft: 16, paddingRight: 6, paddingVertical: 6 },
  textInput: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: '600', maxHeight: 90, paddingVertical: 6 },
  sendButton: { backgroundColor: colors.teal, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', shadowColor: '#0F766E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },

  loadingBox: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, color: colors.muted, fontSize: 13, fontWeight: '600' },
  emptyCard: { backgroundColor: colors.white, borderRadius: 20, padding: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, gap: 10 },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  emptyText: { color: colors.muted, fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 18, paddingHorizontal: 12 }
});