import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import AuthProvider, { useAuth } from "./context/auth";
import { ThemeProvider } from './context/ThemeContext'; // Add this import

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '/(tabs)',
};

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, isLoading, initialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;
    
    const inAuthGroup = segments[0] === '(tabs)';
    const inLoginScreen = segments[0] === 'login';

    if (user && !inAuthGroup) {
      router.replace('/(tabs)/home');
    } else if (!user && inAuthGroup) {
      router.replace('/login');
    }
  }, [user, segments, initialized]);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [loaded]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  );
}