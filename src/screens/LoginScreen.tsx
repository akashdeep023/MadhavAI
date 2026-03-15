/**
 * LoginScreen
 * Handles user authentication via OTP
 * Requirements: 1.1, 1.2, 1.3
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { authenticationManager } from '../services/auth/AuthenticationManager';
import { logger } from '../utils/logger';
import { useTranslation } from '../hooks/useTranslation';

interface LoginScreenProps {
  onLoginSuccess: (userId: string, token: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { t } = useTranslation();
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [timer, setTimer] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null); // shown in-app when SMS is inactive

  // Start countdown timer for OTP expiration
  const startTimer = (expirationDate: Date) => {
    const interval = setInterval(() => {
      const now = new Date();
      const remaining = Math.floor((expirationDate.getTime() - now.getTime()) / 1000);

      if (remaining <= 0) {
        clearInterval(interval);
        setTimer(0);
      } else {
        setTimer(remaining);
      }
    }, 1000);
  };

  const handleSendOTP = async () => {
    if (!mobileNumber || mobileNumber.length !== 10) {
      Alert.alert(t('auth.invalidNumber'), t('auth.invalidNumberMessage'));
      return;
    }

    try {
      setLoading(true);
      const response = await authenticationManager.sendOTP(mobileNumber);

      if (response.success) {
        setStep('otp');
        setAttemptsRemaining(response.attemptsRemaining);
        startTimer(response.expiresAt);
        // If SMS is inactive, show OTP in-app instead of "check SMS"
        if (response.smsActive === false && response.devOtp) {
          setDevOtp(response.devOtp);
        } else {
          setDevOtp(null);
          Alert.alert(t('auth.otpSent'), t('auth.checkSMS'));
        }
      } else {
        Alert.alert(t('common.error'), response.message || 'Failed to send OTP');
      }
    } catch (error) {
      logger.error('Failed to send OTP', error);
      Alert.alert(t('common.error'), t('errors.tryAgain'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert(t('auth.invalidOTP'), t('auth.invalidOTPMessage'));
      return;
    }

    try {
      setLoading(true);
      const deviceId = `device_${Date.now()}`;
      const result = await authenticationManager.verifyOTP(mobileNumber, otp, deviceId);

      if (result.success && result.authToken) {
        onLoginSuccess(result.authToken.userId, result.authToken.token);
      } else {
        Alert.alert(t('auth.verificationFailed'), result.message);
        if (result.message.includes('attempts remaining')) {
          const match = result.message.match(/(\d+) attempts remaining/);
          if (match) setAttemptsRemaining(parseInt(match[1], 10));
        }
      }
    } catch (error) {
      logger.error('Failed to verify OTP', error);
      Alert.alert(t('common.error'), t('errors.tryAgain'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setOtp('');
    await handleSendOTP();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (step === 'phone') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.logo}>🌾</Text>
            <Text style={styles.title}>{t('app.name')}</Text>
            <Text style={styles.subtitle}>{t('app.tagline')}</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>{t('auth.enterMobile')}</Text>
            <View style={styles.phoneInputContainer}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="9876543210"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                maxLength={10}
                value={mobileNumber}
                onChangeText={setMobileNumber}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{t('auth.sendOTP')}</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.infoText}>{t('auth.otpMessage')}</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>🌾</Text>
          <Text style={styles.title}>{t('auth.verifyOTP')}</Text>
          <Text style={styles.subtitle}>+91 {mobileNumber}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t('auth.verifyOTP')}</Text>

          {/* In-app OTP banner — shown when SNS SMS is not yet active */}
          {devOtp && (
            <View style={styles.devOtpBanner}>
              <Text style={styles.devOtpTitle}>⚠️ SMS delivery temporarily unavailable</Text>
              <Text style={styles.devOtpNote}>
                SMS service is being set up. OTP is shown here temporarily.
              </Text>
              <Text style={styles.devOtpSubtitle}>Your one-time password:</Text>
              <Text style={styles.devOtpCode}>{devOtp}</Text>
            </View>
          )}

          <TextInput
            style={styles.otpInput}
            placeholder="000000"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
            editable={!loading}
            autoFocus
          />

          {timer > 0 && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>
                ⏱️ {t('auth.codeExpires')} {formatTime(timer)}
              </Text>
            </View>
          )}

          {attemptsRemaining < 3 && (
            <View style={styles.attemptsContainer}>
              <Text style={styles.attemptsText}>
                {attemptsRemaining} {t('auth.attemptsRemaining')}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerifyOTP}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.verifyOTP')}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>{t('auth.didntReceive')}</Text>
            <TouchableOpacity onPress={handleResendOTP} disabled={loading || timer > 240}>
              <Text
                style={[styles.resendLink, (loading || timer > 240) && styles.resendLinkDisabled]}
              >
                {t('auth.resendOTP')}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setStep('phone');
              setOtp('');
              setTimer(0);
              setDevOtp(null);
            }}
          >
            <Text style={styles.backButtonText}>← {t('auth.changeNumber')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#F9F9F9',
  },
  countryCode: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    fontSize: 18,
    color: '#333',
    paddingVertical: 16,
  },
  otpInput: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
    backgroundColor: '#F9F9F9',
    letterSpacing: 8,
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  timerText: {
    fontSize: 14,
    color: '#F57C00',
    fontWeight: '500',
  },
  attemptsContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  attemptsText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '500',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  resendLink: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: '#999',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  devOtpBanner: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFB300',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  devOtpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
  },
  devOtpSubtitle: {
    fontSize: 13,
    color: '#555',
    marginBottom: 6,
  },
  devOtpCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1B5E20',
    letterSpacing: 8,
    marginBottom: 6,
  },
  devOtpNote: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
  },
});
