import type { MedicalProfile } from '@/services/appData';
import { getCurrentUser, signOut } from '@/services/appData';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MedicalIdScreen() {
  const [userName, setUserName] = useState('User');
  const [profile, setProfile] = useState<MedicalProfile | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadProfile = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUserName(currentUser.name.trim() || 'User');
        setProfile(currentUser.profile);
      }
    };

    loadProfile();
  }, []);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => { });
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Sticky Header */}
      <View style={styles.header}>
        <View style={styles.headerBranding}>
          <Ionicons name="alert-circle" color="#ba1a1a" size={28} />
          <Text style={styles.headerText}>LifeLine</Text>
        </View>
        <View style={styles.avatarContainer}>
          <Image
            style={styles.avatar}
            source={{
              uri: profile?.avatarUri || 'https://i.pinimg.com/236x/76/8d/76/768d764a0a8891c0295842d8c1b9030d.jpg',
            }}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Medical ID</Text>
          <Text style={styles.subtitle}>Critical health information for first responders.</Text>
        </View>

        {/* Personal Details Card */}
        <View style={styles.card}>
          <View style={styles.personalRow}>
            <View style={styles.idPhotoContainer}>
              <Image
                style={styles.idPhoto}
                source={{
                  uri: profile?.avatarUri || 'https://i.pinimg.com/236x/76/8d/76/768d764a0a8891c0295842d8c1b9030d.jpg',
                }}
              />
            </View>
            <View style={styles.personalDetails}>
              <Text style={styles.name}>{userName}</Text>

              <View style={styles.statsGrid}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>DOB</Text>
                  <Text style={styles.statValue}>{profile?.dob ?? 'Oct 14, 1985 (38)'}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Blood Type</Text>
                  <Text style={[styles.statValue, styles.bloodText]}>
                    <Ionicons name="water" color="#ba1a1a" size={12} /> {profile?.bloodType ?? 'O Negative'}
                  </Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Height / Weight</Text>
                  <Text style={styles.statValue}>{profile?.height ?? '5\'6"'} / {profile?.weight ?? '142 lbs'}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Organ Donor</Text>
                  <Text style={styles.statValue}>{profile?.organDonor ? 'Yes' : 'No'}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Medical Conditions Card */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="pulse" color="#0058bc" size={20} />
            <Text style={styles.sectionTitle}>Medical Conditions</Text>
          </View>

          {profile?.conditions && profile.conditions.length > 0 ? (
            <View style={styles.conditionsList}>
              {profile.conditions.map((condition: any, index: number) => (
                <View
                  key={condition.name + index}
                  style={styles.conditionItem}
                >
                  <Ionicons
                    name={
                      condition.severity === 'critical'
                        ? 'warning'
                        : 'information-circle'
                    }
                    color={
                      condition.severity === 'critical'
                        ? '#ba1a1a'
                        : '#0058bc'
                    }
                    size={18}
                  />

                  <View style={{ flex: 1 }}>
                    <Text style={styles.conditionName}>
                      {condition.name}
                    </Text>

                    {condition.detail ? (
                      <Text style={styles.conditionDetail}>
                        {condition.detail}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyMedicalState}>
              <Ionicons
                name="checkmark-circle-outline"
                size={22}
                color="#00a673"
              />

              <View style={{ flex: 1 }}>
                <Text style={styles.emptyMedicalTitle}>
                  No medical conditions recorded
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Allergies Card */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="bandage" color="#0058bc" size={20} />
            <Text style={styles.sectionTitle}>Allergies</Text>
          </View>

          {profile?.allergies && profile.allergies.length > 0 ? (
            <View style={styles.allergiesGrid}>
              {profile?.allergies?.map((allergy: any, index: number) => (
                <View key={allergy.name + index} style={index === 0 ? styles.allergyBadgeSevere : styles.allergyBadge}>
                  {index === 0 ? <Ionicons name="alert-circle" color="#93000a" size={12} /> : null}
                  <Text style={index === 0 ? styles.allergyBadgeSevereText : styles.allergyBadgeText}>
                    {allergy.name} ({allergy.severity})
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyMedicalState}>
              <Ionicons
                name="checkmark-circle-outline"
                size={22}
                color="#00a673"
              />

              <View style={{ flex: 1 }}>
                <Text style={styles.emptyMedicalTitle}>
                  No allergies recorded
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Current Medications */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="medical" color="#0058bc" size={20} />
            <Text style={styles.sectionTitle}>Current Medications</Text>
          </View>

          {profile?.medications && profile.medications.length > 0 ? (
            <View style={styles.medsList}>
              {profile?.medications?.map((medication: any, index: number) => (
                <View key={medication.name + index} style={[styles.medItem, index === profile.medications.length - 1 && styles.lastItem]}>
                  <View>
                    <Text style={styles.medName}>{medication.name}</Text>
                    <Text style={styles.medDose}>{medication.dose}</Text>
                  </View>
                  <View style={[styles.medSchedule, index > 0 && styles.medScheduleGray]}>
                    <Text style={index > 0 ? styles.medScheduleTextGray : styles.medScheduleText}>{medication.schedule}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyMedicalState}>
              <Ionicons
                name="checkmark-circle-outline"
                size={22}
                color="#00a673"
              />

              <View style={{ flex: 1 }}>
                <Text style={styles.emptyMedicalTitle}>
                  No current medications
                </Text>

              </View>
            </View>
          )}
        </View>

        {/* Emergency Contacts */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="call" color="#0058bc" size={20} />
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          </View>

          {profile?.emergencyContacts &&
            profile.emergencyContacts.length > 0 ? (
            <View style={styles.contactsList}>
              {profile.emergencyContacts.map(
                (contact: any, index: number) => (
                  <View
                    key={contact.name + index}
                    style={[
                      styles.contactItem,
                      index === profile.emergencyContacts.length - 1 &&
                      styles.lastItem,
                    ]}
                  >
                    <View style={styles.avatarTextRow}>
                      <View
                        style={[
                          styles.avatarInitials,
                          index > 0 && styles.avatarInitialsGray,
                        ]}
                      >
                        <Text
                          style={
                            index > 0
                              ? styles.avatarInitialsTextGray
                              : styles.avatarInitialsText
                          }
                        >
                          {contact.name
                            .split(' ')
                            .map((part: string) => part[0])
                            .slice(0, 2)
                            .join('')}
                        </Text>
                      </View>

                      <View style={{}}>
                        <Text style={styles.contactName}>
                          {contact.name}
                        </Text>

                        <Text style={styles.contactRelation}>
                          {contact.relation}
                        </Text>
                      </View>
                    </View>

                    {contact.phone ? (
                      <TouchableOpacity
                        onPress={() => handleCall(contact.phone)}
                        style={styles.callButton}
                      >
                        <Ionicons
                          name="call"
                          color="#0058bc"
                          size={16}
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ),
              )}
            </View>
          ) : (
            <View style={styles.emptyMedicalState}>
              <Ionicons
                name="person-add-outline"
                size={22}
                color="#75777e"
              />

              <View style={{ flex: 1 }}>
                <Text style={styles.emptyMedicalTitle}>
                  No emergency contacts
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Primary Physician */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Ionicons
              name="person-add"
              color="#0058bc"
              size={20}
            />

            <Text style={styles.sectionTitle}>
              Primary Physician
            </Text>
          </View>

          {profile?.physician.name ? (
            <View style={styles.physicianDetails}>
              <View style={{ flex: 1 }}>
                <Text style={styles.physicianName}>
                  {profile.physician.name}
                </Text>

                {profile.physician.clinic ? (
                  <Text style={styles.physicianClinic}>
                    {profile.physician.clinic}
                  </Text>
                ) : null}

                {profile.physician.phone ? (
                  <Text style={styles.physicianPhone}>
                    {profile.physician.phone}
                  </Text>
                ) : null}
              </View>

              {profile.physician.phone ? (
                <TouchableOpacity
                  onPress={() =>
                    handleCall(profile.physician.phone)
                  }
                  style={styles.callButton}
                >
                  <Ionicons
                    name="call"
                    color="#0058bc"
                    size={16}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View style={styles.emptyMedicalState}>
              <Ionicons
                name="person-outline"
                size={22}
                color="#75777e"
              />

              <View style={{ flex: 1 }}>
                <Text style={styles.emptyMedicalTitle}>
                  No Primary physician recorded
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Update Profile */}
        <TouchableOpacity
          style={styles.updateProfileButton}
          onPress={() => router.push('/Profile-setup?mode=edit')}
          activeOpacity={0.85}
        >
          <Ionicons name="create-outline" color="#0058bc" size={18} />
          <Text style={styles.updateProfileButtonText}>Update Profile</Text>
        </TouchableOpacity>



        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" color="#ba1a1a" size={18} />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

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
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#031632',
  },
  subtitle: {
    fontSize: 14,
    color: '#44474d',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#c5c6ce',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#1a2b48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  personalRow: {
    flexDirection: 'row',
    gap: 16,
  },
  idPhotoContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    borderColor: '#c5c6ce',
    borderWidth: 1,
    backgroundColor: '#f8f9ff',
  },
  idPhoto: {
    width: '100%',
    height: '100%',
  },
  personalDetails: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#031632',
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
    columnGap: 16,
  },
  statCol: {
    flexBasis: '45%',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#75777e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 13,
    color: '#0b1c30',
    fontWeight: '600',
    marginTop: 2,
  },
  bloodText: {
    color: '#ba1a1a',
    fontWeight: '700',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eff4ff',
    paddingBottom: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#031632',
  },
  conditionsList: {
    gap: 12,
  },
  conditionItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  conditionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0b1c30',
  },
  conditionDetail: {
    fontSize: 12,
    color: '#44474d',
    marginTop: 2,
  },
  allergiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  allergyBadgeSevere: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffdad6',
    borderColor: '#ffb4ab',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  allergyBadgeSevereText: {
    color: '#93000a',
    fontSize: 12,
    fontWeight: '700',
  },
  allergyBadge: {
    backgroundColor: '#d3e4fe',
    borderColor: '#c5c6ce',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  allergyBadgeText: {
    color: '#374765',
    fontSize: 12,
    fontWeight: '600',
  },
  medsList: {
    gap: 12,
  },
  medItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eff4ff',
    paddingBottom: 10,
  },
  lastItem: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  medName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0b1c30',
  },
  medDose: {
    fontSize: 12,
    color: '#44474d',
    marginTop: 2,
  },
  medSchedule: {
    backgroundColor: '#d8e2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  medScheduleText: {
    color: '#004493',
    fontSize: 12,
    fontWeight: '700',
  },
  medScheduleGray: {
    backgroundColor: '#d3e4fe',
  },
  medScheduleTextGray: {
    color: '#374765',
    fontSize: 12,
    fontWeight: '600',
  },
  contactsList: {
    gap: 16,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eff4ff',
    paddingBottom: 12,
  },
  avatarTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d7e2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    color: '#081b38',
    fontSize: 14,
    fontWeight: '700',
  },
  avatarInitialsGray: {
    backgroundColor: '#d3e4fe',
  },
  avatarInitialsTextGray: {
    color: '#374765',
    fontSize: 14,
    fontWeight: '700',
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0b1c30',
  },
  contactRelation: {
    fontSize: 12,
    color: '#44474d',
    marginTop: 2,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderColor: '#c5c6ce',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  physicianDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  physicianName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#11263d',
  },
  physicianClinic: {
    fontSize: 12,
    color: '#44474d',
    marginTop: 2,
  },
  physicianPhone: {
    fontSize: 12,
    color: '#75777e',
    marginTop: 1,
  },
  updateProfileButton: {
    marginTop: 8,
    marginBottom: 12,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#0058bc',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  updateProfileButtonText: {
    color: '#0058bc',
    fontSize: 15,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderColor: '#ffb4ab',
    borderWidth: 1.5,
    borderRadius: 12,
    height: 48,
    marginTop: 4,
    marginBottom: 8,
  },
  logoutButtonText: {
    color: '#ba1a1a',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyMedicalState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#e5f8f0',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },

  emptyMedicalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007a56',
  },

});
