import { ProfileMenuButton } from '@/components/ProfileMenuButton';
import {
  API_ORIGIN_URL,
  createCourierDispatch,
  getBloodStock,
  getCourierDispatches,
  type BloodStockItem,
  type CourierDispatch
} from '@/services/appData';
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
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';

export default function BloodBankScreen() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'logistics' | 'rendezvous' | 'handover'>('inventory');
  const [stockList, setStockList] = useState<BloodStockItem[]>([]);
  const [dispatches, setDispatches] = useState<CourierDispatch[]>([]);
  const [selectedDispatch, setSelectedDispatch] = useState<CourierDispatch | null>(null);

  // Modal for emergency incoming blood reservation request
  const [incomingRequest, setIncomingRequest] = useState<{
    bloodType: string;
    units: number;
    patientName: string;
    location: string;
    caseId: string;
  } | null>(null);
  const [showRequestPopup, setShowRequestPopup] = useState(false);

  // Modal for new courier dispatch
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchBloodType, setDispatchBloodType] = useState('O-');
  const [dispatchUnits, setDispatchUnits] = useState('4');
  const [dispatchDest, setDispatchDest] = useState('St. Jude Trauma Bay 2');

  // QR Handover verification state
  const [scannedQrCode, setScannedQrCode] = useState('');
  const [handoverVerified, setHandoverVerified] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      const stock = await getBloodStock();
      const disp = await getCourierDispatches();
      if (isMounted) {
        setStockList(stock);
        setDispatches(disp);
        if (disp.length > 0) setSelectedDispatch(disp[0]);
      }
    }
    loadData();

    // Socket listener for instantaneous blood reservation pop-up
    const socket = io(API_ORIGIN_URL, { transports: ['websocket'] });
    socket.on('blood:reservation_alert', (payload: any) => {
      if (payload?.reservation) {
        setIncomingRequest({
          bloodType: payload.reservation.bloodType || 'O-Negative',
          units: payload.reservation.units || 4,
          patientName: payload.case?.citizenName || 'David K. Miller',
          location: payload.case?.patientLocation?.address || 'Financial District Corridor',
          caseId: payload.case?.id || 'CASE-9041',
        });
        setShowRequestPopup(true);
      }
    });

    return () => {
      isMounted = false;
      socket.disconnect();
    };
  }, []);

  const handleCreateDispatch = async () => {
    if (!dispatchDest.trim()) {
      Alert.alert('Missing Field', 'Please enter a destination hospital or emergency unit.');
      return;
    }
    const newDisp = await createCourierDispatch({
      bloodType: dispatchBloodType,
      units: parseInt(dispatchUnits, 10) || 2,
      destination: dispatchDest,
    });
    setDispatches((prev) => [newDisp, ...prev]);
    setSelectedDispatch(newDisp);
    setShowDispatchModal(false);
    Alert.alert('Dispatch Initiated', `Courier assigned for ${newDisp.units} units of ${newDisp.bloodType}.`);
  };

  const handleVerifyQrHandover = async () => {
    try {
      const res = await fetch(`${API_ORIGIN_URL}/api/cases/verify-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken: scannedQrCode || 'LIFELINE-QR' })
      });
      const data = await res.json();
      if (data.success) {
        setHandoverVerified(true);
        Alert.alert('Handover Verified', 'Chain-of-custody signature confirmed! Blood delivery complete.');
      } else {
        Alert.alert('Verification Failed', data.error || 'Invalid QR Token');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to verify handover');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerMeta}>
            <View style={styles.hubBadge}>
              <Ionicons name="water" size={20} color="#ffffff" />
              <Text style={styles.hubBadgeText}>CENTRAL HEALTH BLOOD HUB</Text>
            </View>
            <Text style={styles.headerTitle}>Blood Bank & Logistics Command</Text>
            <Text style={styles.headerSubtitle}>Real-time inventory management & courier dispatches</Text>
          </View>
          <ProfileMenuButton role="BloodBank" />
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'inventory' && styles.tabItemActive]}
            onPress={() => setActiveTab('inventory')}
          >
            <Ionicons name="grid" size={16} color={activeTab === 'inventory' ? '#0058bc' : '#b6c7eb'} />
            <Text style={[styles.tabLabel, activeTab === 'inventory' && styles.tabLabelActive]}>Stock</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'logistics' && styles.tabItemActive]}
            onPress={() => setActiveTab('logistics')}
          >
            <Ionicons name="bicycle" size={16} color={activeTab === 'logistics' ? '#0058bc' : '#b6c7eb'} />
            <Text style={[styles.tabLabel, activeTab === 'logistics' && styles.tabLabelActive]}>Couriers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'rendezvous' && styles.tabItemActive]}
            onPress={() => setActiveTab('rendezvous')}
          >
            <Ionicons name="navigate" size={16} color={activeTab === 'rendezvous' ? '#0058bc' : '#b6c7eb'} />
            <Text style={[styles.tabLabel, activeTab === 'rendezvous' && styles.tabLabelActive]}>Live Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'handover' && styles.tabItemActive]}
            onPress={() => setActiveTab('handover')}
          >
            <Ionicons name="qr-code" size={16} color={activeTab === 'handover' ? '#0058bc' : '#b6c7eb'} />
            <Text style={[styles.tabLabel, activeTab === 'handover' && styles.tabLabelActive]}>QR Verification</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* VIEW 1: BLOOD INVENTORY DASHBOARD */}
        {activeTab === 'inventory' && (
          <View style={styles.sectionContainer}>
            {/* Urgent Restock Notice */}
            <View style={styles.criticalNoticeCard}>
              <Ionicons name="warning" size={24} color="#ba1a1a" />
              <View style={{ flex: 1 }}>
                <Text style={styles.criticalNoticeTitle}>O-Negative Supply Critical</Text>
                <Text style={styles.criticalNoticeSub}>Only 14 units available. 8 units reserved for emergency dispatches.</Text>
              </View>
              <TouchableOpacity
                style={styles.requestDonorBtn}
                onPress={() => Alert.alert('Donor Drive Issued', 'Emergency SMS broadcast sent to registered O- negative donors.')}
              >
                <Text style={styles.requestDonorBtnText}>Call Donors</Text>
              </TouchableOpacity>
            </View>

            {/* Inventory Grid */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Live Blood Group Reserve</Text>
                <TouchableOpacity onPress={() => setShowDispatchModal(true)}>
                  <View style={styles.addDispatchPill}>
                    <Ionicons name="add" size={14} color="#ffffff" />
                    <Text style={styles.addDispatchPillText}>Dispatch Blood</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.stockGrid}>
                {stockList.map((item) => (
                  <View
                    key={item.group}
                    style={[
                      styles.stockCard,
                      item.status === 'CRITICAL' && styles.stockCardCritical,
                      item.status === 'LOW' && styles.stockCardLow,
                    ]}
                  >
                    <View style={styles.stockCardHeader}>
                      <Text style={styles.groupLabel}>{item.group}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          item.status === 'CRITICAL' ? styles.badgeCrit : item.status === 'LOW' ? styles.badgeLow : styles.badgeOpt,
                        ]}
                      >
                        <Text style={styles.badgeText}>{item.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.stockCountText}>{item.unitsAvailable} Units</Text>
                    <Text style={styles.reservedText}>{item.unitsReserved} Reserved</Text>
                    <Text style={styles.updatedText}>Updated {item.lastUpdated}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* VIEW 2: COURIER & LOGISTICS DISPATCH BOARD */}
        {activeTab === 'logistics' && (
          <View style={styles.sectionContainer}>
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="bicycle" size={22} color="#0058bc" />
                <Text style={styles.cardTitle}>Active Courier Logistics Board</Text>
              </View>

              {dispatches.map((disp) => (
                <TouchableOpacity
                  key={disp.id}
                  style={[
                    styles.dispatchCard,
                    selectedDispatch?.id === disp.id && styles.dispatchCardSelected,
                  ]}
                  onPress={() => setSelectedDispatch(disp)}
                >
                  <View style={styles.dispatchHeader}>
                    <Text style={styles.dispatchId}>{disp.id} • {disp.bloodType}</Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{disp.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.courierNameText}>{disp.courierName}</Text>
                  <Text style={styles.destText}>Destination: {disp.destination}</Text>
                  <View style={styles.etaRow}>
                    <Ionicons name="time-outline" size={14} color="#0058bc" />
                    <Text style={styles.etaLabelText}>ETA: {disp.etaMinutes} minutes ({disp.units} units)</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* VIEW 3: LIVE RENDEZVOUS MAP */}
        {activeTab === 'rendezvous' && (
          <View style={styles.sectionContainer}>
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="navigate" size={22} color="#0058bc" />
                <Text style={styles.cardTitle}>Live Rendezvous Tracking</Text>
              </View>

              <View style={styles.mapSimContainer}>
                <View style={styles.mapPinRow}>
                  <View style={styles.pinDotBank}>
                    <Ionicons name="water" size={16} color="#ffffff" />
                  </View>
                  <View style={styles.pulseLine} />
                  <View style={styles.pinDotCourier}>
                    <Ionicons name="bicycle" size={16} color="#ffffff" />
                  </View>
                  <View style={styles.pulseLineDotted} />
                  <View style={styles.pinDotHosp}>
                    <Ionicons name="medical" size={16} color="#ffffff" />
                  </View>
                </View>

                <View style={styles.mapLabelRow}>
                  <Text style={styles.mapLabel}>Central Blood Hub</Text>
                  <Text style={styles.mapLabelActive}>Rider (En Route)</Text>
                  <Text style={styles.mapLabel}>St. Jude ER</Text>
                </View>
              </View>

              {selectedDispatch && (
                <View style={styles.dispatchDetailCard}>
                  <Text style={styles.dispatchDetailTitle}>Dispatch #{selectedDispatch.id}</Text>
                  <Text style={styles.dispatchDetailSub}>Courier: {selectedDispatch.courierName}</Text>
                  <Text style={styles.dispatchDetailSub}>Vehicle: {selectedDispatch.vehicle}</Text>
                  <Text style={styles.dispatchDetailSub}>Payload: {selectedDispatch.units} Units of {selectedDispatch.bloodType}</Text>

                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => setActiveTab('handover')}
                  >
                    <Ionicons name="qr-code" size={18} color="#ffffff" />
                    <Text style={styles.primaryBtnText}>Proceed to QR Handover Verification</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* VIEW 4: QR HANDOVER & VERIFICATION */}
        {activeTab === 'handover' && (
          <View style={styles.sectionContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Chain-of-Custody QR Verification</Text>
              <Text style={styles.cardSubtitle}>Scan or input dispatch signature to complete handover</Text>

              <View style={styles.qrCodeBox}>
                <Ionicons name="qr-code" size={100} color="#031632" />
                <Text style={styles.qrCodeValText}>{selectedDispatch?.qrCodeValue ?? 'LIFELINE-QR-PENDING'}</Text>
              </View>

              {handoverVerified ? (
                <View style={styles.verifiedCard}>
                  <Ionicons name="checkmark-circle" size={32} color="#00a673" />
                  <Text style={styles.verifiedTitle}>Handover Completed</Text>
                  <Text style={styles.verifiedSub}>Blood units logged and transferred to hospital inventory.</Text>
                </View>
              ) : (
                <View>
                  <TextInput
                    style={styles.qrInput}
                    placeholder="Enter QR token signature..."
                    placeholderTextColor="#75777e"
                    value={scannedQrCode}
                    onChangeText={setScannedQrCode}
                  />
                  <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyQrHandover}>
                    <Ionicons name="shield-checkmark" size={18} color="#ffffff" />
                    <Text style={styles.primaryBtnText}>Verify Delivery Signature</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* New Courier Dispatch Modal */}
      <Modal visible={showDispatchModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Dispatch Emergency Blood</Text>
            <Text style={styles.modalSubtitle}>Assign a rapid courier unit to transport blood units.</Text>

            <Text style={styles.fieldLabel}>Blood Group</Text>
            <View style={styles.bloodSelectRow}>
              {['O-', 'O+', 'A-', 'A+', 'B-'].map((bg) => (
                <TouchableOpacity
                  key={bg}
                  style={[styles.bgPill, dispatchBloodType === bg && styles.bgPillActive]}
                  onPress={() => setDispatchBloodType(bg)}
                >
                  <Text style={[styles.bgPillText, dispatchBloodType === bg && styles.bgPillTextActive]}>{bg}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Quantity (Units)</Text>
            <TextInput
              style={styles.textInput}
              value={dispatchUnits}
              onChangeText={setDispatchUnits}
              keyboardType="numeric"
            />

            <Text style={styles.fieldLabel}>Destination Emergency Facility</Text>
            <TextInput
              style={styles.textInput}
              value={dispatchDest}
              onChangeText={setDispatchDest}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDispatchModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateDispatch}>
                <Text style={styles.primaryBtnText}>Launch Courier</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Emergency Incoming Blood Request Pop-Up Modal */}
      <Modal visible={showRequestPopup} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { borderColor: '#ba1a1a', borderWidth: 2 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Ionicons name="warning" size={28} color="#ba1a1a" />
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#ba1a1a' }}>EMERGENCY BLOOD REQUEST</Text>
            </View>
            <Text style={{ fontSize: 14, color: '#0b1c30', marginBottom: 12 }}>
              Paramedic on <Text style={{ fontWeight: '700' }}>Unit 101</Text> requested{' '}
              <Text style={{ fontWeight: '800', color: '#0058bc' }}>{incomingRequest?.units} Units of {incomingRequest?.bloodType}</Text>{' '}
              for patient <Text style={{ fontWeight: '700' }}>{incomingRequest?.patientName}</Text> at {incomingRequest?.location}.
            </Text>
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowRequestPopup(false)}
              >
                <Text style={styles.cancelBtnText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#ba1a1a' }]}
                onPress={async () => {
                  setShowRequestPopup(false);
                  setActiveTab('rendezvous');
                  await handleCreateDispatch();
                }}
              >
                <Ionicons name="bicycle" size={18} color="#ffffff" />
                <Text style={styles.primaryBtnText}>Accept & Launch Courier</Text>
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
  hubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0058bc',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  hubBadgeText: { color: '#ffffff', fontWeight: '700', fontSize: 11, letterSpacing: 0.5 },
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
  tabLabel: { fontSize: 11, fontWeight: '600', color: '#b6c7eb' },
  tabLabelActive: { color: '#0058bc', fontWeight: '700' },

  scrollContent: { padding: 16 },
  sectionContainer: { gap: 16 },

  criticalNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffdad6',
    borderColor: '#ba1a1a',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  criticalNoticeTitle: { fontSize: 14, fontWeight: '700', color: '#ba1a1a' },
  criticalNoticeSub: { fontSize: 11, color: '#0b1c30' },
  requestDonorBtn: { backgroundColor: '#ba1a1a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  requestDonorBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },

  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderColor: '#c5c6ce', borderWidth: 1 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#031632' },
  cardSubtitle: { fontSize: 12, color: '#75777e', marginBottom: 14 },

  addDispatchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0058bc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addDispatchPillText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },

  stockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stockCard: {
    flexBasis: '47%',
    backgroundColor: '#f8f9ff',
    borderColor: '#c5c6ce',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  stockCardCritical: { borderColor: '#ba1a1a', backgroundColor: '#ffdad6' },
  stockCardLow: { borderColor: '#d97706', backgroundColor: '#fef3c7' },
  stockCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  groupLabel: { fontSize: 18, fontWeight: '800', color: '#031632' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeCrit: { backgroundColor: '#ba1a1a' },
  badgeLow: { backgroundColor: '#d97706' },
  badgeOpt: { backgroundColor: '#00a673' },
  badgeText: { color: '#ffffff', fontSize: 9, fontWeight: '700' },
  stockCountText: { fontSize: 14, fontWeight: '700', color: '#0b1c30' },
  reservedText: { fontSize: 11, color: '#44474d' },
  updatedText: { fontSize: 9, color: '#75777e', marginTop: 4 },

  dispatchCard: {
    backgroundColor: '#f8f9ff',
    borderColor: '#c5c6ce',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  dispatchCardSelected: { borderColor: '#0058bc', backgroundColor: '#e5eeff' },
  dispatchHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  dispatchId: { fontSize: 13, fontWeight: '700', color: '#031632' },
  statusPill: { backgroundColor: '#0058bc', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusPillText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
  courierNameText: { fontSize: 14, fontWeight: '600', color: '#0b1c30' },
  destText: { fontSize: 12, color: '#44474d' },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  etaLabelText: { fontSize: 11, color: '#0058bc', fontWeight: '600' },

  mapSimContainer: {
    backgroundColor: '#1a2b48',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  mapPinRow: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' },
  pinDotBank: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0058bc', alignItems: 'center', justifyContent: 'center' },
  pinDotCourier: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#d97706', alignItems: 'center', justifyContent: 'center' },
  pinDotHosp: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#00a673', alignItems: 'center', justifyContent: 'center' },
  pulseLine: { flex: 1, height: 3, backgroundColor: '#0058bc' },
  pulseLineDotted: { flex: 1, height: 3, backgroundColor: '#64748b' },
  mapLabelRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  mapLabel: { fontSize: 10, color: '#b6c7eb' },
  mapLabelActive: { fontSize: 10, color: '#fef3c7', fontWeight: '700' },

  dispatchDetailCard: { backgroundColor: '#eff4ff', borderRadius: 12, padding: 14, gap: 4 },
  dispatchDetailTitle: { fontSize: 15, fontWeight: '700', color: '#031632' },
  dispatchDetailSub: { fontSize: 12, color: '#44474d' },

  qrCodeBox: { alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#f8f9ff', borderRadius: 12, marginBottom: 16 },
  qrCodeValText: { fontSize: 11, fontWeight: '600', color: '#75777e', marginTop: 8 },
  qrInput: { backgroundColor: '#ffffff', borderColor: '#75777e', borderWidth: 1, borderRadius: 8, height: 44, paddingHorizontal: 12, marginBottom: 12 },

  verifiedCard: { alignItems: 'center', backgroundColor: '#e6f7f0', borderRadius: 12, padding: 16 },
  verifiedTitle: { fontSize: 16, fontWeight: '700', color: '#00a673', marginTop: 6 },
  verifiedSub: { fontSize: 12, color: '#0b1c30', textAlign: 'center' },

  primaryBtn: {
    backgroundColor: '#0058bc',
    height: 46,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#031632', marginBottom: 4 },
  modalSubtitle: { fontSize: 12, color: '#75777e', marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#44474d', marginTop: 8, marginBottom: 4 },
  textInput: { backgroundColor: '#ffffff', borderColor: '#75777e', borderWidth: 1, borderRadius: 8, height: 44, paddingHorizontal: 12, fontSize: 14 },
  bloodSelectRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  bgPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#eff4ff', borderColor: '#c5c6ce', borderWidth: 1 },
  bgPillActive: { backgroundColor: '#0058bc' },
  bgPillText: { fontSize: 12, fontWeight: '600', color: '#0b1c30' },
  bgPillTextActive: { color: '#ffffff' },
  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  cancelBtnText: { color: '#75777e', fontWeight: '600' },
});
