import {
  Ambulance,
  API_ORIGIN_URL,
  Facility,
  getAvailableAmbulances,
  getFacilities,
} from '@/services/appData';
import {
  startSOSLocationTracking,
  stopSOSLocationTracking,
} from '@/services/task/locationService';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, {
  Circle,
  Marker,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io, Socket } from 'socket.io-client';

type FilterId = 'BloodBanks' | 'pharmacies' | 'ambulances' | 'urgent_care';

type UserLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

type AmbulanceLocationUpdate = Pick<
  Ambulance,
  'id' | 'latitude' | 'longitude'
> &
  Partial<Omit<Ambulance, 'id' | 'latitude' | 'longitude'>>;

const DEFAULT_REGION: Region = {
  latitude: 26.8467,
  longitude: 80.9462,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const filterChips: {
  id: FilterId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
    { id: 'BloodBanks', label: 'BloodBanks', icon: 'business' },
    { id: 'pharmacies', label: 'Pharmacies', icon: 'medkit' },
    { id: 'ambulances', label: 'Ambulances', icon: 'car' },
    { id: 'urgent_care', label: 'Urgent Care', icon: 'medical' },
  ];

const facilityTypeByFilter: Record<FilterId, Facility['type']> = {
  BloodBanks: 'BloodBank',
  pharmacies: 'Pharmacy',
  ambulances: 'Ambulance',
  urgent_care: 'Urgent Care',
};

function getFacilityIcon(type: Facility['type']): keyof typeof Ionicons.glyphMap {
  if (type === 'BloodBank') return 'business';
  if (type === 'Pharmacy') return 'medkit';
  if (type === 'Ambulance') return 'car';
  return 'medical';
}

export default function MapScreen() {
  const mapRef = useRef<MapView | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [sosActive, setSosActive] = useState(false);

  const [selectedFilter, setSelectedFilter] =
    useState<FilterId>('pharmacies');
  const [search, setSearch] = useState('');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [activeFacility, setActiveFacility] = useState<Facility | null>(null);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const centerMapOnUser = useCallback(() => {
    if (!userLocation) return;

    mapRef.current?.animateToRegion(
      {
        ...DEFAULT_REGION,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      },
      450,
    );
  }, [userLocation]);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    async function initializeMap() {
      try {
        const [facilityResults, ambulanceResults] = await Promise.all([
          getFacilities(),
          getAvailableAmbulances(),
        ]);

        if (!isMounted) return;

        setFacilities(facilityResults);
        setAmbulances(ambulanceResults);
        setActiveFacility(facilityResults[0] ?? null);
      } catch (error) {
        console.error('Map data loading failed:', error);
      }

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (!isMounted) return;

      const nextLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy ?? undefined,
      };

      setUserLocation(nextLocation);
      mapRef.current?.animateToRegion(
        {
          ...DEFAULT_REGION,
          latitude: nextLocation.latitude,
          longitude: nextLocation.longitude,
        },
        450,
      );

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 5000,
        },
        (location: Location.LocationObject) => {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy ?? undefined,
          });
        },
      );
    }

    initializeMap().catch((error) => {
      console.error('Map initialization failed:', error);
    });

    return () => {
      isMounted = false;
      locationSubscription?.remove();
    };
  }, []);

  const [rendezvousPoint, setRendezvousPoint] = useState<{
    latitude: number;
    longitude: number;
    address: string;
    etaMinutes: number;
  } | null>(null);

  useEffect(() => {
    const socket = io(API_ORIGIN_URL, {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('case:live_update', (activeCase: any) => {
      if (activeCase?.rendezvousPoint) {
        setRendezvousPoint(activeCase.rendezvousPoint);
      }
      if (activeCase?.ambulanceLocation) {
        setAmbulances((current) =>
          current.map((amb) =>
            amb.id === (activeCase.assignedAmbulanceId || 'AMB-101')
              ? {
                  ...amb,
                  latitude: activeCase.ambulanceLocation.latitude,
                  longitude: activeCase.ambulanceLocation.longitude,
                  status: 'DISPATCHED',
                }
              : amb,
          ),
        );
      }
    });

    socket.on(
      'ambulance:location',
      (update: AmbulanceLocationUpdate) => {
        if (
          !update.id ||
          typeof update.latitude !== 'number' ||
          typeof update.longitude !== 'number'
        ) {
          return;
        }

        setAmbulances((current) => {
          const existing = current.find((item) => item.id === update.id);

          if (!existing) {
            return [
              ...current,
              {
                id: update.id,
                name: update.name ?? `Ambulance ${update.id}`,
                driverName: update.driverName ?? 'Driver unavailable',
                latitude: update.latitude,
                longitude: update.longitude,
                status: update.status ?? 'AVAILABLE',
                BloodBankName: update.BloodBankName ?? 'LifeLine Network',
                equipment: update.equipment ?? [],
              },
            ];
          }

          return current.map((item) =>
            item.id === update.id
              ? {
                ...item,
                ...update,
                latitude: update.latitude,
                longitude: update.longitude,
              }
              : item,
          );
        });
      },
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const visibleFacilities = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const selectedType = facilityTypeByFilter[selectedFilter];

    return facilities.filter((facility) => {
      const matchesFilter = facility.type === selectedType;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        facility.name.toLowerCase().includes(normalizedSearch) ||
        facility.type.toLowerCase().includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [facilities, search, selectedFilter]);

  const visibleAmbulances = useMemo(() => {
    if (selectedFilter !== 'ambulances') return [];

    const normalizedSearch = search.trim().toLowerCase();

    return ambulances.filter((ambulance) => {
      if (!normalizedSearch) return true;

      return (
        ambulance.name.toLowerCase().includes(normalizedSearch) ||
        ambulance.id.toLowerCase().includes(normalizedSearch) ||
        ambulance.status.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [ambulances, search, selectedFilter]);

  const handleSOS = useCallback(async () => {
    try {
      if (sosActive) {
        await stopSOSLocationTracking();

        setSosActive(false);

        console.log('SOS tracking stopped');

        return;
      }

      await startSOSLocationTracking();

      setSosActive(true);

      console.log('SOS tracking started');
    } catch (error) {
      console.error('SOS location error:', error);
    }
  }, [sosActive]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.overlayContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" color="#75777e" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search BloodBanks, pharmacies..."
            placeholderTextColor="#75777e"
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity style={styles.micButton}>
            <Ionicons name="mic" color="#75777e" size={18} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipContent}
        >
          {filterChips.map((chip) => {
            const isSelected = selectedFilter === chip.id;

            return (
              <TouchableOpacity
                key={chip.id}
                onPress={() => setSelectedFilter(chip.id)}
                activeOpacity={0.85}
                style={[styles.chip, isSelected && styles.chipActive]}
              >
                <Ionicons
                  name={chip.icon}
                  color={isSelected ? '#ffffff' : '#031632'}
                  size={16}
                />
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextActive,
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass
          showsTraffic
          initialRegion={DEFAULT_REGION}
        >
          {userLocation && (
            <Circle
              center={userLocation}
              radius={userLocation.accuracy ?? 50}
              fillColor="rgba(0, 88, 188, 0.12)"
              strokeColor="rgba(0, 88, 188, 0.3)"
            />
          )}

          {userLocation && (
            <Marker
              coordinate={userLocation}
              title="You"
              description="Your current location"
            >
              <View style={styles.userMarker}>
                <View style={styles.userMarkerDot} />
              </View>
            </Marker>
          )}

          {visibleFacilities.map((facility) => (
            <Marker
              key={facility.id}
              coordinate={{
                latitude: facility.latitude,
                longitude: facility.longitude,
              }}
              title={facility.name}
              description={`${facility.type} - ${facility.status}`}
              onPress={() => setActiveFacility(facility)}
            >
              <View style={styles.facilityMarker}>
                <Ionicons
                  name={getFacilityIcon(facility.type)}
                  size={20}
                  color="#ffffff"
                />
              </View>
            </Marker>
          ))}

          {visibleAmbulances.map((ambulance) => (
            <Marker
              key={ambulance.id}
              coordinate={{
                latitude: ambulance.latitude,
                longitude: ambulance.longitude,
              }}
              title={ambulance.name}
              description={`${ambulance.status} - ${ambulance.BloodBankName}`}
            >
              <View
                style={[
                  styles.facilityMarker,
                  ambulance.status === 'DISPATCHED' &&
                  styles.ambulanceMarkerDispatched,
                ]}
              >
                <Ionicons name="car" size={20} color="#ffffff" />
              </View>
            </Marker>
          ))}

          {rendezvousPoint && (
            <Marker
              coordinate={{
                latitude: rendezvousPoint.latitude,
                longitude: rendezvousPoint.longitude,
              }}
              title="Dynamic Rendezvous Point"
              description={`ETA: ${rendezvousPoint.etaMinutes} mins • ${rendezvousPoint.address}`}
            >
              <View style={[styles.facilityMarker, { backgroundColor: '#d97706', borderColor: '#ffffff', borderWidth: 2 }]}>
                <Ionicons name="water" size={22} color="#ffffff" />
              </View>
            </Marker>
          )}
        </MapView>

        {activeFacility && selectedFilter !== 'ambulances' && (
          <View style={styles.popover}>
            <Text style={styles.popoverTitle}>{activeFacility.name}</Text>
            <Text style={styles.popoverSubtitle}>
              {activeFacility.type} - {activeFacility.distance} -{' '}
              {activeFacility.status}
            </Text>
            <TouchableOpacity style={styles.popoverButton} activeOpacity={0.85}>
              <Text style={styles.popoverButtonText}>View details</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.fabColumn}>
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={centerMapOnUser}
        >
          <Ionicons name="location" color="#031632" size={22} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.fab,
            styles.fabSos,
            sosActive && styles.fabSosActive,
          ]}
          activeOpacity={0.85}
          onPress={handleSOS}
        >
          <Ionicons name="alert-circle" color="#ffffff" size={24} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  overlayContainer: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#c5c6ce',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    shadowColor: '#1a2b48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 8,
    fontSize: 15,
    color: '#0b1c30',
  },
  micButton: {
    padding: 6,
  },
  chipScroll: {
    maxHeight: 38,
  },
  chipContent: {
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#c5c6ce',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 36,
    gap: 6,
    shadowColor: '#1a2b48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  chipActive: {
    backgroundColor: '#0058bc',
    borderColor: '#0058bc',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#031632',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#f1f3f5',
    position: 'relative',
  },
  popover: {
    position: 'absolute',
    left: 16,
    right: 84,
    bottom: 24,
    backgroundColor: '#ffffff',
    borderColor: '#c5c6ce',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#1a2b48',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  popoverTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#031632',
    marginBottom: 4,
  },
  popoverSubtitle: {
    fontSize: 11,
    color: '#75777e',
    marginBottom: 10,
  },
  popoverButton: {
    backgroundColor: '#0058bc',
    borderRadius: 6,
    paddingVertical: 8,
    width: '100%',
    alignItems: 'center',
  },
  popoverButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  fabColumn: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    gap: 12,
    zIndex: 10,
  },
  fabSosActive: {
    backgroundColor: '#7f0000',
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderColor: '#c5c6ce',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1a2b48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  fabSos: {
    backgroundColor: '#ba1a1a',
    borderColor: '#ba1a1a',
    shadowColor: '#ba1a1a',
  },
  userMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 88, 188, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#0058bc',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  facilityMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0058bc',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  ambulanceMarkerDispatched: {
    backgroundColor: '#ba1a1a',
  },
});
