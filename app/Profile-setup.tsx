import { Allergy, Condition, Contact, getCurrentUser, isProfileComplete, Medication, saveLocalAvatar, updateProfile, } from '@/services/appData';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ALLERGY_SEVERITIES = ['Mild', 'Moderate', 'Severe', 'Anaphylactic'];
const MEDICATION_SCHEDULES = ['Daily', 'Twice Daily', 'Weekly', 'As Needed'];
const RELATION_OPTIONS = ['Parent', 'Sibling', 'Spouse', 'Partner', 'Friend', 'Guardian', 'Other'];

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseStoredDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();

  const isEditMode = mode === 'edit';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  

  // Required basics
  const [avatarUri, setAvatarUri] = useState('');
  const [dob, setDob] = useState('');
  const [dobDate, setDobDate] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [bloodType, setBloodType] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [organDonor, setOrganDonor] = useState(false);

  // Physician
  const [physicianName, setPhysicianName] = useState('');
  const [physicianClinic, setPhysicianClinic] = useState('');
  const [physicianPhone, setPhysicianPhone] = useState('');

  // Dynamic lists
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([{ name: '', relation: '', phone: '' }]);

  useEffect(() => {
    const prefill = async () => {
      const user = await getCurrentUser();
      if (user?.profile) {
        const p = user.profile;
        setAvatarUri(p.avatarUri ?? '');
        setDob(p.dob);
        setDobDate(parseStoredDate(p.dob));
        setBloodType(p.bloodType);
        setHeight((p.height ?? '').replace(/\s*cm$/i, '').trim());
        setWeight((p.weight ?? '').replace(/\s*kg$/i, '').trim());
        setOrganDonor(p.organDonor);
        setPhysicianName(p.physician?.name ?? '');
        setPhysicianClinic(p.physician?.clinic ?? '');
        setPhysicianPhone(p.physician?.phone ?? '');
        if (p.conditions?.length) setConditions(p.conditions);
        if (p.allergies?.length) setAllergies(p.allergies);
        if (p.medications?.length) setMedications(p.medications);
        if (p.emergencyContacts?.length) setContacts(p.emergencyContacts);
      }
      setLoading(false);
    };
    prefill();
  }, []);

  const handlePickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          'Please allow photo library access to upload a profile picture.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const selectedUri = result.assets[0].uri;

      // Copy the temporary ImagePicker file into permanent
      // app document storage.
      const savedUri = await saveLocalAvatar(selectedUri);

      // Update the UI immediately.
      setAvatarUri(savedUri);

      // Save the URI to the profile as well.
      await updateProfile({
        avatarUri: savedUri,
      });
    } catch (error) {
      console.error('Failed to save avatar:', error);

      Alert.alert(
        'Photo error',
        'We could not save your profile photo. Please try again.',
      );
    }
  };



  const onDobChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDobPicker(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    setDobDate(selectedDate);
    setDob(formatDate(selectedDate));
  };

  const handleSave = async () => {
    if (!dob.trim() || !bloodType.trim() || !height.trim() || !weight.trim()) {
      Alert.alert('Missing info', 'DOB, blood type, height, and weight are required for a usable medical ID.');
      return;
    }

    const validContacts = contacts.filter((c) => c.name.trim() && c.phone.trim());
    if (validContacts.length === 0) {
      Alert.alert('Emergency contact required', 'Add at least one emergency contact with a name and phone number.');
      return;
    }

    setSaving(true);
    try {
      const updatedProfile = {
        avatarUri,
        dob: dob.trim(),
        bloodType: bloodType.trim(),
        height: `${height.trim()} cm`,
        weight: `${weight.trim()} kg`,
        organDonor,
        physician: {
          name: physicianName.trim(),
          clinic: physicianClinic.trim(),
          phone: physicianPhone.trim(),
        },
        conditions: conditions.filter((c) => c.name.trim()),
        allergies: allergies.filter((a) => a.name.trim()),
        medications: medications.filter((m) => m.name.trim()),
        emergencyContacts: validContacts,
      };

      const user = await updateProfile(updatedProfile);

      if (isProfileComplete(user.profile)) {
        if (isEditMode) {
          router.back();
        } else {
          router.replace('/(tabs)/vitals');
        }
      } else {
        Alert.alert('Almost there', 'Please double check the required fields.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save your profile.';
      Alert.alert('Save failed', message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#0058bc" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.avatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person-circle" color="#cfe7ff" size={72} />
                </View>
              )}
              <TouchableOpacity style={styles.avatarAction} onPress={handlePickImage} activeOpacity={0.9}>
                <Ionicons name="camera" color="#ffffff" size={12} />
              </TouchableOpacity>
            </View>
            <Text style={styles.title}>Build Your Emergency Profile</Text>
            <Text style={styles.subtitle}>
              Fast, structured details for responders when seconds matter. You can update this anytime.
            </Text>
            <TouchableOpacity style={styles.photoButton} onPress={handlePickImage} activeOpacity={0.85}>
              <Ionicons name="image-outline" color="#0058bc" size={14} />
              <Text style={styles.photoButtonText}>{avatarUri ? 'Change Profile Photo' : 'Upload Profile Photo'}</Text>
            </TouchableOpacity>
          </View>

          {/* Basics */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Basic Info</Text>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Date of Birth *</Text>
                <TouchableOpacity style={styles.inputLike} onPress={() => setShowDobPicker(true)} activeOpacity={0.9}>
                  <Text style={dob ? styles.inputLikeText : styles.inputPlaceholder}>
                    {dob || 'Select date'}
                  </Text>
                  <Ionicons name="calendar-outline" color="#0058bc" size={16} />
                </TouchableOpacity>
              </View>
              <View style={styles.halfField}>
                <SelectField
                  label="Blood Type *"
                  value={bloodType}
                  onChange={setBloodType}
                  placeholder="Choose blood group"
                  options={BLOOD_TYPES}
                />
              </View>
            </View>

            {showDobPicker && (
              <View style={styles.datePickerWrap}>
                <DateTimePicker
                  value={dobDate ?? new Date(1995, 0, 1)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={onDobChange}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity onPress={() => setShowDobPicker(false)} style={styles.dateDoneButton}>
                    <Text style={styles.dateDoneText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Height *</Text>
                <TextInput
                  style={styles.input}
                  value={height}
                  onChangeText={setHeight}
                  placeholder="cm"
                  placeholderTextColor="#75777e"
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>Weight *</Text>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="kg"
                  placeholderTextColor="#75777e"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Organ Donor</Text>
              <Switch
                value={organDonor}
                onValueChange={setOrganDonor}
                trackColor={{ false: '#c5c6ce', true: '#a8c8ff' }}
                thumbColor={organDonor ? '#0058bc' : '#ffffff'}
              />
            </View>
          </View>

          {/* Conditions */}
          <ListSection
            title="Medical Conditions"
            emptyLabel="No conditions added"
            items={conditions}
            onAdd={() => setConditions((prev) => [...prev, { name: '', detail: '', severity: 'info' }])}
            onRemove={(i) => setConditions((prev) => prev.filter((_, idx) => idx !== i))}
            renderFields={(item, i) => (
              <>
                <TextInput
                  style={styles.input}
                  value={item.name}
                  onChangeText={(v) =>
                    setConditions((prev) => prev.map((c, idx) => (idx === i ? { ...c, name: v } : c)))
                  }
                  placeholder="Condition name"
                  placeholderTextColor="#75777e"
                />
                <TextInput
                  style={[styles.input, styles.spacedInput]}
                  value={item.detail}
                  onChangeText={(v) =>
                    setConditions((prev) => prev.map((c, idx) => (idx === i ? { ...c, detail: v } : c)))
                  }
                  multiline
                  placeholder="Detail (e.g. Insulin-dependent, diagnosed 2010)"
                  placeholderTextColor="#75777e"
                />
                <View style={[styles.pillRow, styles.spacedInput]}>
                  {(['critical', 'info'] as const).map((sev) => (
                    <TouchableOpacity
                      key={sev}
                      onPress={() =>
                        setConditions((prev) => prev.map((c, idx) => (idx === i ? { ...c, severity: sev } : c)))
                      }
                      style={[styles.pill, item.severity === sev && styles.pillActive]}
                    >
                      <Text style={[styles.pillText, item.severity === sev && styles.pillTextActive]}>
                        {sev === 'critical' ? 'Critical' : 'Informational'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          />

          {/* Allergies */}
          <ListSection
            title="Allergies"
            emptyLabel="No allergies added"
            items={allergies}
            onAdd={() => setAllergies((prev) => [...prev, { name: '', severity: 'Mild' }])}
            onRemove={(i) => setAllergies((prev) => prev.filter((_, idx) => idx !== i))}
            renderFields={(item, i) => (
              <>
                <TextInput
                  style={styles.input}
                  value={item.name}
                  onChangeText={(v) =>
                    setAllergies((prev) => prev.map((a, idx) => (idx === i ? { ...a, name: v } : a)))
                  }
                  placeholder="Allergy (e.g. Penicillin)"
                  placeholderTextColor="#75777e"
                />
                <SelectField
                  label="Severity"
                  value={item.severity}
                  onChange={(v) =>
                    setAllergies((prev) => prev.map((a, idx) => (idx === i ? { ...a, severity: v } : a)))
                  }
                  placeholder="Select severity"
                  options={ALLERGY_SEVERITIES}
                />
              </>
            )}
          />

          {/* Medications */}
          <ListSection
            title="Current Medications"
            emptyLabel="No medications added"
            items={medications}
            onAdd={() => setMedications((prev) => [...prev, { name: '', dose: '', schedule: '' }])}
            onRemove={(i) => setMedications((prev) => prev.filter((_, idx) => idx !== i))}
            renderFields={(item, i) => (
              <>
                <TextInput
                  style={styles.input}
                  value={item.name}
                  onChangeText={(v) =>
                    setMedications((prev) => prev.map((m, idx) => (idx === i ? { ...m, name: v } : m)))
                  }
                  placeholder="Medication name"
                  placeholderTextColor="#75777e"
                />
                <View style={[styles.row, styles.spacedInput]}>
                  <TextInput
                    style={[styles.input, styles.flexField]}
                    value={item.dose}
                    onChangeText={(v) =>
                      setMedications((prev) => prev.map((m, idx) => (idx === i ? { ...m, dose: v } : m)))
                    }
                    placeholder="Dose (e.g. 20 mg)"
                    placeholderTextColor="#75777e"
                  />
                  <View style={styles.flexField}>
                    <SelectField
                      label="Schedule"
                      value={item.schedule}
                      onChange={(v) =>
                        setMedications((prev) => prev.map((m, idx) => (idx === i ? { ...m, schedule: v } : m)))
                      }
                      placeholder="Choose"
                      options={MEDICATION_SCHEDULES}
                    />
                  </View>
                </View>
              </>
            )}
          />

          {/* Emergency Contacts */}
          <ListSection
            title="Emergency Contacts *"
            emptyLabel="Add at least one contact"
            items={contacts}
            onAdd={() => setContacts((prev) => [...prev, { name: '', relation: '', phone: '' }])}
            onRemove={(i) => setContacts((prev) => prev.filter((_, idx) => idx !== i))}
            renderFields={(item, i) => (
              <>
                <TextInput
                  style={styles.input}
                  value={item.name}
                  onChangeText={(v) =>
                    setContacts((prev) => prev.map((c, idx) => (idx === i ? { ...c, name: v } : c)))
                  }
                  placeholder="Full name"
                  placeholderTextColor="#75777e"
                />
                <View style={[styles.row, styles.spacedInput]}>
                  <View style={styles.flexField}>
                    <SelectField
                      label="Relation"
                      value={item.relation}
                      onChange={(v) =>
                        setContacts((prev) => prev.map((c, idx) => (idx === i ? { ...c, relation: v } : c)))
                      }
                      placeholder="Select relation"
                      options={RELATION_OPTIONS}
                    />
                  </View>
                  <TextInput
                    style={[styles.input, styles.flexField]}
                    value={item.phone}
                    onChangeText={(v) =>
                      setContacts((prev) => prev.map((c, idx) => (idx === i ? { ...c, phone: v } : c)))
                    }
                    placeholder="Phone"
                    placeholderTextColor="#75777e"
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            )}
          />

          {/* Physician */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Primary Physician</Text>
            <TextInput
              style={styles.input}
              value={physicianName}
              onChangeText={setPhysicianName}
              placeholder="Physician name"
              placeholderTextColor="#75777e"
            />
            <TextInput
              style={[styles.input, styles.spacedInput]}
              value={physicianClinic}
              onChangeText={setPhysicianClinic}
              placeholder="Clinic / hospital"
              placeholderTextColor="#75777e"
            />
            <TextInput
              style={[styles.input, styles.spacedInput]}
              value={physicianPhone}
              onChangeText={setPhysicianPhone}
              placeholder="Phone number"
              placeholderTextColor="#75777e"
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSave} activeOpacity={0.9} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.submitButtonContent}>
                <Text style={styles.submitButtonText}>Save & Continue</Text>
                <Ionicons name="arrow-forward" color="#ffffff" size={16} />
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SelectField({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.inputLike} activeOpacity={0.9} onPress={() => setVisible(true)}>
        <Text style={value ? styles.inputLikeText : styles.inputPlaceholder}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" color="#6a7080" size={14} />
      </TouchableOpacity>

      <Modal transparent animationType="fade" visible={visible} onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView style={styles.modalList}>
              {options.map((option) => {
                const selected = option === value;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.modalOption, selected && styles.modalOptionActive]}
                    onPress={() => {
                      onChange(option);
                      setVisible(false);
                    }}
                  >
                    <Text style={[styles.modalOptionText, selected && styles.modalOptionTextActive]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setVisible(false)}>
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Reusable "list of cards with add/remove" section
// ---------------------------------------------------------------------------

function ListSection<T>({
  title,
  emptyLabel,
  items,
  onAdd,
  onRemove,
  renderFields,
}: {
  title: string;
  emptyLabel: string;
  items: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  renderFields: (item: T, index: number) => React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={onAdd} style={styles.addButton}>
          <Ionicons name="add" color="#0058bc" size={14} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 && <Text style={styles.emptyText}>{emptyLabel}</Text>}

      {items.map((item, index) => (
        <View key={index} style={styles.listItemCard}>
          <View style={styles.listItemHeader}>
            <Text style={styles.listItemIndex}>#{index + 1}</Text>
            <TouchableOpacity onPress={() => onRemove(index)}>
              <Ionicons name="trash-outline" color="#ba1a1a" size={16} />
            </TouchableOpacity>
          </View>
          {renderFields(item, index)}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eef4ff' },
  keyboardView: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
    backgroundColor: '#0d2e66',
    borderRadius: 20,
    padding: 18,
  },
  avatarWrap: { position: 'relative', marginTop: 4, marginBottom: 4 },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#17448d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarAction: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: '#0058bc',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  title: { fontSize: 23, fontWeight: '800', color: '#ffffff', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#d8e6ff', textAlign: 'center', paddingHorizontal: 8 },
  photoButton: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  photoButtonText: { color: '#0058bc', fontWeight: '700', fontSize: 12 },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d6e5ff',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#04224a', marginBottom: 12 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderColor: '#0058bc',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addButtonText: { color: '#0058bc', fontSize: 12, fontWeight: '700' },
  emptyText: { fontSize: 13, color: '#75777e', fontStyle: 'italic' },
  row: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1 },
  flexField: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#45506a', marginBottom: 6 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  input: {
    backgroundColor: '#fbfdff',
    borderColor: '#aac6f0',
    borderWidth: 1.4,
    borderRadius: 10,
    minHeight: 46,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0b1c30',
  },
  inputLike: {
    backgroundColor: '#fbfdff',
    borderColor: '#aac6f0',
    borderWidth: 1.4,
    borderRadius: 10,
    height: 46,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLikeText: { color: '#0b1c30', fontSize: 14 },
  inputPlaceholder: { color: '#7d8698', fontSize: 14 },
  datePickerWrap: {
    marginTop: 10,
    marginBottom: 10,
    borderColor: '#d6e5ff',
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    backgroundColor: '#f4f8ff',
  },
  dateDoneButton: { alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 6 },
  dateDoneText: { color: '#0058bc', fontWeight: '700' },
  spacedInput: { marginTop: 10 },
  listItemCard: {
    backgroundColor: '#f7faff',
    borderColor: '#dfebff',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listItemIndex: { fontSize: 11, fontWeight: '700', color: '#6b7381' },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    borderColor: '#c5c6ce',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillActive: { backgroundColor: '#d9e8ff', borderColor: '#0058bc' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#44474d' },
  pillTextActive: { color: '#0058bc', fontWeight: '700' },
  submitButton: {
    backgroundColor: '#0058bc',
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#002c68',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  submitButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 12, 34, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    maxHeight: '68%',
  },
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#04224a', marginBottom: 10 },
  modalList: { maxHeight: 280 },
  modalOption: {
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  modalOptionActive: { backgroundColor: '#d9e8ff' },
  modalOptionText: { color: '#22324f', fontWeight: '500' },
  modalOptionTextActive: { color: '#0058bc', fontWeight: '700' },
  modalCloseButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#e9f1ff',
  },
  modalCloseButtonText: { color: '#0058bc', fontWeight: '700' },
});
