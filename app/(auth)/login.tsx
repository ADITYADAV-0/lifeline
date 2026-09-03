import { getActiveSession, isProfileComplete, signIn, signUp } from '@/services/appData';
import { getHomeRouteForRole, getProfileSetupRouteForRole } from '@/services/roleRoutes';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';

const roles = [
  { id: 'citizen', label: 'Citizen', icon: 'person' },
  { id: 'ambulance', label: 'Ambulance', icon: 'car' },
  { id: 'BloodBank', label: 'BloodBank', icon: 'water' },
  { id: 'government', label: 'Government', icon: 'business' },
] as const;

export default function AuthScreen() {
  const [selectedRole, setSelectedRole] = useState<'citizen' | 'ambulance' | 'BloodBank' | 'government'>('citizen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const bootstrapSession = async () => {
      const session = await getActiveSession();
      if (session) {
        router.replace(isProfileComplete(session.profile) ? getHomeRouteForRole(session.role) : getProfileSetupRouteForRole(session.role));
      }
    };

    bootstrapSession();
  }, [router]);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Missing details', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      let user;
      if (isSignUp) {
        if (!name.trim()) {
          Alert.alert('Name required', 'Please enter your full name to create an account.');
          setLoading(false);
          return;
        }

        user = await signUp({ email, password, role: selectedRole, name });
      } else {
        user = await signIn(email, password, selectedRole);
      }

      router.replace(isProfileComplete(user.profile) ? getHomeRouteForRole(user.role) : getProfileSetupRouteForRole(user.role));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to complete the request.';
      Alert.alert('Authentication issue', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Branding */}
          <View style={styles.brandingHeader}>
          <Ionicons name="alert-circle" color="#0058bc" size={32} />
            <Text style={styles.brandingText}>LifeLine</Text>
          </View>

          {/* Form Container */}
          <View style={styles.formCard}>
            <Text style={styles.title}>{isSignUp ? 'Create Your Account' : 'Secure Sign In'}</Text>
            <Text style={styles.subtitle}>
              {isSignUp ? 'Register your responder or patient account to access live care tools.' : 'Sign in to access your medical dashboard and emergency services.'}
            </Text>

            {/* Role Bento Grid */}
            <View style={styles.roleGrid}>
              {roles.map((role) => {
                const isSelected = selectedRole === role.id;
                return (
                  <TouchableOpacity
                    key={role.id}
                    onPress={() => setSelectedRole(role.id)}
                    activeOpacity={0.8}
                    style={[
                      styles.roleButton,
                      isSelected && styles.roleButtonActive,
                    ]}
                  >
                  <Ionicons
                  name={role.icon as keyof typeof Ionicons.glyphMap}
                  color={isSelected ? '#0058bc' : '#44474d'}
                  size={28}
                  />
                    <Text
                      style={[
                        styles.roleLabel,
                        isSelected && styles.roleLabelActive,
                      ]}
                    >
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#75777e"
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={`Enter your ${selectedRole} email`}
                placeholderTextColor="#75777e"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity>
                  <Text style={styles.forgotText}>Forgot?</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#75777e"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              activeOpacity={0.9}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={styles.submitButtonContent}>
                  <Text style={styles.submitButtonText}>{isSignUp ? 'Create Account' : 'Secure Login'}</Text>
                  <Ionicons name="arrow-forward" color="#ffffff" size={16} />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.toggleButton} onPress={() => setIsSignUp((prev) => !prev)}>
              <Text style={styles.toggleText}>
                {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
              </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {isSignUp ? 'New facility or responder?' : 'New facility or responder?'}{' '}
                <Text style={styles.requestAccess}>Request Access</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  brandingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  brandingText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#031632',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderColor: '#c5c6ce',
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#1a2b48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#031632',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#44474d',
    marginBottom: 16,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  roleButton: {
    flexBasis: '48%',
    flexGrow: 1,
    height: 90,
    backgroundColor: '#ffffff',
    borderColor: '#c5c6ce',
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  roleButtonActive: {
    borderColor: '#0058bc',
    backgroundColor: '#e5eeff',
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0b1c30',
  },
  roleLabelActive: {
    color: '#0058bc',
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#44474d',
    marginBottom: 8,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 12,
    color: '#0058bc',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#75777e',
    borderWidth: 1.5,
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#0b1c30',
  },
  submitButton: {
    backgroundColor: '#0058bc',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  toggleButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  toggleText: {
    color: '#0058bc',
    fontWeight: '600',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#44474d',
  },
  requestAccess: {
    color: '#0058bc',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
