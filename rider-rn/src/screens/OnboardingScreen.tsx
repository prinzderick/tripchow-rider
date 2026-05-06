import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, FlatList,
  TouchableOpacity, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Radius } from '../theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: '1', emoji: '🛵',
    title: 'Earn on your\nown schedule',
    sub: 'Work whenever you want around Yenagoa. No shifts, no bosses — just deliveries.',
    bg: '#FFF7ED', accent: Colors.brand,
  },
  {
    key: '2', emoji: '📦',
    title: 'One-tap\njob board',
    sub: 'New delivery jobs pop up in real time. Accept the ones you want, skip the rest.',
    bg: '#F0FDF4', accent: '#1D9E75',
  },
  {
    key: '3', emoji: '💚',
    title: 'Transparent\nearnings',
    sub: 'See exactly what each delivery pays before you accept. Request payouts anytime.',
    bg: '#EFF6FF', accent: '#2563EB',
  },
  {
    key: '4', emoji: '⭐',
    title: "Let's get\nyou riding",
    sub: 'Sign in to start accepting jobs and building your delivery reputation on TripChow.',
    bg: '#F5F3FF', accent: '#7C3AED',
  },
];

interface Props { onDone: () => void; }

export default function OnboardingScreen({ onDone }: Props) {
  const [index, setIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const fade    = useRef(new Animated.Value(1)).current;

  const goTo = (next: number) => {
    Animated.sequence([
      Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    flatRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  };

  const finish = async () => {
    await AsyncStorage.setItem('rider_onboarding_done', '1');
    onDone();
  };

  const isLast = index === SLIDES.length - 1;
  const slide  = SLIDES[index];

  return (
    <View style={[s.root, { backgroundColor: slide.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {!isLast && (
          <TouchableOpacity style={s.skip} onPress={finish}>
            <Text style={[s.skipTxt, { color: slide.accent }]}>Skip</Text>
          </TouchableOpacity>
        )}

        <FlatList
          ref={flatRef}
          data={SLIDES}
          keyExtractor={i => i.key}
          horizontal pagingEnabled scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item: sl }) => (
            <Animated.View style={[s.slide, { opacity: sl.key === slide.key ? fade : 1 }]}>
              <View style={[s.emojiWrap, { backgroundColor: sl.accent + '18' }]}>
                <Text style={s.emoji}>{sl.emoji}</Text>
              </View>
              <Text style={[s.title, { color: sl.accent }]}>{sl.title}</Text>
              <Text style={s.sub}>{sl.sub}</Text>
            </Animated.View>
          )}
        />

        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[s.dot, i === index && [s.dotActive, { backgroundColor: slide.accent }]]} />
          ))}
        </View>

        <TouchableOpacity
          style={[s.btn, { backgroundColor: slide.accent }]}
          onPress={isLast ? finish : () => goTo(index + 1)}
          activeOpacity={0.85}>
          <Text style={s.btnTxt}>{isLast ? 'Start riding  →' : 'Next  →'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1 },
  skip:      { alignSelf: 'flex-end', padding: 20 },
  skipTxt:   { fontSize: Typography.sm, fontFamily: 'Manrope-SemiBold' },
  slide:     { width, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center', flex: 1 },
  emojiWrap: { width: 150, height: 150, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 44 },
  emoji:     { fontSize: 80 },
  title:     { fontSize: 30, fontFamily: 'Manrope-ExtraBold', textAlign: 'center', lineHeight: 38, marginBottom: 18 },
  sub:       { fontSize: 15, fontFamily: 'Manrope-Regular', color: '#374151', textAlign: 'center', lineHeight: 24 },
  dots:      { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB' },
  dotActive: { width: 26 },
  btn:       { marginHorizontal: 24, marginBottom: 20, borderRadius: Radius.lg, height: 58, alignItems: 'center', justifyContent: 'center' },
  btnTxt:    { color: '#fff', fontSize: 17, fontFamily: 'Manrope-ExtraBold' },
});
