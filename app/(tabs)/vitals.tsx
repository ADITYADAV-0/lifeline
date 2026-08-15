import type { MedicalProfile } from '@/services/appData';
import { API_BASE_URL, API_ORIGIN_URL, getCurrentUser } from '@/services/appData';
import { getLiveVitals } from '@/services/health/vitalService';
import { startSOSLocationTracking } from '@/services/task/locationService';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Accelerometer, Gyroscope } from 'expo-sensors';
import { io, Socket } from 'socket.io-client';

type AccidentStatus = 'ACTIVE' | 'WARNING' | 'EMERGENCY';

type LocationData = {
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
};

type Ambulance = {
  id: string;
  name: string;
  distance: string;
  eta: string;
  available: boolean;
};

type Vitals = {
  heartRate: number | null;
  bloodOxygen: number | null;
  timestamp: number | null;
  connected: boolean;
  source: 'wearable' | 'healthkit' | 'healthconnect' | 'bluetooth' | null;
};

export default function VitalsScreen() {
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [bloodOxygen, setBloodOxygen] = useState<number | null>(null);
  const [vitalsSource, setVitalsSource] = useState<string | null>(null);
  const [lastVitalsUpdate, setLastVitalsUpdate] = useState<Date | null>(null);
  const [profileName, setProfileName] = useState('User');
  const [userId, setUserId] = useState<string | null>(null);
  const [vitalsConnected, setVitalsConnected] = useState(false);
  
  const [profile, setProfile] = useState<MedicalProfile | null>(null);

  const [accidentStatus, setAccidentStatus] =
    useState<AccidentStatus>('ACTIVE');

  const [accelerometer, setAccelerometer] = useState({
    x: 0,
    y: 0,
    z: 0,
  });

  const [gyroscope, setGyroscope] = useState({
    x: 0,
    y: 0,
    z: 0,
  });

  const [accelerometerActive, setAccelerometerActive] = useState(false);
  const [gyroscopeActive, setGyroscopeActive] = useState(false);

  const [location, setLocation] = useState<LocationData>({
    latitude: 26.8467,
    longitude: 80.9462,
    accuracy: 8,
    address: 'Lucknow, Uttar Pradesh',
  });

  const [ambulance, setAmbulance] = useState<Ambulance>({
    id: 'AMB-102',
    name: 'LifeLine Ambulance',
    distance: '2.4 km',
    eta: '7 min',
    available: true,
  });

  const [locationSharing, setLocationSharing] = useState(true);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [countdown, setCountdown] = useState(15);

  const heartScale = useSharedValue(1);
  const socketRef = useRef<Socket | null>(null);
  const userIdRef = useRef<string | null>(null);
  const locationRef = useRef(location);
  const accelerometerRef = useRef(accelerometer);
  const gyroscopeRef = useRef(gyroscope);
  const warningActiveRef = useRef(false);
  const emergencySentRef = useRef(false);

  const sendEmergency = useCallback(async (reason: 'AUTO_ACCIDENT' | 'MANUAL_SOS') => {
    const currentUserId = userIdRef.current;
    const currentLocation = locationRef.current;

    if (!currentUserId) {
      Alert.alert('Sign in required', 'Please sign in before sending an emergency alert.');
      return;
    }

    if (emergencySentRef.current) {
      return;
    }

    emergencySentRef.current = true;
    setAccidentStatus('EMERGENCY');
    setConfirmationVisible(false);
    Vibration.cancel();

    try {
      const response = await fetch(`${API_BASE_URL}/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          accuracy: currentLocation.accuracy,
          reason,
        }),
      });

      if (!response.ok) {
        throw new Error(`SOS request failed (${response.status})`);
      }

      socketRef.current?.emit('location:update', {
        userId: currentUserId,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      });

      try {
        await startSOSLocationTracking();
      } catch (trackingError) {
        console.error('Emergency sent, background tracking failed:', trackingError);
      }
    } catch (error) {
      console.error('Failed to send emergency:', error);
      Alert.alert('Emergency alert failed', 'Could not reach the emergency server. Try SOS again.');
      emergencySentRef.current = false;
    }
  }, []);

  const startConfirmation = useCallback(() => {
    if (warningActiveRef.current || emergencySentRef.current) {
      return;
    }

    warningActiveRef.current = true;
    setAccidentStatus('WARNING');
    setCountdown(15);
    setConfirmationVisible(true);
    Vibration.vibrate([0, 600, 400], true);
  }, []);

  const confirmSafe = useCallback(() => {
    warningActiveRef.current = false;
    setConfirmationVisible(false);
    setAccidentStatus('ACTIVE');
    Vibration.cancel();
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const currentUser = await getCurrentUser();

        if (currentUser) {
          setProfileName(currentUser.name);
          setUserId(currentUser.id);
          userIdRef.current = currentUser.id;
          setProfile(currentUser.profile);
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };

    loadProfile();

    /*load vitas*/
    const loadVitals = async () => {
      try {
        const vitals = await getLiveVitals();

        setHeartRate(vitals.heartRate);
        setBloodOxygen(vitals.bloodOxygen);
        setVitalsConnected(vitals.connected);
        setVitalsSource(vitals.source);
        setLastVitalsUpdate(vitals.timestamp);
      } catch (error) {
        console.error('Failed to load health data:', error);

        setVitalsConnected(false);
        setHeartRate(null);
        setBloodOxygen(null);
      }
    };

    loadVitals();

    /*
     * Heartbeat animation.
     */
    heartScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 150 }),
        withTiming(1, { duration: 150 }),
      ),
      -1,
      true,
    );


    /*
     * REAL ACCELEROMETER + GYROSCOPE
     */
    let accelerometerSubscription: {
      remove: () => void;
    } | null = null;

    let gyroscopeSubscription: {
      remove: () => void;
    } | null = null;

    const startSensors = async () => {
      try {
        const accelerometerAvailable =
          await Accelerometer.isAvailableAsync();

        const gyroscopeAvailable =
          await Gyroscope.isAvailableAsync();

        console.log(
          'Accelerometer available:',
          accelerometerAvailable,
        );

        console.log(
          'Gyroscope available:',
          gyroscopeAvailable,
        );

        if (accelerometerAvailable) {
          Accelerometer.setUpdateInterval(100);

          accelerometerSubscription =
            Accelerometer.addListener((data) => {
              setAccelerometer(data);
              setAccelerometerActive(true);
            });
        } else {
          setAccelerometerActive(false);
        }

        if (gyroscopeAvailable) {
          Gyroscope.setUpdateInterval(100);

          gyroscopeSubscription =
            Gyroscope.addListener((data) => {
              setGyroscope(data);
              setGyroscopeActive(true);
            });
        } else {
          setGyroscopeActive(false);
        }
      } catch (error) {
        console.error(
          'Failed to start sensors:',
          error,
        );

        setAccelerometerActive(false);
        setGyroscopeActive(false);
      }
    };

    startSensors();

    return () => {

      accelerometerSubscription?.remove();
      gyroscopeSubscription?.remove();
    };
  }, []);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    accelerometerRef.current = accelerometer;
  }, [accelerometer]);

  useEffect(() => {
    gyroscopeRef.current = gyroscope;
  }, [gyroscope]);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const startLocation = async () => {
      try {
        let permission = await Location.getForegroundPermissionsAsync();

        if (permission.status !== 'granted') {
          permission = await Location.requestForegroundPermissionsAsync();
        }

        if (permission.status !== 'granted') {
          setLocationSharing(false);
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const nextLocation = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
          accuracy: Math.round(current.coords.accuracy ?? 0),
          address: 'Live GPS location',
        };

        setLocation(nextLocation);
        locationRef.current = nextLocation;
        setLocationSharing(true);

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5,
            timeInterval: 1000,
          },
          (position) => {
            const updatedLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: Math.round(position.coords.accuracy ?? 0),
              address: 'Live GPS location',
            };

            setLocation(updatedLocation);
            locationRef.current = updatedLocation;

            if (emergencySentRef.current && userIdRef.current) {
              socketRef.current?.emit('location:update', {
                userId: userIdRef.current,
                latitude: updatedLocation.latitude,
                longitude: updatedLocation.longitude,
              });
            }
          },
        );
      } catch (error) {
        console.error('Failed to start location:', error);
        setLocationSharing(false);
      }
    };

    startLocation();

    return () => {
      locationSubscription?.remove();
    };
  }, []);

  useEffect(() => {
    const socket = io(API_ORIGIN_URL, {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (userIdRef.current) {
        socket.emit('user:join', userIdRef.current);
      }
    });

    socket.on('accident:warning', startConfirmation);
    socket.on('emergency:created', () => {
      emergencySentRef.current = true;
      warningActiveRef.current = false;
      setAccidentStatus('EMERGENCY');
      setConfirmationVisible(false);
      Vibration.cancel();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [startConfirmation]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    socketRef.current?.emit('user:join', userId);
  }, [userId]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const currentUserId = userIdRef.current;

      if (!currentUserId || !locationSharing || emergencySentRef.current) {
        return;
      }

      const accel = accelerometerRef.current;
      const gyro = gyroscopeRef.current;
      const currentLocation = locationRef.current;
      const accelerationMagnitude = Math.sqrt(
        accel.x * accel.x + accel.y * accel.y + accel.z * accel.z,
      );
      const rotationMagnitude = Math.sqrt(
        gyro.x * gyro.x + gyro.y * gyro.y + gyro.z * gyro.z,
      );

      if (accelerationMagnitude > 18 || rotationMagnitude > 5) {
        startConfirmation();
      }

      socketRef.current?.emit('sensor:reading', {
        userId: currentUserId,
        timestamp: Date.now(),
        accelerometer: accel,
        gyroscope: gyro,
        gps: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          accuracy: currentLocation.accuracy,
          speed: 0,
        },
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [locationSharing, startConfirmation, userId]);

  useEffect(() => {
    if (!confirmationVisible) {
      return;
    }

    if (countdown <= 0) {
      warningActiveRef.current = false;
      sendEmergency('AUTO_ACCIDENT');
      return;
    }

    const timeoutId = setTimeout(() => {
      setCountdown((value) => value - 1);
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [confirmationVisible, countdown, sendEmergency]);

  const animatedHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const triggerSOS = () => {
    Alert.alert(
      'Emergency SOS',
      'This will alert your emergency contacts and request the nearest available ambulance.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'SEND SOS',
          style: 'destructive',
          onPress: () => sendEmergency('MANUAL_SOS'),
        },
      ],
    );
  };

  return (

    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Modal
        transparent
        visible={confirmationVisible}
        animationType="fade"
        onRequestClose={confirmSafe}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Ionicons name="warning" color="#ba1a1a" size={42} />
            <Text style={styles.confirmTitle}>Are you ok?</Text>
            <Text style={styles.confirmText}>
              Possible accident detected. Emergency alert will be sent in {countdown}s.
            </Text>
            <TouchableOpacity style={styles.okButton} onPress={confirmSafe}>
              <Text style={styles.okButtonText}>I am OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerBranding}>
          <Ionicons
            name="alert-circle"
            color="#ba1a1a"
            size={28}
          />

          <Text style={styles.headerText}>LifeLine</Text>
        </View>

        <View style={styles.avatarContainer}>
          <Image
            style={styles.avatar}
            source={{
              uri:
                profile?.avatarUri ||
                'https://i.pinimg.com/236x/76/8d/76/768d764a0a8891c0295842d8c1b9030d.jpg',
            }}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* TITLE */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Emergency Dashboard</Text>

          <Text style={styles.subtitle}>
            LifeLine is protecting {profileName}
          </Text>
        </View>

        {/* ACCIDENT DETECTION STATUS */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIcon}>
              <Ionicons
                name="shield-checkmark"
                size={28}
                color="#ffffff"
              />
            </View>

            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>
                Accident Detection
              </Text>

              <Text style={styles.statusSubtitle}>
                Sensors are actively monitoring
              </Text>
            </View>

            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>ACTIVE</Text>
            </View>
          </View>

          <View style={styles.sensorRow}>
            <SensorStatus
              icon="speedometer-outline"
              label="Accelerometer"
              active={accelerometerActive}
            />

            <SensorStatus
              icon="sync-outline"
              label="Gyroscope"
              active={gyroscopeActive}
            />

            <SensorStatus
              icon="location-outline"
              label="GPS"
              active={locationSharing}
            />
          </View>

          <View style={styles.monitoringInfo}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#004493"
            />

            <Text style={styles.monitoringText}>
              LifeLine continuously analyzes movement, rotation,
              speed and location for possible accidents.
            </Text>
          </View>
        </View>

        {/*Sensor test UI*/}
        <View style={styles.sensorTestCard}>
          <View style={styles.sensorTestHeader}>
            <View>
              <Text style={styles.sensorTestTitle}>
                Sensor Test Data
              </Text>

              <Text style={styles.sensorTestSubtitle}>
                Move and rotate your phone to test the sensors
              </Text>
            </View>

            <View
              style={[
                styles.sensorLiveBadge,
                (!accelerometerActive || !gyroscopeActive) &&
                styles.sensorLiveBadgeOff,
              ]}
            >
              <View
                style={[
                  styles.sensorLiveDot,
                  (!accelerometerActive || !gyroscopeActive) &&
                  styles.sensorLiveDotOff,
                ]}
              />

              <Text
                style={[
                  styles.sensorLiveText,
                  (!accelerometerActive || !gyroscopeActive) &&
                  styles.sensorLiveTextOff,
                ]}
              >
                {accelerometerActive && gyroscopeActive
                  ? 'LIVE'
                  : 'CHECK'}
              </Text>
            </View>
          </View>

          {/* ACCELEROMETER */}

          <View style={styles.sensorDataSection}>
            <View style={styles.sensorDataTitleRow}>
              <Ionicons
                name="speedometer-outline"
                size={20}
                color="#0058bc"
              />

              <Text style={styles.sensorDataTitle}>
                Accelerometer
              </Text>

              <View
                style={[
                  styles.sensorDataStatus,
                  !accelerometerActive &&
                  styles.sensorDataStatusOff,
                ]}
              >
                <Text
                  style={[
                    styles.sensorDataStatusText,
                    !accelerometerActive &&
                    styles.sensorDataStatusTextOff,
                  ]}
                >
                  {accelerometerActive ? 'ACTIVE' : 'OFF'}
                </Text>
              </View>
            </View>

            <View style={styles.sensorValuesRow}>
              <SensorValue
                label="X"
                value={accelerometer.x}
                unit="m/s²"
              />

              <SensorValue
                label="Y"
                value={accelerometer.y}
                unit="m/s²"
              />

              <SensorValue
                label="Z"
                value={accelerometer.z}
                unit="m/s²"
              />
            </View>
          </View>

          {/* GYROSCOPE */}

          <View style={styles.sensorDataSection}>
            <View style={styles.sensorDataTitleRow}>
              <Ionicons
                name="sync-outline"
                size={20}
                color="#0058bc"
              />

              <Text style={styles.sensorDataTitle}>
                Gyroscope
              </Text>

              <View
                style={[
                  styles.sensorDataStatus,
                  !gyroscopeActive &&
                  styles.sensorDataStatusOff,
                ]}
              >
                <Text
                  style={[
                    styles.sensorDataStatusText,
                    !gyroscopeActive &&
                    styles.sensorDataStatusTextOff,
                  ]}
                >
                  {gyroscopeActive ? 'ACTIVE' : 'OFF'}
                </Text>
              </View>
            </View>

            <View style={styles.sensorValuesRow}>
              <SensorValue
                label="X"
                value={gyroscope.x}
                unit="rad/s"
              />

              <SensorValue
                label="Y"
                value={gyroscope.y}
                unit="rad/s"
              />

              <SensorValue
                label="Z"
                value={gyroscope.z}
                unit="rad/s"
              />
            </View>
          </View>

          <View style={styles.monitoringInfo}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#004493"
            />

            <Text style={styles.monitoringText}>
              Accelerometer detects movement and gravity.
              Gyroscope detects rotation. Values should change
              when you move or rotate the phone.
            </Text>
          </View>
        </View>

        {/* LOCATION */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconTitle}>
              <View style={styles.iconWrapper}>
                <Ionicons
                  name="location"
                  color="#0058bc"
                  size={24}
                />
              </View>

              <View>
                <Text style={styles.cardTitle}>
                  Current Location
                </Text>

                <Text style={styles.cardSubtitle}>
                  GPS tracking
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.locationBadge,
                !locationSharing && styles.locationBadgeOff,
              ]}
            >
              <View
                style={[
                  styles.locationDot,
                  !locationSharing && styles.locationDotOff,
                ]}
              />

              <Text
                style={[
                  styles.locationBadgeText,
                  !locationSharing &&
                  styles.locationBadgeTextOff,
                ]}
              >
                {locationSharing ? 'SHARING' : 'OFF'}
              </Text>
            </View>
          </View>

          <Text style={styles.locationAddress}>
            {location.address}
          </Text>

          <View style={styles.coordinatesRow}>
            <View>
              <Text style={styles.coordinateLabel}>
                LATITUDE
              </Text>

              <Text style={styles.coordinateValue}>
                {location.latitude.toFixed(5)}
              </Text>
            </View>

            <View>
              <Text style={styles.coordinateLabel}>
                LONGITUDE
              </Text>

              <Text style={styles.coordinateValue}>
                {location.longitude.toFixed(5)}
              </Text>
            </View>

            <View>
              <Text style={styles.coordinateLabel}>
                ACCURACY
              </Text>

              <Text style={styles.coordinateValue}>
                ±{location.accuracy}m
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.locationButton}
            onPress={() =>
              setLocationSharing((previous) => !previous)
            }
          >
            <Ionicons
              name={
                locationSharing
                  ? 'location-outline'
                  : 'close-circle-outline'
              }
              size={18}
              color="#0058bc"
            />

            <Text style={styles.locationButtonText}>
              {locationSharing
                ? 'Location sharing enabled'
                : 'Enable location sharing'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* LIVE VITALS */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconTitle}>
              <View style={styles.iconWrapper}>
                <Ionicons
                  name="pulse-outline"
                  color="#0058bc"
                  size={24}
                />
              </View>

              <View>
                <Text style={styles.cardTitle}>
                  Live Vitals
                </Text>

                <Text style={styles.cardSubtitle}>
                  Latest available readings
                </Text>
              </View>
            </View>

            {vitalsConnected && (
              <Text style={styles.vitalsSource}>
                Source: {vitalsSource ?? 'Health device'}
                {lastVitalsUpdate
                  ? ` • ${lastVitalsUpdate.toLocaleTimeString()}`
                  : ''}
              </Text>
            )}

            <View
              style={[
                styles.syncBadge,
                !vitalsConnected && styles.syncBadgeOff,
              ]}
            >
              <View
                style={[
                  styles.syncDot,
                  !vitalsConnected && styles.syncDotOff,
                ]}
              />

              <Text
                style={[
                  styles.syncText,
                  !vitalsConnected && styles.syncTextOff,
                ]}
              >
                {vitalsConnected ? 'LIVE' : 'NOT CONNECTED'}
              </Text>
            </View>
          </View>

          <View style={styles.vitalsRow}>
            {/* HEART RATE */}
            <View style={styles.vitalBlock}>
              <View style={styles.vitalLabelRow}>
                <Animated.View style={animatedHeartStyle}>
                  <Ionicons
                    name="heart"
                    color="#ba1a1a"
                    size={17}
                  />
                </Animated.View>

                <Text style={styles.vitalLabel}>
                  Heart Rate
                </Text>
              </View>

              <Text style={styles.vitalValue}>
                {heartRate ?? '--'}{' '}
                <Text style={styles.vitalUnit}>bpm</Text>
              </Text>

              <Text style={styles.vitalStatus}>
                {vitalsConnected && heartRate != null
                  ? `Received from ${vitalsSource ?? 'device'}`
                  : 'Waiting for device'}
              </Text>
            </View>

            {/* BLOOD OXYGEN */}
            <View style={styles.vitalBlock}>
              <View style={styles.vitalLabelRow}>
                <Ionicons
                  name="water-outline"
                  color="#0058bc"
                  size={17}
                />

                <Text style={styles.vitalLabel}>
                  Blood Oxygen
                </Text>
              </View>

              <Text style={styles.vitalValue}>
                {bloodOxygen ?? '--'}{' '}
                <Text style={styles.vitalUnit}>%</Text>
              </Text>

              <Text style={styles.vitalStatus}>
                {vitalsConnected && bloodOxygen != null
                  ? `Received from ${vitalsSource ?? 'device'}`
                  : 'Waiting for device'}
              </Text>
            </View>
          </View>
        </View>

        {/* NEAREST AMBULANCE */}
        <View style={styles.ambulanceCard}>
          <View style={styles.ambulanceHeader}>
            <View style={styles.ambulanceIcon}>
              <Ionicons
                name="medical"
                color="#ffffff"
                size={25}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.ambulanceTitle}>
                Nearest Available Ambulance
              </Text>

              <Text style={styles.ambulanceSubtitle}>
                Ready for emergency dispatch
              </Text>
            </View>

            <View style={styles.availableBadge}>
              <Text style={styles.availableText}>
                AVAILABLE
              </Text>
            </View>
          </View>

          <View style={styles.ambulanceDetails}>
            <View>
              <Text style={styles.ambulanceLabel}>
                AMBULANCE
              </Text>

              <Text style={styles.ambulanceValue}>
                {ambulance.name}
              </Text>
            </View>

            <View>
              <Text style={styles.ambulanceLabel}>
                DISTANCE
              </Text>

              <Text style={styles.ambulanceValue}>
                {ambulance.distance}
              </Text>
            </View>

            <View>
              <Text style={styles.ambulanceLabel}>
                ETA
              </Text>

              <Text style={styles.ambulanceValue}>
                {ambulance.eta}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.mapButton}>
            <Ionicons
              name="map-outline"
              color="#ffffff"
              size={18}
            />

            <Text style={styles.mapButtonText}>
              View Ambulance on Map
            </Text>
          </TouchableOpacity>
        </View>

        {/* EMERGENCY CONTACT */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconTitle}>
              <View style={styles.iconWrapper}>
                <Ionicons
                  name="people-outline"
                  color="#0058bc"
                  size={24}
                />
              </View>

              <View>
                <Text style={styles.cardTitle}>
                  Emergency Contacts
                </Text>

                <Text style={styles.cardSubtitle}>
                  People who will be notified
                </Text>
              </View>
            </View>

            <Text style={styles.contactCount}>
              {profile?.emergencyContacts?.length ?? 0}
            </Text>
          </View>

          {profile?.emergencyContacts?.[0] ? (
            <View style={styles.contactRow}>
              <View style={styles.contactAvatar}>
                <Ionicons
                  name="person"
                  color="#0058bc"
                  size={20}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>
                  {profile.emergencyContacts[0].name}
                </Text>

                <Text style={styles.contactRole}>
                  Primary emergency contact
                </Text>
              </View>

              <Ionicons
                name="checkmark-circle"
                color="#00a673"
                size={22}
              />
            </View>
          ) : (
            <Text style={styles.noContactText}>
              No emergency contact configured.
            </Text>
          )}
        </View>

        {/* MEDICAL SUMMARY */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerHeader}>
            <Ionicons
              name="medkit"
              color="#ffffff"
              size={21}
            />

            <Text style={styles.bannerTitle}>
              Emergency Medical Summary
            </Text>
          </View>

          <View style={styles.bannerRow}>
            <Text style={styles.bannerLabel}>
              Blood Type
            </Text>

            <Text style={styles.bannerValue}>
              {profile?.bloodType ?? 'Not available'}
            </Text>
          </View>

          <View style={styles.bannerRow}>
            <Text style={styles.bannerLabel}>
              Allergies
            </Text>

            <Text
              style={styles.bannerValue}
              numberOfLines={1}
            >
              {profile?.allergies?.length
                ? profile.allergies
                  .map((item) => item.name)
                  .join(', ')
                : 'None recorded'}
            </Text>
          </View>

          <View style={[styles.bannerRow, styles.lastRow]}>
            <Text style={styles.bannerLabel}>
              Emergency Contact
            </Text>

            <Text
              style={styles.bannerValue}
              numberOfLines={1}
            >
              {profile?.emergencyContacts?.[0]?.name ??
                'Not available'}
            </Text>
          </View>
        </View>

        {/* RECENT EVENTS */}
        <View style={styles.card}>
          <View style={styles.timelineHeader}>
            <Text style={styles.timelineTitle}>
              Recent Medical Events
            </Text>

            <TouchableOpacity>
              <Text style={styles.viewAllText}>
                View All
              </Text>
            </TouchableOpacity>
          </View>

          {profile?.events?.length ? (
            <View style={styles.timelineList}>
              {profile.events.slice(0, 3).map((event, index) => (
                <View
                  key={`${event.title}-${index}`}
                  style={styles.timelineItem}
                >
                  <View style={styles.timelineMarker}>
                    <View
                      style={[
                        styles.timelineDot,
                        index > 0 &&
                        styles.timelineDotGray,
                      ]}
                    />

                    {index <
                      Math.min(profile.events.length, 3) -
                      1 && (
                        <View style={styles.timelineLine} />
                      )}
                  </View>

                  <View style={styles.timelineContent}>
                    <View style={styles.timelineTimeRow}>
                      <Text style={styles.eventTitle}>
                        {event.title}
                      </Text>

                      <Text style={styles.eventTime}>
                        {event.time}
                      </Text>
                    </View>

                    <Text style={styles.eventDescription}>
                      {event.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noContactText}>
              No recent medical events.
            </Text>
          )}
        </View>

        {/* SOS */}
        <TouchableOpacity
          style={styles.sosButton}
          activeOpacity={0.9}
          onPress={triggerSOS}
        >
          <Ionicons
            name="alert-circle"
            color="#ffffff"
            size={30}
          />

          <View>
            <Text style={styles.sosButtonText}>
              EMERGENCY SOS
            </Text>

            <Text style={styles.sosSubtext}>
              Alert contacts & request ambulance
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}





/* -------------------------------------------------------------------------- */
/* SENSOR STATUS                                                              */
/* -------------------------------------------------------------------------- */

function SensorStatus({
  icon,
  label,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
}) {
  return (
    <View style={styles.sensorStatus}>
      <Ionicons
        name={icon}
        size={18}
        color={active ? '#0058bc' : '#75777e'}
      />

      <Text style={styles.sensorLabel}>{label}</Text>

      <View
        style={[
          styles.sensorIndicator,
          !active && styles.sensorIndicatorOff,
        ]}
      />
    </View>
  );
}

function SensorValue({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <View style={styles.sensorValue}>
      <Text style={styles.sensorValueLabel}>
        {label}
      </Text>

      <Text style={styles.sensorValueNumber}>
        {value.toFixed(3)}
      </Text>

      <Text style={styles.sensorValueUnit}>
        {unit}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* STYLES                                                                     */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },

  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5eeff',
    backgroundColor: '#ffffff',
  },

  headerBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  headerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#031632',
  },

  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderColor: '#c5c6ce',
    borderWidth: 1,
  },

  avatar: {
    width: '100%',
    height: '100%',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 50,
  },

  titleSection: {
    marginBottom: 18,
  },

  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#031632',
  },

  subtitle: {
    fontSize: 14,
    color: '#44474d',
    marginTop: 4,
  },

  /* ACCIDENT STATUS */

  statusCard: {
    backgroundColor: '#e5eeff',
    borderColor: '#9fbce8',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0058bc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  statusTextContainer: {
    flex: 1,
  },

  statusTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#031632',
  },

  statusSubtitle: {
    fontSize: 12,
    color: '#44474d',
    marginTop: 2,
  },

  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },

  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#00a673',
  },

  activeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#007a56',
  },

  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 22, 50, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  confirmBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffd6d6',
  },

  confirmTitle: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: '900',
    color: '#031632',
  },

  confirmText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#44474d',
    textAlign: 'center',
  },

  okButton: {
    marginTop: 18,
    width: '100%',
    height: 48,
    borderRadius: 10,
    backgroundColor: '#00a673',
    alignItems: 'center',
    justifyContent: 'center',
  },

  okButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },

  sensorRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },

  sensorStatus: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 9,
    alignItems: 'center',
    gap: 5,
  },

  sensorLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#44474d',
    textAlign: 'center',
  },

  sensorIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00a673',
  },

  sensorIndicatorOff: {
    backgroundColor: '#ba1a1a',
  },

  monitoringInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 12,
  },

  monitoringText: {
    flex: 1,
    fontSize: 11,
    color: '#004493',
    lineHeight: 16,
  },

  /* CARD */

  card: {
    backgroundColor: '#ffffff',
    borderColor: '#c5c6ce',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#1a2b48',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  cardIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#e5eeff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#031632',
  },

  cardSubtitle: {
    fontSize: 12,
    color: '#44474d',
  },

  /* LOCATION */

  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#e5f8f0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
  },

  locationBadgeOff: {
    backgroundColor: '#fbeaea',
  },

  locationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00a673',
  },

  locationDotOff: {
    backgroundColor: '#ba1a1a',
  },

  locationBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#007a56',
  },

  locationBadgeTextOff: {
    color: '#ba1a1a',
  },

  locationAddress: {
    fontSize: 15,
    fontWeight: '700',
    color: '#031632',
    marginBottom: 14,
  },

  coordinatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9ff',
    borderRadius: 10,
    padding: 12,
  },

  coordinateLabel: {
    fontSize: 9,
    color: '#75777e',
    fontWeight: '700',
    marginBottom: 3,
  },

  coordinateValue: {
    fontSize: 11,
    color: '#031632',
    fontWeight: '600',
  },

  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 9,
    backgroundColor: '#e5eeff',
  },

  locationButtonText: {
    color: '#0058bc',
    fontSize: 12,
    fontWeight: '700',
  },

  /* VITALS */

  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e5eeff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    gap: 4,
  },

  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00a673',
  },

  syncText: {
    fontSize: 10,
    color: '#004493',
    fontWeight: '700',
  },

  vitalsRow: {
    flexDirection: 'row',
    gap: 12,
  },

  vitalBlock: {
    flex: 1,
    backgroundColor: '#eff4ff',
    borderColor: '#c5c6ce',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-between',
    height: 110,
  },

  vitalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  vitalLabel: {
    fontSize: 12,
    color: '#44474d',
    fontWeight: '500',
  },

  vitalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#031632',
    marginVertical: 4,
  },

  vitalUnit: {
    fontSize: 14,
    fontWeight: '400',
    color: '#44474d',
  },

  vitalStatus: {
    fontSize: 11,
    color: '#00a673',
    fontWeight: '600',
  },

  /* AMBULANCE */

  ambulanceCard: {
    backgroundColor: '#1a2b48',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  ambulanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  ambulanceIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#ba1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  ambulanceTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },

  ambulanceSubtitle: {
    color: '#adc6ff',
    fontSize: 11,
    marginTop: 2,
  },

  availableBadge: {
    backgroundColor: '#d8f5e8',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  availableText: {
    color: '#007a56',
    fontSize: 8,
    fontWeight: '800',
  },

  ambulanceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#374765',
  },

  ambulanceLabel: {
    color: '#adc6ff',
    fontSize: 8,
    fontWeight: '700',
    marginBottom: 4,
  },

  ambulanceValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  mapButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#0058bc',
    paddingVertical: 11,
    borderRadius: 9,
    marginTop: 14,
  },

  mapButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  /* CONTACT */

  contactCount: {
    backgroundColor: '#e5eeff',
    color: '#0058bc',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
    borderRadius: 10,
    padding: 11,
  },

  contactAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e5eeff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  contactName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#031632',
  },

  contactRole: {
    fontSize: 10,
    color: '#75777e',
    marginTop: 2,
  },

  noContactText: {
    fontSize: 12,
    color: '#75777e',
  },

  /* MEDICAL SUMMARY */

  bannerCard: {
    backgroundColor: '#1a2b48',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },

  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#374765',
  },

  lastRow: {
    borderBottomWidth: 0,
  },

  bannerLabel: {
    fontSize: 12,
    color: '#adc6ff',
  },

  bannerValue: {
    maxWidth: '60%',
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'right',
  },

  /* TIMELINE */

  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  timelineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#031632',
  },

  viewAllText: {
    fontSize: 13,
    color: '#0058bc',
    fontWeight: '600',
  },

  timelineList: {
    gap: 4,
  },

  timelineItem: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 70,
  },

  timelineMarker: {
    width: 12,
    alignItems: 'center',
  },

  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0058bc',
    marginTop: 5,
    zIndex: 2,
  },

  timelineDotGray: {
    backgroundColor: '#c5c6ce',
  },

  timelineLine: {
    position: 'absolute',
    top: 14,
    bottom: -10,
    width: 1,
    backgroundColor: '#c5c6ce',
  },

  timelineContent: {
    flex: 1,
    backgroundColor: '#f8f9ff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },

  timelineTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  eventTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#031632',
    flex: 1,
  },

  eventTime: {
    fontSize: 10,
    color: '#75777e',
  },

  eventDescription: {
    fontSize: 11,
    color: '#44474d',
    lineHeight: 16,
  },

  /* SOS */

  sosButton: {
    backgroundColor: '#ba1a1a',
    minHeight: 62,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#ba1a1a',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
    marginTop: 4,
  },

  sosButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  sosSubtext: {
    color: '#ffe5e5',
    fontSize: 9,
    marginTop: 2,
  },


  sensorTestCard: {
    backgroundColor: '#ffffff',
    borderColor: '#9fbce8',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  sensorTestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  sensorTestTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#031632',
  },

  sensorTestSubtitle: {
    fontSize: 11,
    color: '#75777e',
    marginTop: 3,
  },

  sensorLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#e5f8f0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
  },

  sensorLiveBadgeOff: {
    backgroundColor: '#fbeaea',
  },

  sensorLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00a673',
  },

  sensorLiveDotOff: {
    backgroundColor: '#ba1a1a',
  },

  sensorLiveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#007a56',
  },

  sensorLiveTextOff: {
    color: '#ba1a1a',
  },

  sensorDataSection: {
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },

  sensorDataTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  sensorDataTitle: {
    flex: 1,
    marginLeft: 7,
    fontSize: 13,
    fontWeight: '700',
    color: '#031632',
  },

  sensorDataStatus: {
    backgroundColor: '#d8f5e8',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
  },

  sensorDataStatusOff: {
    backgroundColor: '#fbeaea',
  },

  sensorDataStatusText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#007a56',
  },

  sensorDataStatusTextOff: {
    color: '#ba1a1a',
  },

  sensorValuesRow: {
    flexDirection: 'row',
    gap: 8,
  },

  sensorValue: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e5ef',
    borderRadius: 9,
    padding: 9,
    alignItems: 'center',
  },

  sensorValueLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#75777e',
    marginBottom: 3,
  },

  sensorValueNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: '#031632',
  },

  sensorValueUnit: {
    fontSize: 8,
    color: '#75777e',
    marginTop: 2,
  },

  sensorExplanation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 12,
  },

  sensorExplanationText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: '#004493',
  },

  syncBadgeOff: {
    backgroundColor: '#fbeaea',
  },

  syncDotOff: {
    backgroundColor: '#ba1a1a',
  },

  syncTextOff: {
    color: '#ba1a1a',
  },

  vitalsSource: {
    fontSize: 10,
    color: '#75777e',
    marginTop: -10,
    marginBottom: 12,
  },
});
