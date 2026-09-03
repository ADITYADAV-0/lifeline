import {
    API_ORIGIN_URL,
    authenticatedRequest,
    getBloodStock,
    getErComms,
    sendErMessage,
    type BloodStockItem,
    type HospitalCommsMessage
} from '@/services/appData';
import { ProfileMenuButton } from '@/components/ProfileMenuButton';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';

import { EmergencyCase } from '@/types';

export default function AmbulanceScreen() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'intake' | 'comms' | 'blood'>('alerts');
  const [activeCases, setActiveCases] = useState<EmergencyCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<EmergencyCase | null>(null);

  // Kept for backward compatibility with UI components
  const [commsMessages, setCommsMessages] = useState<HospitalCommsMessage[]>([]);
  const [bloodStockList, setBloodStockList] = useState<BloodStockItem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showIntakeModal, setShowIntakeModal] = useState(false);

  // Patient Intake Form state
  const [patientName, setPatientName] = useState('David K. Miller');
  const [triageNotes, setTriageNotes] = useState('Patient complaining of severe chest pressure radiating to left arm.');
  const [heartRateInput, setHeartRateInput] = useState('138');
  const [spo2Input, setSpo2Input] = useState('89');

  // Blood Reservation State
  const [reservedBlood, setReservedBlood] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const data = await authenticatedRequest<{ success: boolean; cases: EmergencyCase[] }>('/cases');
        if (isMounted && data.success) {
          const cases = data.cases.filter((item) => item.status !== 'CASE_CLOSED');
          setActiveCases(cases);
          if (cases.length > 0) setSelectedCase(cases[0]);
        }
      } catch (err) {
        console.error('Error fetching cases', err);
        if (isMounted) setLoadError(err instanceof Error ? err.message : 'Could not load emergency cases.');
      } finally {
        if (isMounted) setLoading(false);
      }

      const messages = await getErComms();
      const stock = await getBloodStock();
      if (isMounted) {
        setCommsMessages(messages);
        setBloodStockList(stock);
      }
    }
    loadData();

    const socket = io(API_ORIGIN_URL);
    socket.emit('ambulance:join', 'AMB-101');

    socket.on('case:created', (newCase: EmergencyCase) => {
      setActiveCases((prev: EmergencyCase[]) => prev.some((item) => item.id === newCase.id) ? prev : [newCase, ...prev]);
    });

    socket.on('case:live_update', (updatedCase: EmergencyCase) => {
      setActiveCases((prev: EmergencyCase[]) => prev.map(c => c.id === updatedCase.id ? updatedCase : c));
      setSelectedCase((prev: EmergencyCase | null) => prev?.id === updatedCase.id ? updatedCase : prev);
    });

    socket.on('case:accepted', (updatedCase: EmergencyCase) => {
      setActiveCases((prev: EmergencyCase[]) => prev.map(c => c.id === updatedCase.id ? updatedCase : c));
      setSelectedCase((prev: EmergencyCase | null) => prev?.id === updatedCase.id ? updatedCase : prev);
    });

    socket.on('handover:completed', (payload: any) => {
      if (payload?.case) {
        setActiveCases((prev: EmergencyCase[]) => prev.map(c => c.id === payload.case.id ? payload.case : c));
        setSelectedCase((prev: EmergencyCase | null) => prev?.id === payload.case.id ? payload.case : prev);
        Alert.alert('QR Handover Verified', 'Blood delivery successfully handed over via QR signature.');
      }
    });

    return () => {
      isMounted = false;
      socket.disconnect();
    };
  }, []);

  const handleAcceptCase = async () => {
    if (!selectedCase) return;
    setActionLoading(true);
    try {
      const data = await authenticatedRequest<{ success: boolean; case: EmergencyCase }>(`/cases/${selectedCase.id}/accept`, {
        method: 'POST',
        body: {
          ambulanceId: 'AMB-101',
          ambulanceLoc: { latitude: 37.7730, longitude: -122.4170 }
        }
      });
      if (data.success) {
        setSelectedCase(data.case);
        Alert.alert('Case Accepted', 'You are now assigned to this emergency. Navigating to patient...');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to accept case');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const sentMsg = await sendErMessage(newMessage);
    setCommsMessages((prev) => [sentMsg, ...prev]);
    setNewMessage('');
  };

  const handleReserveBlood = async (group: string) => {
    if (!selectedCase) {
      Alert.alert('No Case', 'Please select an active case first.');
      return;
    }
    try {
      const data = await authenticatedRequest<{ success: boolean }>(`/cases/${selectedCase.id}/reserve-blood`, {
        method: 'POST',
        body: { bloodType: group, units: 2 }
      });
      if (data.success) {
        setReservedBlood(group);
        Alert.alert(
          'Blood Units Locked',
          `2 Units of ${group} reserved. Courier dispatched to rendezvous point.`,
        );
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to reserve blood');
    }
  };

  const handleSaveIntake = async () => {
    if (!selectedCase) return;
    try {
      const data = await authenticatedRequest<{ success: boolean; case: EmergencyCase }>(`/cases/${selectedCase.id}/intake`, {
        method: 'POST',
        body: { triageNotes, heartRate: Number(heartRateInput), spo2: Number(spo2Input) }
      });
      if (data.success) {
        setSelectedCase(data.case);
        setShowIntakeModal(false);
        Alert.alert('Intake Transmitted', 'Patient intake & telemetry data transmitted to ER Trauma Bay 2.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to transmit intake');
    }
  };

  const handleCloseCase = async () => {
    if (!selectedCase) return;
    try {
      const data = await authenticatedRequest<{ success: boolean; case: EmergencyCase }>(`/cases/${selectedCase.id}/close`, {
        method: 'POST',
        body: { notes: 'Arrived at Hospital - Patient transferred to ER' }
      });
      if (data.success) {
        setActiveCases((prev) => prev.filter((item) => item.id !== selectedCase.id));
        setSelectedCase(null);
        Alert.alert('Case Closed', 'Patient successfully handed over to hospital staff.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to close case');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerMeta}>
            <View style={styles.unitBadge}>
              <Ionicons name="car" size={20} color="#ffffff" />
              <Text style={styles.unitBadgeText}>UNIT 101 • DISPATCHED</Text>
            </View>
            <Text style={styles.headerTitle}>Ambulance Dispatch Hub</Text>
            <Text style={styles.headerSubtitle}>Rapid Response Telemetry & Hospital Handover</Text>
          </View>
          <ProfileMenuButton role="ambulance" />
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'alerts' && styles.tabItemActive]}
            onPress={() => setActiveTab('alerts')}
          >
            <Ionicons name="alert-circle" size={18} color={activeTab === 'alerts' ? '#0058bc' : '#75777e'} />
            <Text style={[styles.tabLabel, activeTab === 'alerts' && styles.tabLabelActive]}>Alerts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'intake' && styles.tabItemActive]}
            onPress={() => setActiveTab('intake')}
          >
            <Ionicons name="clipboard" size={18} color={activeTab === 'intake' ? '#0058bc' : '#75777e'} />
            <Text style={[styles.tabLabel, activeTab === 'intake' && styles.tabLabelActive]}>Intake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'comms' && styles.tabItemActive]}
            onPress={() => setActiveTab('comms')}
          >
            <Ionicons name="chatbubbles" size={18} color={activeTab === 'comms' ? '#0058bc' : '#75777e'} />
            <Text style={[styles.tabLabel, activeTab === 'comms' && styles.tabLabelActive]}>ER Comms</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'blood' && styles.tabItemActive]}
            onPress={() => setActiveTab('blood')}
          >
            <Ionicons name="water" size={18} color={activeTab === 'blood' ? '#0058bc' : '#75777e'} />
            <Text style={[styles.tabLabel, activeTab === 'blood' && styles.tabLabelActive]}>Blood Reserve</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.statusPanel}>
            <Ionicons name="sync" size={22} color="#0058bc" />
            <Text style={styles.statusText}>Loading live dispatches...</Text>
          </View>
        )}
        {!loading && loadError ? (
          <View style={styles.statusPanel}>
            <Ionicons name="cloud-offline" size={22} color="#ba1a1a" />
            <Text style={styles.statusText}>{loadError}</Text>
          </View>
        ) : null}
        {/* VIEW 1: ALERTS & LIVE DISPATCH ROUTE */}
        {activeTab === 'alerts' && (
          <View style={styles.sectionContainer}>
            {/* Active Navigation Card */}
            {selectedCase && (
              <View style={styles.navCard}>
                <View style={styles.navHeaderRow}>
                  <View style={styles.liveIndicator}>
                    <View style={styles.dot} />
                    <Text style={styles.liveText}>ACTIVE NAVIGATION</Text>
                  </View>
                  <Text style={styles.etaText}>ETA 5 MINS</Text>
                </View>

                <Text style={styles.patientNameHeader}>{selectedCase.citizenName}</Text>
                <Text style={styles.locationText}>{selectedCase.patientLocation.address || 'Unknown Location'}</Text>

                <View style={styles.vitalsRow}>
                  <View style={styles.vitalPill}>
                    <Ionicons name="pulse" size={14} color="#ba1a1a" />
                    <Text style={styles.vitalPillText}>{selectedCase.triageNotes ? 'Recorded' : 'Awaiting'} HR</Text>
                  </View>
                  <View style={styles.vitalPill}>
                    <Ionicons name="fitness" size={14} color="#0058bc" />
                    <Text style={styles.vitalPillText}>{selectedCase.triageNotes ? 'Recorded' : 'Awaiting'} SpO2</Text>
                  </View>
                  <View style={styles.vitalPill}>
                    <Ionicons name="navigate" size={14} color="#00a673" />
                    <Text style={styles.vitalPillText}>5 km away</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.intakeActionBtn, { marginBottom: 8 }]}
                  onPress={handleAcceptCase}
                  disabled={actionLoading}
                >
                  <Ionicons name="car" size={18} color="#ffffff" />
                  <Text style={styles.intakeActionBtnText}>Accept & Navigate</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.intakeActionBtn, { marginBottom: 8 }]}
                  onPress={() => {
                    setActiveTab('intake');
                    setShowIntakeModal(true);
                  }}
                >
                  <Ionicons name="document-text" size={18} color="#ffffff" />
                  <Text style={styles.intakeActionBtnText}>Open Field Triage & Intake Form</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.intakeActionBtn, { backgroundColor: '#00a673' }]}
                  onPress={handleCloseCase}
                >
                  <Ionicons name="medical" size={18} color="#ffffff" />
                  <Text style={styles.intakeActionBtnText}>Arrived - Close Case</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Incoming Emergency Dispatch Feed */}
            <Text style={styles.sectionTitle}>Incoming Dispatch Queue</Text>
            {!loading && !loadError && activeCases.length === 0 && (
              <View style={styles.statusPanel}>
                <Ionicons name="checkmark-circle" size={22} color="#00a673" />
                <Text style={styles.statusText}>No active emergencies. New dispatches will appear here.</Text>
              </View>
            )}
            {activeCases.map((caseItem) => (
              <TouchableOpacity
                key={caseItem.id}
                style={[
                  styles.alertCard,
                  selectedCase?.id === caseItem.id && styles.alertCardSelected,
                ]}
                onPress={() => setSelectedCase(caseItem)}
              >
                <View style={styles.alertCardHeader}>
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityText}>{caseItem.status}</Text>
                  </View>
                  <Text style={styles.timestampText}>{new Date(caseItem.createdAt).toLocaleTimeString()}</Text>
                </View>
                <Text style={styles.alertPatientName}>{caseItem.citizenName}</Text>
                <Text style={styles.alertCondition}>Blood Type: {caseItem.bloodType}</Text>
                <Text style={styles.alertVitals}>Status: {caseItem.status}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* VIEW 2: INTAKE & FIELD TRIAGE */}
        {activeTab === 'intake' && (
          <View style={styles.sectionContainer}>
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="medical" size={24} color="#0058bc" />
                <Text style={styles.cardTitle}>Patient Field Intake Record</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Patient Full Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={patientName}
                  onChangeText={setPatientName}
                />
              </View>

              <View style={styles.rowTwoCols}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Heart Rate (bpm)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={heartRateInput}
                    onChangeText={setHeartRateInput}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Blood Oxygen (SpO2 %)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={spo2Input}
                    onChangeText={setSpo2Input}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Field Triage Notes & Symptoms</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={triageNotes}
                  onChangeText={setTriageNotes}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveIntake} disabled={actionLoading}>
                <Ionicons name="send" size={18} color="#ffffff" />
                <Text style={styles.primaryBtnText}>Transmit Telemetry to ER</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* VIEW 3: ER HOSPITAL COMMS */}
        {activeTab === 'comms' && (
          <View style={styles.sectionContainer}>
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="call" size={22} color="#0058bc" />
                <Text style={styles.cardTitle}>St. Jude ER Channel</Text>
              </View>

              <ScrollView style={styles.commsFeed} nestedScrollEnabled>
                {commsMessages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.commsBubble,
                      msg.isUrgent && styles.commsBubbleUrgent,
                    ]}
                  >
                    <View style={styles.commsHeader}>
                      <Text style={styles.commsSender}>{msg.sender}</Text>
                      <Text style={styles.commsTime}>{msg.time}</Text>
                    </View>
                    <Text style={styles.commsBody}>{msg.message}</Text>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.messageInputRow}>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Type message to Trauma ER..."
                  placeholderTextColor="#75777e"
                  value={newMessage}
                  onChangeText={setNewMessage}
                />
                <TouchableOpacity style={styles.sendIconBtn} onPress={handleSendMessage}>
                  <Ionicons name="paper-plane" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* VIEW 4: BLOOD RESERVATION */}
        {activeTab === 'blood' && (
          <View style={styles.sectionContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Emergency Blood Source Search</Text>
              <Text style={styles.cardSubtitle}>Direct inventory locks from Central Health Blood Hub</Text>

              {reservedBlood && (
                <View style={styles.reservedAlert}>
                  <Ionicons name="checkmark-circle" size={20} color="#00a673" />
                  <Text style={styles.reservedAlertText}>
                    Active Lock: 2 Units of {reservedBlood} en route to destination.
                  </Text>
                </View>
              )}

              <View style={styles.bloodGrid}>
                {bloodStockList.map((item) => (
                  <TouchableOpacity
                    key={item.group}
                    style={[
                      styles.bloodCard,
                      item.status === 'CRITICAL' && styles.bloodCardCritical,
                    ]}
                    onPress={() => handleReserveBlood(item.group)}
                  >
                    <Text style={styles.bloodGroupText}>{item.group}</Text>
                    <Text style={styles.bloodUnitsText}>{item.unitsAvailable} Units</Text>
                    <Text style={styles.bloodStatusText}>{item.status}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Intake Modal Popup */}
      <Modal visible={showIntakeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Field Triage Transmission</Text>
            <Text style={styles.modalSubtitle}>Ready to stream patient telemetry directly to St. Jude Trauma ER?</Text>
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowIntakeModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveIntake}>
                <Text style={styles.primaryBtnText}>Confirm Stream</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9ff' },
  statusPanel: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#d9dce5', padding: 16, marginBottom: 16 },
  statusText: { flex: 1, color: '#44474d', fontSize: 14, lineHeight: 20 },
  header: {
    backgroundColor: '#031632',
    padding: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingBottom: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerMeta: {
    flex: 1,
  },
  unitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ba1a1a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  unitBadgeText: { color: '#ffffff', fontWeight: '700', fontSize: 11, letterSpacing: 0.5 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  headerSubtitle: { fontSize: 13, color: '#b6c7eb', marginBottom: 12 },
  tabBar: { flexDirection: 'row', backgroundColor: '#1a2b48', borderRadius: 10, padding: 4 },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  tabItemActive: { backgroundColor: '#ffffff' },
  tabLabel: { fontSize: 12, fontWeight: '600', color: '#b6c7eb' },
  tabLabelActive: { color: '#0058bc', fontWeight: '700' },

  scrollContent: { padding: 16 },
  sectionContainer: { gap: 16 },

  navCard: {
    backgroundColor: '#ffffff',
    borderColor: '#0058bc',
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    elevation: 3,
  },
  navHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ba1a1a' },
  liveText: { fontSize: 11, fontWeight: '700', color: '#ba1a1a' },
  etaText: { fontSize: 13, fontWeight: '700', color: '#0058bc' },
  patientNameHeader: { fontSize: 20, fontWeight: '700', color: '#031632' },
  locationText: { fontSize: 13, color: '#44474d', marginBottom: 12 },
  vitalsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  vitalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff4ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  vitalPillText: { fontSize: 12, fontWeight: '600', color: '#0b1c30' },
  intakeActionBtn: {
    backgroundColor: '#0058bc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 8,
    gap: 8,
  },
  intakeActionBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#031632', marginTop: 8 },
  alertCard: {
    backgroundColor: '#ffffff',
    borderColor: '#c5c6ce',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  alertCardSelected: { borderColor: '#0058bc', backgroundColor: '#e5eeff' },
  alertCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  priorityBadge: { backgroundColor: '#ffdad6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  priorityText: { fontSize: 10, fontWeight: '700', color: '#ba1a1a' },
  timestampText: { fontSize: 11, color: '#75777e' },
  alertPatientName: { fontSize: 15, fontWeight: '700', color: '#031632' },
  alertCondition: { fontSize: 13, color: '#44474d', marginVertical: 2 },
  alertVitals: { fontSize: 12, fontWeight: '600', color: '#0058bc' },

  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderColor: '#c5c6ce', borderWidth: 1 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#031632' },
  cardSubtitle: { fontSize: 12, color: '#75777e', marginBottom: 16 },

  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#44474d', marginBottom: 6 },
  textInput: {
    backgroundColor: '#ffffff',
    borderColor: '#75777e',
    borderWidth: 1,
    borderRadius: 8,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0b1c30',
  },
  textArea: { height: 80, textAlignVertical: 'top', paddingTop: 8 },
  rowTwoCols: { flexDirection: 'row', gap: 12 },

  primaryBtn: {
    backgroundColor: '#0058bc',
    height: 46,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },

  commsFeed: { height: 260, marginBottom: 12 },
  commsBubble: { backgroundColor: '#eff4ff', padding: 10, borderRadius: 10, marginBottom: 8 },
  commsBubbleUrgent: { backgroundColor: '#ffdad6', borderColor: '#ba1a1a', borderWidth: 1 },
  commsHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commsSender: { fontSize: 12, fontWeight: '700', color: '#031632' },
  commsTime: { fontSize: 10, color: '#75777e' },
  commsBody: { fontSize: 13, color: '#0b1c30' },
  messageInputRow: { flexDirection: 'row', gap: 8 },
  messageInput: {
    flex: 1,
    borderColor: '#75777e',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  sendIconBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#0058bc',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  reservedAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7f0',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  reservedAlertText: { fontSize: 12, fontWeight: '600', color: '#00a673' },

  bloodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bloodCard: {
    flexBasis: '47%',
    backgroundColor: '#f8f9ff',
    borderColor: '#c5c6ce',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  bloodCardCritical: { borderColor: '#ba1a1a', backgroundColor: '#ffdad6' },
  bloodGroupText: { fontSize: 18, fontWeight: '800', color: '#031632' },
  bloodUnitsText: { fontSize: 12, color: '#44474d' },
  bloodStatusText: { fontSize: 10, fontWeight: '700', color: '#0058bc', marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#031632', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: '#44474d', marginBottom: 16 },
  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  cancelBtnText: { color: '#75777e', fontWeight: '600' },
});
