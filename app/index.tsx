import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCurrentUser, isRoleProfileSetup } from '@/services/appData';
import { getHomeRouteForRole, getProfileSetupRouteForRole } from '@/services/roleRoutes';

export default function SplashScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 700;
  const logoSize = Math.min(width * 0.34, isTablet ? 180 : 140);

  const scale = useSharedValue(1);

  // Logo animation
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.04, {
          duration: 1250,
        }),
        withTiming(1, {
          duration: 1250,
        }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(scale);
    };
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: scale.value,
      },
    ],
  }));

  // Check login/session
  useEffect(() => {
    let mounted = true;

    const checkLogin = async () => {
      try {
        // Check if the user already has a valid session
        const user = await getCurrentUser();

        // Keep splash visible briefly so it doesn't flash
        // too quickly on fast devices.
        await new Promise(resolve => setTimeout(resolve, 1200));

        if (!mounted) return;

        if (user) {
          // Already logged in
          const setup = await isUserProfileSetup(user);
          router.replace(setup ? getHomeRouteForRole(user.role) : getProfileSetupRouteForRole(user.role));
        } else {
          // Not logged in
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.log('Login check failed:', error);

        if (!mounted) return;

        // If checking the session fails,
        // send the user to login.
        router.replace('/(auth)/login');
      }
    };

    checkLogin();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Background decorations */}
      <View style={styles.blurTop} />
      <View style={styles.blurBottom} />

      <View style={[styles.content, isTablet && styles.contentTablet]}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoCard,
            { width: logoSize, height: logoSize },
            logoAnimatedStyle,
          ]}
        >
          <Image
            style={styles.logo}
            source={{
              uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWhdQbWMIgXuVN0Wz24idyaLGlI5JR7xAWs6AQNxZzb5iZpEo2EDiL1iSeHwoDNe6d6JQOa5m1PrhP0onJsJc-PbzZqTJXU98qlCNK4yJu74XW9VvJZ0vGWoHKqhabwNozmzMQL00SFLJ7dGbo87-ucW14fm7T4nn3EMJ2d_r1LjlJa4aWgvygXj_HJLk6PeTcQ1QYao48VWm1icBgT6QuCR-SIhRz1Rs1km66V-cze0IeBWxJxZo',
            }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* App name */}
        <Text style={styles.title}>
          LifeLine
        </Text>

        {/* Tagline */}
        <Text style={styles.tagline}>
          Every Second Counts
        </Text>

        {/* Loading */}
        <View style={styles.loaderContainer}>
          <ActivityIndicator
            size="small"
            color="#0058bc"
            style={styles.spinner}
          />

          <Text style={styles.loadingText}>
            Initializing Secure Connection
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 480,
  },

  contentTablet: {
    paddingHorizontal: 48,
  },

  logoCard: {
    borderRadius: 16,

    backgroundColor: '#ffffff',

    borderColor: '#c5c6ce',
    borderWidth: 1,

    padding: 16,

    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#1a2b48',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,

    elevation: 2,

    marginBottom: 32,
  },

  logo: {
    width: '100%',
    height: '100%',
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#031632',
    letterSpacing: -0.5,
    marginBottom: 8,
  },

  tagline: {
    fontSize: 18,
    color: '#44474d',
    fontWeight: '500',
    marginBottom: 48,
  },

  loaderContainer: {
    alignItems: 'center',
    marginTop: 16,
  },

  spinner: {
    marginBottom: 12,
  },

  loadingText: {
    fontSize: 12,
    color: '#75777e',
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  blurTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: '#e5eeff',
    opacity: 0.35,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
  },

  blurBottom: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#d7e2ff',
    opacity: 0.4,
  },
});
