import { getBloodStock, type BloodStockItem } from '@/services/appData';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface InventoryDetailItem extends BloodStockItem {
  expiryDate: string;
  donationSource: string;
  testResults: string;
}

export default function BloodInventoryScreen() {
  const [stockList, setStockList] = useState<BloodStockItem[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState<InventoryDetailItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'low' | 'optimal'>('all');

  useEffect(() => {
    async function loadInventory() {
      const stock = await getBloodStock();
      setStockList(stock);
    }
    loadInventory();
  }, []);

  const filteredStock = stockList.filter((item) => {
    if (filter === 'all') return true;
    return item.status?.toLowerCase() === filter;
  });

  const openDetail = (item: BloodStockItem) => {
    setSelectedStock({
      ...item,
      expiryDate: '2025-09-15',
      donationSource: 'Red Cross Blood Bank',
      testResults: 'Cleared - Safe for Transfusion',
    });
    setShowDetailModal(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.headerMeta}>
              <Text style={styles.headerTitle}>Blood Inventory</Text>
              <Text style={styles.headerSubtitle}>Real-time stock levels and management</Text>
            </View>
            <TouchableOpacity style={styles.syncButton}>
              <Ionicons name="refresh" size={20} color="#0058bc" />
            </TouchableOpacity>
          </View>

          {/* Inventory Summary Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Units</Text>
              <Text style={styles.metricValue}>156</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Critical Stock</Text>
              <Text style={[styles.metricValue, { color: '#ba1a1a' }]}>3</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Reserved</Text>
              <Text style={styles.metricValue}>24</Text>
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterBar}>
          {(['all', 'critical', 'low', 'optimal'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Blood Group Cards - Detailed View */}
        <View style={styles.inventoryList}>
          {filteredStock.map((item) => (
            <TouchableOpacity
              key={item.group}
              style={[
                styles.inventoryCard,
                item.status === 'CRITICAL' && styles.cardCritical,
                item.status === 'LOW' && styles.cardLow,
              ]}
              onPress={() => openDetail(item)}
            >
              {/* Card Header with Blood Group and Status */}
              <View style={styles.cardHeader}>
                <View style={styles.groupSection}>
                  <View style={[styles.bloodGroupBadge, getBgBadgeStyle(item.group)]}>
                    <Text style={styles.bloodGroupText}>{item.group}</Text>
                  </View>
                  <View>
                    <Text style={styles.groupName}>{item.group} Blood Group</Text>
                    <Text style={styles.lastUpdated}>Updated {item.lastUpdated}</Text>
                  </View>
                </View>

                <View style={[styles.statusBadge, getStatusBadgeStyle(item.status)]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>

              {/* Inventory Details Grid */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Available</Text>
                  <Text style={styles.detailValue}>{item.unitsAvailable} Units</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Reserved</Text>
                  <Text style={styles.detailValue}>{item.unitsReserved} Units</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Total</Text>
                  <Text style={styles.detailValue}>{(item.unitsAvailable || 0) + (item.unitsReserved || 0)} Units</Text>
                </View>
              </View>

              {/* Stock Level Progress Bar */}
              <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(((item.unitsAvailable || 0) / 50) * 100, 100)}%`,
                        backgroundColor: getProgressColor(item.status),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>
                  {Math.round(((item.unitsAvailable || 0) / 50) * 100)}% Capacity
                </Text>
              </View>

              {/* Action Button */}
              <View style={styles.cardFooter}>
                <TouchableOpacity style={styles.viewDetailBtn} onPress={() => openDetail(item)}>
                  <Ionicons name="chevron-forward" size={16} color="#0058bc" />
                  <Text style={styles.viewDetailBtnText}>View Details</Text>
                </TouchableOpacity>

                {item.status === 'CRITICAL' && (
                  <TouchableOpacity style={styles.emergencyBtn}>
                    <Ionicons name="alert" size={14} color="#ffffff" />
                    <Text style={styles.emergencyBtnText}>Urgent Restock</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Empty State */}
        {filteredStock.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="water-outline" size={48} color="#c5c6ce" />
            <Text style={styles.emptyStateText}>No blood groups in this filter</Text>
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <Ionicons name="chevron-back" size={28} color="#031632" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedStock?.group} Blood - Details</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedStock && (
              <>
                {/* Status Overview */}
                <View style={[styles.modalCard, { marginTop: 0 }]}>
                  <Text style={styles.modalSectionTitle}>Current Status</Text>
                  <View style={styles.statusGrid}>
                    <View style={styles.statusItem}>
                      <Text style={styles.statusItemLabel}>Available</Text>
                      <Text style={styles.statusItemValue}>{selectedStock.unitsAvailable}</Text>
                      <Text style={styles.statusItemUnit}>Units</Text>
                    </View>
                    <View style={styles.statusItem}>
                      <Text style={styles.statusItemLabel}>Reserved</Text>
                      <Text style={styles.statusItemValue}>{selectedStock.unitsReserved}</Text>
                      <Text style={styles.statusItemUnit}>Units</Text>
                    </View>
                    <View style={styles.statusItem}>
                      <Text style={styles.statusItemLabel}>Status</Text>
                      <Text style={[styles.statusItemValue, { color: getStatusColor(selectedStock.status) }]}>
                        {selectedStock.status}
                      </Text>
                      <Text style={styles.statusItemUnit}>Alert Level</Text>
                    </View>
                  </View>
                </View>

                {/* Inventory Details */}
                <View style={styles.modalCard}>
                  <Text style={styles.modalSectionTitle}>Inventory Details</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Expiry Date:</Text>
                    <Text style={styles.detailRowValue}>{selectedStock.expiryDate}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Donation Source:</Text>
                    <Text style={styles.detailRowValue}>{selectedStock.donationSource}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Test Results:</Text>
                    <Text style={[styles.detailRowValue, { color: '#00a673' }]}>{selectedStock.testResults}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.modalCard}>
                  <TouchableOpacity style={styles.modalActionBtn}>
                    <Ionicons name="bicycle" size={20} color="#0058bc" />
                    <Text style={styles.modalActionBtnText}>Dispatch Blood Units</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalActionBtn, { marginTop: 8 }]}>
                    <Ionicons name="call" size={20} color="#0058bc" />
                    <Text style={styles.modalActionBtnText}>Contact Donors</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function getBgBadgeStyle(group: string) {
  const colorMap: { [key: string]: any } = {
    'O-': { backgroundColor: '#ba1a1a' },
    'O+': { backgroundColor: '#d97706' },
    'A-': { backgroundColor: '#0058bc' },
    'A+': { backgroundColor: '#0070eb' },
    'B-': { backgroundColor: '#10b981' },
    'B+': { backgroundColor: '#00a673' },
    'AB-': { backgroundColor: '#7c3aed' },
    'AB+': { backgroundColor: '#8b5cf6' },
  };
  return colorMap[group] || { backgroundColor: '#64748b' };
}

function getStatusBadgeStyle(status?: string) {
  switch (status?.toUpperCase()) {
    case 'CRITICAL':
      return { backgroundColor: '#ffdad6' };
    case 'LOW':
      return { backgroundColor: '#fef3c7' };
    case 'OPTIMAL':
      return { backgroundColor: '#e6f7f0' };
    default:
      return { backgroundColor: '#e5eeff' };
  }
}

function getStatusColor(status?: string) {
  switch (status?.toUpperCase()) {
    case 'CRITICAL':
      return '#ba1a1a';
    case 'LOW':
      return '#d97706';
    case 'OPTIMAL':
      return '#00a673';
    default:
      return '#0058bc';
  }
}

function getProgressColor(status?: string) {
  switch (status?.toUpperCase()) {
    case 'CRITICAL':
      return '#ba1a1a';
    case 'LOW':
      return '#d97706';
    default:
      return '#0058bc';
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9ff' },
  header: { backgroundColor: '#031632', paddingHorizontal: 16, paddingVertical: 12 },
  headerContent: { marginBottom: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerMeta: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff', marginBottom: 2 },
  headerSubtitle: { fontSize: 13, color: '#b6c7eb' },
  syncButton: { padding: 8 },

  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1a2b48',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  metricLabel: { fontSize: 11, color: '#b6c7eb', marginBottom: 4 },
  metricValue: { fontSize: 20, fontWeight: '800', color: '#ffffff' },

  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#1a2b48',
    borderRadius: 8,
    padding: 3,
    gap: 3,
  },
  filterTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  filterTabActive: { backgroundColor: '#0058bc' },
  filterTabText: { fontSize: 11, fontWeight: '600', color: '#b6c7eb' },
  filterTabTextActive: { color: '#ffffff', fontWeight: '700' },

  scrollContent: { padding: 16 },
  inventoryList: { gap: 12 },

  inventoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderColor: '#c5c6ce',
    borderWidth: 1,
    padding: 14,
  },
  cardCritical: { borderColor: '#ba1a1a', backgroundColor: '#ffdad6' },
  cardLow: { borderColor: '#d97706', backgroundColor: '#fef3c7' },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupSection: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  bloodGroupBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloodGroupText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  groupName: { fontSize: 13, fontWeight: '600', color: '#031632' },
  lastUpdated: { fontSize: 11, color: '#75777e' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#0b1c30' },

  detailsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  detailItem: { flex: 1, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 8, padding: 8, alignItems: 'center' },
  detailLabel: { fontSize: 11, color: '#75777e', marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '700', color: '#031632' },

  progressSection: { marginBottom: 12 },
  progressBar: {
    height: 8,
    backgroundColor: '#dce9ff',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: { height: '100%' },
  progressLabel: { fontSize: 10, color: '#75777e' },

  cardFooter: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  viewDetailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    borderColor: '#0058bc',
    borderWidth: 1,
  },
  viewDetailBtnText: { fontSize: 11, fontWeight: '600', color: '#0058bc', marginLeft: 4 },
  emergencyBtn: {
    flexDirection: 'row',
    backgroundColor: '#ba1a1a',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  emergencyBtnText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyStateText: { fontSize: 14, color: '#75777e', marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: '#f8f9ff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#031632',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  modalContent: { paddingHorizontal: 16, paddingVertical: 12 },

  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderColor: '#c5c6ce',
    borderWidth: 1,
  },
  modalSectionTitle: { fontSize: 14, fontWeight: '700', color: '#031632', marginBottom: 12 },

  statusGrid: { flexDirection: 'row', gap: 10 },
  statusItem: { flex: 1, alignItems: 'center', backgroundColor: '#f8f9ff', borderRadius: 10, padding: 12 },
  statusItemLabel: { fontSize: 11, color: '#75777e', marginBottom: 4 },
  statusItemValue: { fontSize: 20, fontWeight: '800', color: '#0058bc', marginBottom: 2 },
  statusItemUnit: { fontSize: 10, color: '#75777e' },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomColor: '#e5eeff', borderBottomWidth: 1 },
  detailRowLabel: { fontSize: 12, color: '#75777e' },
  detailRowValue: { fontSize: 12, fontWeight: '600', color: '#031632' },

  modalActionBtn: {
    flexDirection: 'row',
    backgroundColor: '#eff4ff',
    borderColor: '#0058bc',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 10,
  },
  modalActionBtnText: { fontSize: 13, fontWeight: '700', color: '#0058bc' },
});
