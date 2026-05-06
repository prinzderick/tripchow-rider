import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth as authApi } from '../api/endpoints';
import { useAuthStore } from '../store/auth';
import { Button } from '../components';
import { Colors, Spacing, Typography, Radius } from '../theme';

export default function LoginScreen() {
  const setAuth = useAuthStore(s => s.setAuth);

  const [step,     setStep]     = useState<'phone' | 'otp' | 'forgot' | 'reset'>('phone');
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [otp,      setOtp]      = useState('');
  const [newPass,  setNewPass]  = useState('');
  const [loading,  setLoading]  = useState(false);

  // Format Nigerian phone number
  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 11) return '+234' + digits.slice(1);
    if (digits.startsWith('234') && digits.length === 13) return '+' + digits;
    return raw;
  };

  const handleLogin = async () => {
    const formatted = formatPhone(phone);
    if (!formatted.startsWith('+234')) {
      Alert.alert('Invalid phone', 'Enter a valid Nigerian phone number (e.g. 0801 234 5678)');
      return;
    }
    if (!password) {
      Alert.alert('Password required', 'Enter your password to continue');
      return;
    }

    setLoading(true);
    try {
      const { data } = await authApi.login(formatted, password);
      const d = data.data;

      // If OTP required (phone not verified)
      if (data.message?.toLowerCase().includes('otp')) {
        setStep('otp');
        return;
      }

      await setAuth(d.user, d.access_token, d.refresh_token);
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Login failed. Check your credentials.';
      Alert.alert('Login failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) {
      Alert.alert('Invalid OTP', 'Enter the 6-digit code sent to your phone');
      return;
    }
    setLoading(true);
    try {
      const formatted = formatPhone(phone);
      const { data }  = await authApi.verifyOtp(formatted, otp, 'registration');
      const d = data.data;
      await setAuth(d.user, d.access_token, d.refresh_token);
    } catch (e: any) {
      Alert.alert('Verification failed', e.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!formatPhone(phone).startsWith('+234')) { Alert.alert('', 'Enter a valid phone number'); return; }
    setLoading(true);
    try {
      await authApi.resendOtp(formatPhone(phone), 'password_reset');
      setStep('reset');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Could not send reset code');
    } finally { setLoading(false); }
  };

  const handleReset = async () => {
    if (otp.length < 4 || newPass.length < 6) { Alert.alert('', 'Enter the reset code and new password (min 6 chars)'); return; }
    setLoading(true);
    try {
      const { data } = await authApi.verifyOtp(formatPhone(phone), otp, 'password_reset');
      const d = data.data;
      if (d?.access_token) await setAuth(d.user, d.access_token, d.refresh_token);
      else setStep('phone');
    } catch (e: any) {
      Alert.alert('Reset failed', e.response?.data?.message || 'Invalid code');
    } finally { setLoading(false); }
  };

  const resendOtp = async () => {
    try {
      await authApi.resendOtp(formatPhone(phone), 'registration');
      Alert.alert('OTP sent', 'A new code has been sent to your phone');
    } catch {
      Alert.alert('Error', 'Could not resend OTP. Try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>🛵</Text>
            </View>
            <Text style={styles.appName}>TripChow Rider</Text>
            <Text style={styles.tagline}>Deliver, earn, repeat</Text>
          </View>

          {step === 'phone' ? (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Sign in to your account</Text>

                <View style={styles.field}>
                  <Text style={styles.label}>Phone number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0801 234 5678"
                    placeholderTextColor={Colors.text3}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    autoFocus
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter password"
                    placeholderTextColor={Colors.text3}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                </View>

                <Button
                  label="Sign in"
                  onPress={handleLogin}
                  loading={loading}
                  fullWidth
                  size="lg"
                  style={{ marginTop: 8 }}
                />
                <TouchableOpacity onPress={() => setStep('forgot')} style={{ alignItems: 'center', marginTop: 8 }}>
                  <Text style={[styles.resendText, { color: Colors.text3 }]}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.hint}>
                New rider? Contact your TripChow manager to create an account.
              </Text>
            </>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Verify your phone</Text>
                <Text style={styles.otpHint}>
                  Enter the 6-digit code sent to {phone}
                </Text>

                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="000000"
                  placeholderTextColor={Colors.text3}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  autoFocus
                />

                <Button
                  label="Verify"
                  onPress={handleVerifyOtp}
                  loading={loading}
                  fullWidth
                  size="lg"
                  style={{ marginTop: 8 }}
                />
              </View>

              <TouchableOpacity onPress={resendOtp} style={styles.resendBtn}>
                <Text style={styles.resendText}>Didn't receive a code? Resend</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep('phone')}>
                <Text style={[styles.resendText, { color: Colors.text3 }]}>← Back to login</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Forgot password */}
          {step === 'forgot' && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Reset password</Text>
                <Text style={styles.otpHint}>Enter your phone number to receive a reset code.</Text>
                <View style={styles.field}>
                  <Text style={styles.label}>Phone number</Text>
                  <TextInput style={styles.input} placeholder="0801 234 5678" placeholderTextColor={Colors.text3}
                    keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
                </View>
                <Button label="Send reset code" onPress={handleForgot} loading={loading} fullWidth size="lg" />
              </View>
              <TouchableOpacity onPress={() => setStep('phone')} style={{ alignItems: 'center' }}>
                <Text style={[styles.resendText, { color: Colors.text3 }]}>← Back</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Reset password */}
          {step === 'reset' && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>New password</Text>
                <View style={styles.field}>
                  <Text style={styles.label}>Reset code</Text>
                  <TextInput style={[styles.input, styles.otpInput]} placeholder="000000"
                    placeholderTextColor={Colors.text3} keyboardType="number-pad" maxLength={6}
                    value={otp} onChangeText={setOtp} autoFocus />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>New password (min 6 chars)</Text>
                  <TextInput style={styles.input} placeholder="New password" placeholderTextColor={Colors.text3}
                    secureTextEntry value={newPass} onChangeText={setNewPass} />
                </View>
                <Button label="Reset password" onPress={handleReset} loading={loading} fullWidth size="lg" />
              </View>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: Colors.bg },
  container:  { flexGrow: 1, padding: Spacing.lg, justifyContent: 'center', gap: Spacing.lg },
  logoWrap:   { alignItems: 'center', paddingVertical: Spacing.xl },
  logo:       { width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.brand, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoText:   { fontSize: 36 },
  appName:    { fontSize: Typography.xxl, fontFamily: 'Manrope-ExtraBold', color: Colors.text },
  tagline:    { fontSize: Typography.sm, color: Colors.text3, fontFamily: 'Manrope-Regular', marginTop: 4 },
  card:       { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md },
  cardTitle:  { fontSize: Typography.lg, fontFamily: 'Manrope-ExtraBold', color: Colors.text, marginBottom: 4 },
  field:      { gap: 6 },
  label:      { fontSize: 11, fontFamily: 'Manrope-Bold', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 0.4 },
  input:      { backgroundColor: Colors.bg, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, padding: 13, fontSize: Typography.base, fontFamily: 'Manrope-Regular', color: Colors.text },
  hint:       { fontSize: Typography.sm, color: Colors.text3, fontFamily: 'Manrope-Regular', textAlign: 'center', lineHeight: 20 },
  otpHint:    { fontSize: Typography.sm, color: Colors.text3, fontFamily: 'Manrope-Regular', marginBottom: 4 },
  otpInput:   { textAlign: 'center', fontSize: Typography.xxl, fontFamily: 'Manrope-Bold', letterSpacing: 8 },
  resendBtn:  { alignItems: 'center' },
  resendText: { fontSize: Typography.sm, fontFamily: 'Manrope-SemiBold', color: Colors.brand },
});
