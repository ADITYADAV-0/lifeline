import { getCurrentUser, signOut, type UserRole } from '@/services/appData';
import { getProfileSetupRouteForRole } from '@/services/roleRoutes';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export type ProfileMenuRole = UserRole | 'BloodBank';

export function ProfileMenuButton({ role }: { role: ProfileMenuRole }) {
  const router = useRouter();
  const [userName, setUserName] = useState('User');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      if (!mounted || !currentUser) return;

      setUserName(currentUser.name?.trim() || 'User');
      setAvatarUri(currentUser.avatarUri ?? null);
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  const handleEditProfile = () => {
    setMenuVisible(false);
    router.push(getProfileSetupRouteForRole(role) as any);
  };

  const handleLogout = () => {
    setMenuVisible(false);
    Alert.alert('Log out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.avatarButton}
        onPress={() => setMenuVisible((value) => !value)}
        activeOpacity={0.85}
      >
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Ionicons name="person" color="#ffffff" size={18} />
          </View>
        )}
      </TouchableOpacity>

      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={styles.menuCard} onPress={() => undefined}>
            <View style={styles.menuHeader}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.menuAvatar} />
              ) : (
                <View style={styles.menuAvatarFallback}>
                  <Ionicons name="person" color="#ffffff" size={18} />
                </View>
              )}
              <View style={styles.menuMeta}>
                <Text style={styles.name}>{userName}</Text>
                <Text style={styles.role}>{role === 'BloodBank' ? 'BloodBank' : role}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile} activeOpacity={0.9}>
              <Ionicons name="person-circle-outline" size={18} color="#0d1b2a" />
              <Text style={styles.menuItemText}>Edit profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout} activeOpacity={0.9}>
              <Ionicons name="log-out-outline" size={18} color="#ba1a1a" />
              <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#dfe8ff',
    shadowColor: '#031632',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0058bc',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: 18,
    backgroundColor: 'rgba(3, 22, 50, 0.06)',
  },
  menuCard: {
    width: 210,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#dfe3ed',
    shadowColor: '#031632',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 6,
  },
  menuAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  menuAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0058bc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuMeta: {
    flex: 1,
  },
  name: {
    color: '#031632',
    fontSize: 14,
    fontWeight: '700',
  },
  role: {
    color: '#5a6b7a',
    fontSize: 11,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 10,
  },
  menuItemText: {
    color: '#0d1b2a',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutText: {
    color: '#ba1a1a',
  },
});
