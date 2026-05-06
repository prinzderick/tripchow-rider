import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthStore } from './src/store/auth';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { Colors } from './src/theme';

import LoginScreen         from './src/screens/LoginScreen';
import HomeScreen          from './src/screens/HomeScreen';
import DeliveriesScreen    from './src/screens/DeliveriesScreen';
import WalletScreen        from './src/screens/WalletScreen';
import MoreScreen          from './src/screens/MoreScreen';
import OnboardingScreen    from './src/screens/OnboardingScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SupportScreen       from './src/screens/SupportScreen';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

type Phase = 'splash' | 'onboarding' | 'ready';

// ── Animated splash ───────────────────────────────────────────────────────────
function AppSplash() {
  const scale = useRef(new Animated.Value(0.75)).current;
  const opac  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 55, friction: 7 }),
      Animated.timing(opac,  { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={sp.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand} />
      <Animated.View style={[sp.content, { transform: [{ scale }], opacity: opac }]}>
        <View style={sp.logoWrap}><Text style={sp.logo}>🛵</Text></View>
        <Text style={sp.name}>TripChow Rider</Text>
        <Text style={sp.tag}>Deliver, earn, repeat</Text>
      </Animated.View>
      <Text style={sp.city}>📍 Yenagoa, Bayelsa</Text>
    </View>
  );
}

const sp = StyleSheet.create({
  root:     { flex: 1, backgroundColor: Colors.brand, alignItems: 'center', justifyContent: 'center' },
  content:  { alignItems: 'center' },
  logoWrap: { width: 120, height: 120, borderRadius: 36, backgroundColor: 'rgba(255,255,255,.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  logo:     { fontSize: 62 },
  name:     { fontSize: 32, fontFamily: 'Manrope-ExtraBold', color: '#fff', letterSpacing: -0.5 },
  tag:      { fontSize: 15, fontFamily: 'Manrope-Regular', color: 'rgba(255,255,255,.75)', marginTop: 6 },
  city:     { position: 'absolute', bottom: 48, fontSize: 14, fontFamily: 'Manrope-SemiBold', color: 'rgba(255,255,255,.65)' },
});

// ── Tab navigator ─────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

function MainTabs({ onShowNotifications, onShowSupport }: { onShowNotifications: () => void; onShowSupport: () => void }) {
  usePushNotifications();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border, borderTopWidth: 1, paddingTop: 6, height: 64 },
        tabBarLabelStyle: { fontSize: 10, fontFamily: 'Manrope-Bold', marginTop: 2 },
        tabBarActiveTintColor:   Colors.brand,
        tabBarInactiveTintColor: Colors.text3,
      }}>
      <Tab.Screen name="Home"       component={HomeScreen}       options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tab.Screen name="Deliveries" component={DeliveriesScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🛵" focused={focused} /> }} />
      <Tab.Screen name="Wallet"     component={WalletScreen}     options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💚" focused={focused} /> }} />
      <Tab.Screen name="More" options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="☰" focused={focused} /> }}>
        {() => <MoreScreen onShowNotifications={onShowNotifications} onShowSupport={onShowSupport} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// ── Auth gate ─────────────────────────────────────────────────────────────────
type InnerScreen = null | 'notifications' | 'support';

function AppWithScreens() {
  const [screen, setScreen] = React.useState<InnerScreen>(null);

  if (screen === 'notifications') return <NotificationsScreen onBack={() => setScreen(null)} />;
  if (screen === 'support')       return <SupportScreen       onBack={() => setScreen(null)} />;

  return <MainTabs onShowNotifications={() => setScreen('notifications')} onShowSupport={() => setScreen('support')} />;
}

function AuthGate() {
  const { token, hydrated } = useAuthStore();
  if (!hydrated) return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={Colors.brand} />
    </View>
  );
  return token ? <AppWithScreens /> : <LoginScreen />;
}

// ── Root phase manager ────────────────────────────────────────────────────────
function Root() {
  const [phase, setPhase] = useState<Phase>('splash');
  const hydrate = useAuthStore(s => s.hydrate);

  useEffect(() => {
    (async () => {
      await hydrate();
      await new Promise(r => setTimeout(r, 1600));
      const done = await AsyncStorage.getItem('rider_onboarding_done');
      setPhase(done ? 'ready' : 'onboarding');
    })();
  }, []);

  if (phase === 'splash')     return <AppSplash />;
  if (phase === 'onboarding') return <OnboardingScreen onDone={() => setPhase('ready')} />;

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AuthGate />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Root />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
