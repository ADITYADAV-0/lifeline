import {
  getGovAnomalies,
  getGovComplianceRecords,
  getGovMetrics,
  getGovTransactions,
  MOCK_GOV_METRICS,
  type AnomalyAlert,
  type ComplianceRecord,
  type GovNetworkMetrics,
  type TransactionRecord,
} from '@/services/appData';
import { ProfileMenuButton } from '@/components/ProfileMenuButton';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_ORIGIN_URL } from '@/services/appData';
import { io } from 'socket.io-client';

export default function GovernmentScreen() {
  const [activeTab, setActiveTab] = useState<'city' | 'analytics' | 'compliance' | 'payments' | 'anomalies'>('city');
  const [metrics, setMetrics] = useState<GovNetworkMetrics>(MOCK_GOV_METRICS);
  const [complianceList, setComplianceList] = useState<ComplianceRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);
  const [ledgerBlocks, setLedgerBlocks] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      const m = await getGovMetrics();
      const c = await getGovComplianceRecords();
      const t = await getGovTransactions();
      const a = await getGovAnomalies();
      if (isMounted) {
        setMetrics(m);
        setComplianceList(c);
        setTransactions(t);
        setAnomalies(a);
      }
    }
    loadData();

    // Socket listener for live blockchain ledger entries
    const socket = io(API_ORIGIN_URL, { transports: ['websocket'] });
    socket.on('ledger:new_block', (blocks: any[]) => {
      if (isMounted && Array.isArray(blocks)) {
        setLedgerBlocks(blocks);
      }
    });

    return () => {
      isMounted = false;
      socket.disconnect();
    };
  }, []);

  const handleIssueAuditRequest = (facilityName: string) => {
    Alert.alert('Audit Dispatched', `Official inspection mandate sent to ${facilityName}.`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerMeta}>
            <View style={styles.govBadge}>
              <Ionicons name="business" size={18} color="#ffffff" />
              <Text style={styles.govBadgeText}>HEALTH AUTHORITY REGULATORY COUNCIL</Text>
            </View>
            <Text style={styles.headerTitle}>City-Wide Oversight & Analytics</Text>
            <Text style={styles.headerSubtitle}>Real-time emergency telemetry & infrastructure management</Text>
          </View>
          <ProfileMenuButton role="government" />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'city' && styles.tabItemActive]}
              onPress={() => setActiveTab('city')}
            >
              <Ionicons name="map" size={15} color={activeTab === 'city' ? '#0058bc' : '#b6c7eb'} />
              <Text style={[styles.tabLabel, activeTab === 'city' && styles.tabLabelActive]}>Live City</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'analytics' && styles.tabItemActive]}
              onPress={() => setActiveTab('analytics')}
            >
              <Ionicons name="stats-chart" size={15} color={activeTab === 'analytics' ? '#0058bc' : '#b6c7eb'} />
              <Text style={[styles.tabLabel, activeTab === 'analytics' && styles.tabLabelActive]}>Analytics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'compliance' && styles.tabItemActive]}
              onPress={() => setActiveTab('compliance')}
            >
              <Ionicons name="shield-checkmark" size={15} color={activeTab === 'compliance' ? '#0058bc' : '#b6c7eb'} />
              <Text style={[styles.tabLabel, activeTab === 'compliance' && styles.tabLabelActive]}>Compliance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'payments' && styles.tabItemActive]}
              onPress={() => setActiveTab('payments')}
            >
              <Ionicons name="cash" size={15} color={activeTab === 'payments' ? '#0058bc' : '#b6c7eb'} />
              <Text style={[styles.tabLabel, activeTab === 'payments' && styles.tabLabelActive]}>Ledger</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'anomalies' && styles.tabItemActive]}
              onPress={() => setActiveTab('anomalies')}
            >
              <Ionicons name="warning" size={15} color={activeTab === 'anomalies' ? '#0058bc' : '#b6c7eb'} />
              <Text style={[styles.tabLabel, activeTab === 'anomalies' && styles.tabLabelActive]}>Alerts</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* VIEW 1: CITY-WIDE LIVE DASHBOARD */}
        {activeTab === 'city' && (
          <View style={styles.sectionContainer}>
            {/* System Health Overview Card */}
            <View style={styles.healthBanner}>
              <View style={styles.healthScoreBox}>
                <Text style={styles.healthScoreText}>{metrics.systemHealthScore}%</Text>
                <Text style={styles.healthScoreLabel}>Network Readiness</Text>
              </View>
              <View style={styles.healthDetails}>
                <Text style={styles.healthTitle}>Metro Area Emergency Grid</Text>
                <Text style={styles.healthSub}>All 4 EMS sectors operating within target response parameters.</Text>
              </View>
            </View>

            {/* Metrics KPI Grid */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <Ionicons name="car-sport" size={20} color="#0058bc" />
                <Text style={styles.kpiValue}>{metrics.activeAmbulances}</Text>
                <Text style={styles.kpiLabel}>Active Units</Text>
              </View>

              <View style={styles.kpiCard}>
                <Ionicons name="alert-circle" size={20} color="#ba1a1a" />
                <Text style={styles.kpiValue}>{metrics.totalIncidentsToday}</Text>
                <Text style={styles.kpiLabel}>Incidents Today</Text>
              </View>

              <View style={styles.kpiCard}>
                <Ionicons name="time" size={20} color="#00a673" />
                <Text style={styles.kpiValue}>{metrics.avgResponseTimeMin}m</Text>
                <Text style={styles.kpiLabel}>Avg Response</Text>
              </View>

              <View style={styles.kpiCard}>
                <Ionicons name="water" size={20} color="#0058bc" />
                <Text style={styles.kpiValue}>{metrics.bloodBankReservePct}%</Text>
                <Text style={styles.kpiLabel}>Blood Reserve</Text>
              </View>
            </View>

            {/* Sector Operations List */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Municipal District Status</Text>
              <View style={styles.sectorRow}>
                <Text style={styles.sectorName}>District 1 (Downtown)</Text>
                <Text style={styles.sectorStatusGood}>OPTIMAL (4.1 min avg)</Text>
              </View>
              <View style={styles.sectorRow}>
                <Text style={styles.sectorName}>District 2 (Financial)</Text>
                <Text style={styles.sectorStatusGood}>OPTIMAL (4.5 min avg)</Text>
              </View>
              <View style={styles.sectorRow}>
                <Text style={styles.sectorName}>District 3 (Mission)</Text>
                <Text style={styles.sectorStatusGood}>OPTIMAL (5.0 min avg)</Text>
              </View>
              <View style={styles.sectorRow}>
                <Text style={styles.sectorName}>District 4 (Transit Corridor)</Text>
                <Text style={styles.sectorStatusWarn}>SURGE WARNING (6.8 min avg)</Text>
              </View>
            </View>
          </View>
        )}

        {/* VIEW 2: ANALYTICS DASHBOARD */}
        {activeTab === 'analytics' && (
          <View style={styles.sectionContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Healthcare Network Performance</Text>
              <Text style={styles.cardSubtitle}>Response time distribution & hospital load balancing</Text>

              <View style={styles.chartBarGroup}>
                <View style={styles.barRow}>
                  <Text style={styles.barLabel}>Cardiac Dispatch</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: '85%', backgroundColor: '#0058bc' }]} />
                  </View>
                  <Text style={styles.barVal}>3.8 min</Text>
                </View>

                <View style={styles.barRow}>
                  <Text style={styles.barLabel}>Trauma & Accidents</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: '75%', backgroundColor: '#00a673' }]} />
                  </View>
                  <Text style={styles.barVal}>4.6 min</Text>
                </View>

                <View style={styles.barRow}>
                  <Text style={styles.barLabel}>Blood Courier Express</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: '92%', backgroundColor: '#ba1a1a' }]} />
                  </View>
                  <Text style={styles.barVal}>6.2 min</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* VIEW 3: LICENSING & COMPLIANCE */}
        {activeTab === 'compliance' && (
          <View style={styles.sectionContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Facility Licensing & Compliance Ledger</Text>

              {complianceList.map((rec) => (
                <View key={rec.id} style={styles.complianceCard}>
                  <View style={styles.complianceHeader}>
                    <Text style={styles.facilityName}>{rec.facilityName}</Text>
                    <View
                      style={[
                        styles.statusPill,
                        rec.status === 'COMPLIANT' ? styles.statusPillOk : styles.statusPillWarn,
                      ]}
                    >
                      <Text style={styles.statusPillText}>{rec.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.licenseId}>License ID: {rec.licenseId}</Text>
                  <Text style={styles.inspectionDate}>Last Inspected: {rec.lastInspection}</Text>

                  {rec.status !== 'COMPLIANT' && (
                    <TouchableOpacity
                      style={styles.auditBtn}
                      onPress={() => handleIssueAuditRequest(rec.facilityName)}
                    >
                      <Ionicons name="document-text" size={14} color="#ffffff" />
                      <Text style={styles.auditBtnText}>Issue Mandatory Audit Notice</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* VIEW 4: PAYMENTS & TRANSACTIONS */}
        {activeTab === 'payments' && (
          <View style={styles.sectionContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Blockchain Case Ledger & Settlement Explorer</Text>
              <Text style={styles.cardSubtitle}>Immutable real-time audit log of all case events & handover transactions</Text>

              {ledgerBlocks.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0058bc', marginBottom: 8 }}>
                    Live Blockchain Blocks ({ledgerBlocks.length})
                  </Text>
                  {ledgerBlocks.map((blk) => (
                    <View key={blk.id || blk.hash} style={[styles.txnCard, { borderColor: '#0058bc', backgroundColor: '#e5eeff' }]}>
                      <View style={styles.txnHeader}>
                        <Text style={[styles.txnId, { color: '#0058bc', fontWeight: '700' }]}>{blk.id} • {blk.action}</Text>
                        <Text style={{ fontSize: 10, color: '#75777e', fontFamily: 'monospace' }}>{blk.hash?.substring(0, 10)}...</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#0b1c30' }}>Case: {blk.caseId} • {blk.timestamp}</Text>
                    </View>
                  ))}
                </View>
              )}

              {transactions.map((txn) => (
                <View key={txn.id} style={styles.txnCard}>
                  <View style={styles.txnHeader}>
                    <Text style={styles.txnId}>{txn.id} • {txn.timestamp}</Text>
                    <Text style={styles.txnAmount}>${txn.amountUsd.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.txnFacility}>{txn.facility}</Text>
                  <Text style={styles.txnService}>{txn.serviceType}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* VIEW 5: ANOMALY & NETWORK RISK ALERTS */}
        {activeTab === 'anomalies' && (
          <View style={styles.sectionContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Automated Network Anomaly Alerts</Text>

              {anomalies.map((anom) => (
                <View key={anom.id} style={styles.anomCard}>
                  <View style={styles.anomHeader}>
                    <View style={styles.sevBadge}>
                      <Text style={styles.sevBadgeText}>{anom.severity} SEVERITY</Text>
                    </View>
                    <Text style={styles.anomTime}>{anom.timestamp}</Text>
                  </View>
                  <Text style={styles.anomTitle}>{anom.title}</Text>
                  <Text style={styles.anomDesc}>{anom.description}</Text>
                  <Text style={styles.anomLoc}>Location: {anom.location}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
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
  govBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374765',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  govBadgeText: { color: '#ffffff', fontWeight: '700', fontSize: 10, letterSpacing: 0.5 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  headerSubtitle: { fontSize: 13, color: '#b6c7eb', marginBottom: 12 },
  tabScroll: { marginTop: 4 },
  tabBar: { flexDirection: 'row', backgroundColor: '#1a2b48', borderRadius: 10, padding: 4, gap: 4 },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  tabItemActive: { backgroundColor: '#ffffff' },
  tabLabel: { fontSize: 11, fontWeight: '600', color: '#b6c7eb' },
  tabLabelActive: { color: '#0058bc', fontWeight: '700' },

  scrollContent: { padding: 16 },
  sectionContainer: { gap: 16 },

  healthBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0058bc',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  healthScoreBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthScoreText: { fontSize: 20, fontWeight: '800', color: '#0058bc' },
  healthScoreLabel: { fontSize: 8, color: '#75777e', fontWeight: '600', textTransform: 'uppercase' },
  healthDetails: { flex: 1 },
  healthTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  healthSub: { fontSize: 12, color: '#d7e2ff', marginTop: 2 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    flexBasis: '47%',
    backgroundColor: '#ffffff',
    borderColor: '#c5c6ce',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  kpiValue: { fontSize: 22, fontWeight: '800', color: '#031632', marginTop: 4 },
  kpiLabel: { fontSize: 11, color: '#75777e', fontWeight: '600' },

  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderColor: '#c5c6ce', borderWidth: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#031632', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: '#75777e', marginBottom: 14 },

  sectorRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sectorName: { fontSize: 13, color: '#0b1c30', fontWeight: '600' },
  sectorStatusGood: { fontSize: 11, color: '#00a673', fontWeight: '700' },
  sectorStatusWarn: { fontSize: 11, color: '#ba1a1a', fontWeight: '700' },

  chartBarGroup: { gap: 12, marginTop: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 130, fontSize: 12, color: '#0b1c30', fontWeight: '600' },
  barTrack: { flex: 1, height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  barVal: { width: 50, fontSize: 11, fontWeight: '700', color: '#031632', textAlign: 'right' },

  complianceCard: { backgroundColor: '#f8f9ff', borderColor: '#c5c6ce', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  complianceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  facilityName: { fontSize: 14, fontWeight: '700', color: '#031632' },
  statusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusPillOk: { backgroundColor: '#00a673' },
  statusPillWarn: { backgroundColor: '#d97706' },
  statusPillText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
  licenseId: { fontSize: 12, color: '#44474d' },
  inspectionDate: { fontSize: 11, color: '#75777e' },
  auditBtn: { backgroundColor: '#d97706', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 36, borderRadius: 6, gap: 6, marginTop: 8 },
  auditBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },

  txnCard: { backgroundColor: '#f8f9ff', borderColor: '#c5c6ce', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  txnHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  txnId: { fontSize: 11, color: '#75777e', fontWeight: '600' },
  txnAmount: { fontSize: 14, fontWeight: '700', color: '#00a673' },
  txnFacility: { fontSize: 13, fontWeight: '700', color: '#031632' },
  txnService: { fontSize: 12, color: '#44474d' },

  anomCard: { backgroundColor: '#ffdad6', borderColor: '#ba1a1a', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  anomHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sevBadge: { backgroundColor: '#ba1a1a', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sevBadgeText: { color: '#ffffff', fontSize: 9, fontWeight: '700' },
  anomTime: { fontSize: 10, color: '#75777e' },
  anomTitle: { fontSize: 14, fontWeight: '700', color: '#031632' },
  anomDesc: { fontSize: 12, color: '#0b1c30', marginVertical: 4 },
  anomLoc: { fontSize: 11, fontWeight: '600', color: '#ba1a1a' },
});
