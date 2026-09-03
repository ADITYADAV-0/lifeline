import { ProfileMenuButton } from '@/components/ProfileMenuButton';
import { getCurrentUser } from '@/services/appData';
import {
    AmbulanceProfile,
    BloodBankProfile,
    GovernmentProfile,
    RoleProfileRole,
    saveRoleProfile,
} from '@/services/roleProfiles';
import { Ionicons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

type ProfileValues = AmbulanceProfile | BloodBankProfile | GovernmentProfile;

const configs = {
  ambulance: {
    title: 'Responder profile',
    subtitle: 'Verify your response details before you receive emergency alerts.',
    button: 'Continue to Alerts',
    route: '/(ambulance)/index',
  },
  BloodBank: {
    title: 'Facility profile',
    subtitle: 'Add your verified facility details to manage blood availability.',
    button: 'Continue to Dashboard',
    route: '/(bloodbank)/bloodbank',
  },
  government: {
    title: 'Government profile',
    subtitle: 'Set up your verified identity for city-wide emergency coordination.',
    button: 'Continue to Dashboard',
    route: '/(government)/index',
  },
} as const;

const facilityTypes = ['Blood Bank', 'Government Bank', 'Dark Store', 'Partner Pharmacy'];
const initialRegion: Region = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 12,
  longitudeDelta: 12,
};

export default function RoleProfileSetup({ role }: { role: RoleProfileRole }) {
  const router = useRouter();
  const config = configs[role];
  const [userId, setUserId] = useState<string | null>(null);
  const [values, setValues] = useState<ProfileValues>(() => initialValues(role));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then((user) => setUserId(user?.id ?? null))
      .catch(() => setUserId(null))
      .finally(() => setLoading(false));
  }, []);

  const update = (field: string, value: string | number | null) => {
    setValues((current) => ({ ...current, [field]: value } as ProfileValues));
  };

  const submit = async () => {
    if (!userId) {
      Alert.alert('Session expired', 'Please sign in again to complete your profile.');
      router.replace('/(auth)/login');
      return;
    }

    let requiredFields: string[];
    if (role === 'ambulance') {
      const profile = values as AmbulanceProfile;
      requiredFields = [profile.fullName, profile.licenseId, profile.vehicleNumber, profile.baseBloodBank, profile.phone];
    } else if (role === 'BloodBank') {
      const profile = values as BloodBankProfile;
      requiredFields = [profile.organizationName, profile.facilityType, profile.licenseNumber, profile.address, profile.contactName, profile.contactPhone];
    } else {
      const profile = values as GovernmentProfile;
      requiredFields = [profile.fullName, profile.department, profile.designation, profile.employeeNumber, profile.jurisdiction, profile.phone];
    }

    if (requiredFields.some((field) => !String(field).trim())) {
      Alert.alert('Required details missing', 'Complete every field marked with a red asterisk before continuing.');
      return;
    }

    setSaving(true);
    try {
      await saveRoleProfile(role, userId, values);
      await new Promise((resolve) => setTimeout(resolve, 650));
      router.replace(config.route as Href);
    } catch {
      Alert.alert('Could not save', 'Your profile could not be saved locally. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.safeArea}><View style={styles.center}><ActivityIndicator color="#1D7A85" size="large" /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <View style={styles.header}>
              <View style={styles.icon}><Ionicons name={role === 'ambulance' ? 'car' : role === 'BloodBank' ? 'water' : 'business'} size={24} color="#ffffff" /></View>
              <Text style={styles.kicker}>LIFELINE / {role.toUpperCase()}</Text>
              <Text style={styles.title}>{config.title}</Text>
              <Text style={styles.subtitle}>{config.subtitle}</Text>
            </View>
            <ProfileMenuButton role={role} />
          </View>

          <View style={styles.card}>
            {role === 'ambulance' && <AmbulanceFields values={values as AmbulanceProfile} update={update} />}
            {role === 'BloodBank' && <BloodBankFields values={values as BloodBankProfile} update={update} />}
            {role === 'government' && <GovernmentFields values={values as GovernmentProfile} update={update} />}
          </View>

          <TouchableOpacity style={[styles.button, saving && styles.buttonDisabled]} onPress={submit} disabled={saving} activeOpacity={0.9}>
            {saving ? <ActivityIndicator color="#ffffff" /> : <><Text style={styles.buttonText}>{config.button}</Text><Ionicons name="arrow-forward" size={18} color="#ffffff" /></>}
          </TouchableOpacity>
          <Text style={styles.requiredNote}><Text style={styles.asterisk}>*</Text> Required for verification</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function initialValues(role: RoleProfileRole): ProfileValues {
  if (role === 'ambulance') return { fullName: '', licenseId: '', vehicleNumber: '', baseBloodBank: '', yearsExperience: '', phone: '' };
  if (role === 'BloodBank') return { organizationName: '', facilityType: '', licenseNumber: '', address: '', latitude: null, longitude: null, contactName: '', contactPhone: '', operatingHours: '' };
  return { fullName: '', department: '', designation: '', employeeNumber: '', jurisdiction: '', phone: '' };
}

function Field({ label, value, onChangeText, required = false, placeholder, keyboardType = 'default' }: { label: string; value: string; onChangeText: (value: string) => void; required?: boolean; placeholder: string; keyboardType?: 'default' | 'phone-pad' | 'numeric' }) {
  return <View style={styles.field}><Text style={styles.label}>{label}{required && <Text style={styles.asterisk}> *</Text>}</Text><TextInput style={styles.input} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#7A8587" keyboardType={keyboardType} /></View>;
}

function AmbulanceFields({ values, update }: { values: AmbulanceProfile; update: (field: string, value: string) => void }) {
  return <>
    <Field label="Full name" value={values.fullName} onChangeText={(value) => update('fullName', value)} required placeholder="e.g. Anika Sharma" />
    <Field label="Paramedic license / ID number" value={values.licenseId} onChangeText={(value) => update('licenseId', value)} required placeholder="Enter license or ID" />
    <Field label="Ambulance vehicle number / plate" value={values.vehicleNumber} onChangeText={(value) => update('vehicleNumber', value)} required placeholder="e.g. DL 01 AB 1234" />
    <Field label="Base BloodBank or dispatch center" value={values.baseBloodBank} onChangeText={(value) => update('baseBloodBank', value)} required placeholder="Enter base location" />
    <Field label="Years of experience" value={values.yearsExperience} onChangeText={(value) => update('yearsExperience', value)} placeholder="Optional" keyboardType="numeric" />
    <Field label="Contact phone number" value={values.phone} onChangeText={(value) => update('phone', value)} required placeholder="Enter phone number" keyboardType="phone-pad" />
  </>;
}

function GovernmentFields({ values, update }: { values: GovernmentProfile; update: (field: string, value: string) => void }) {
  return <>
    <Field label="Full name" value={values.fullName} onChangeText={(value) => update('fullName', value)} required placeholder="e.g. Ravi Mehta" />
    <Field label="Department / agency name" value={values.department} onChangeText={(value) => update('department', value)} required placeholder="Enter department or agency" />
    <Field label="Designation / role title" value={values.designation} onChangeText={(value) => update('designation', value)} required placeholder="Enter designation" />
    <Field label="Government ID / employee number" value={values.employeeNumber} onChangeText={(value) => update('employeeNumber', value)} required placeholder="Enter employee number" />
    <Field label="Jurisdiction / region covered" value={values.jurisdiction} onChangeText={(value) => update('jurisdiction', value)} required placeholder="Enter region" />
    <Field label="Contact phone number" value={values.phone} onChangeText={(value) => update('phone', value)} required placeholder="Enter phone number" keyboardType="phone-pad" />
  </>;
}

function BloodBankFields({ values, update }: { values: BloodBankProfile; update: (field: string, value: string | number | null) => void }) {
  const pin = values.latitude !== null && values.longitude !== null;
  return <>
    <Field label="Facility / organization name" value={values.organizationName} onChangeText={(value) => update('organizationName', value)} required placeholder="Enter facility name" />
    <View style={styles.field}><Text style={styles.label}>Facility type <Text style={styles.asterisk}>*</Text></Text><View style={styles.chips}>{facilityTypes.map((type) => <TouchableOpacity key={type} onPress={() => update('facilityType', type)} style={[styles.chip, values.facilityType === type && styles.chipActive]}><Text style={[styles.chipText, values.facilityType === type && styles.chipTextActive]}>{type}</Text></TouchableOpacity>)}</View></View>
    <Field label="License / registration number" value={values.licenseNumber} onChangeText={(value) => update('licenseNumber', value)} required placeholder="Enter registration number" />
    <Field label="Address" value={values.address} onChangeText={(value) => update('address', value)} required placeholder="Enter facility address" />
    <View style={styles.mapWrap}><MapView style={styles.map} initialRegion={initialRegion} onPress={(event) => { update('latitude', event.nativeEvent.coordinate.latitude); update('longitude', event.nativeEvent.coordinate.longitude); }}><Marker coordinate={{ latitude: values.latitude ?? initialRegion.latitude, longitude: values.longitude ?? initialRegion.longitude }} /></MapView><View pointerEvents="none" style={styles.mapLabel}><Ionicons name="location" size={14} color="#E63946" /><Text style={styles.mapLabelText}>{pin ? 'Exact location pinned' : 'Tap map to drop a pin'}</Text></View></View>
    <Field label="Contact person name" value={values.contactName} onChangeText={(value) => update('contactName', value)} required placeholder="Enter contact name" />
    <Field label="Contact phone" value={values.contactPhone} onChangeText={(value) => update('contactPhone', value)} required placeholder="Enter phone number" keyboardType="phone-pad" />
    <Field label="Operating hours" value={values.operatingHours} onChangeText={(value) => update('operatingHours', value)} placeholder="Optional, e.g. 24 hours" />
  </>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7FAF9' },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 },
  header: { flex: 1 },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#1D7A85', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  kicker: { color: '#1D7A85', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#153235', fontSize: 28, fontWeight: '800', marginTop: 5 },
  subtitle: { color: '#587174', fontSize: 14, lineHeight: 21, marginTop: 7 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#DCE9E7' },
  field: { marginBottom: 16 },
  label: { color: '#28484B', fontSize: 13, fontWeight: '700', marginBottom: 7 },
  asterisk: { color: '#E63946' },
  input: { minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: '#BCD1CE', backgroundColor: '#FCFEFD', color: '#153235', paddingHorizontal: 13, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 18, borderWidth: 1, borderColor: '#BCD1CE', paddingHorizontal: 12, paddingVertical: 9 },
  chipActive: { backgroundColor: '#DDEFEF', borderColor: '#1D7A85' },
  chipText: { color: '#496366', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#1D7A85', fontWeight: '800' },
  mapWrap: { height: 170, borderRadius: 12, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#BCD1CE' },
  map: { flex: 1 },
  mapLabel: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFFEE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  mapLabelText: { color: '#28484B', fontSize: 11, fontWeight: '700' },
  button: { minHeight: 52, borderRadius: 12, backgroundColor: '#1D7A85', marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  requiredNote: { textAlign: 'center', color: '#718285', fontSize: 12, marginTop: 11 },
});
