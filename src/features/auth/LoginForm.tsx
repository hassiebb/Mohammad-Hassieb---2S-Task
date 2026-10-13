import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ThemeColors } from '@/constants/colors';
import { APP_CONFIG } from '@/constants/config';
import { updateServerConfig } from '@/services';
import { useAuth } from './use-auth';
import { validatePassword, validateUsername } from '@/lib/validation';

export function LoginForm() {
  const { login, error: authError, clearError, isLoading } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [serverUrl, setServerUrl] = useState(APP_CONFIG.odooBaseUrl || 'https://2s-task.odoo.com');
  const [database, setDatabase] = useState(APP_CONFIG.odooDatabase || '2s-task');
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [usernameError, setUsernameError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    if (usernameError) setUsernameError(undefined);
    if (authError) clearError();
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) setPasswordError(undefined);
    if (authError) clearError();
  };

  const handleSubmit = async () => {
    const userValidation = validateUsername(username);
    const passValidation = validatePassword(password);

    if (!userValidation.isValid) {
      setUsernameError(userValidation.error);
    }
    if (!passValidation.isValid) {
      setPasswordError(passValidation.error);
    }

    if (!userValidation.isValid || !passValidation.isValid) {
      return;
    }

    try {
      updateServerConfig({
        baseUrl: serverUrl.trim(),
        database: database.trim(),
      });
      await login({
        username: username.trim(),
        password,
      });
    } catch {
      // Error message is caught and handled in AuthContext, rendered in errorBanner
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* 2S Egypt Executive Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandMonogram}>2S</Text>
          </View>
          <Text style={styles.companyName}>2S Egypt</Text>
          <Text style={styles.appName}>Sales Management</Text>
          <Text style={styles.tagline}>
            Enterprise Sales Operations & Order Management
          </Text>
        </View>

        {/* Clean Enterprise Login Card */}
        <View style={styles.formCard}>
          <Text style={styles.cardHeader}>Sign In</Text>
          <Text style={styles.cardSubheader}>
            Enter your enterprise credentials to access your customer accounts and sales orders.
          </Text>

          {/* Authentication Error Banner */}
          {Boolean(authError) && (
            <View style={styles.errorBanner} accessible={true} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={20} color={ThemeColors.light.danger} />
              <View style={styles.errorContent}>
                <Text style={styles.errorBannerText}>{authError}</Text>
                <Pressable
                  onPress={handleSubmit}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    styles.retryButton,
                    pressed && styles.retryButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Retry authentication">
                  <Ionicons name="refresh" size={13} color="#FFFFFF" />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Username Field */}
          <Input
            label="Username"
            placeholder="Username or email"
            value={username}
            onChangeText={handleUsernameChange}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            leftIcon="person-outline"
            error={usernameError}
            required
            accessibilityLabel="Username input"
          />

          {/* Password Field with Show/Hide Toggle */}
          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={handlePasswordChange}
            isPassword
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            textContentType="password"
            leftIcon="lock-closed-outline"
            error={passwordError}
            required
            accessibilityLabel="Password input"
          />

          {/* Optional Expandable Server Settings (Pre-configured for 2S Egypt Reviewer) */}
          <View style={styles.serverSettingsSection}>
            <Pressable
              onPress={() => setShowServerSettings(!showServerSettings)}
              style={({ pressed }) => [
                styles.serverSettingsHeader,
                pressed && styles.serverSettingsHeaderPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Toggle server settings accordion">
              <View style={styles.serverSettingsHeaderLeft}>
                <Ionicons name="server-outline" size={15} color="#475569" />
                <Text style={styles.serverSettingsTitle}>Server Settings</Text>
                <View style={styles.serverBadge}>
                  <Text style={styles.serverBadgeText}>Pre-configured</Text>
                </View>
              </View>
              <Ionicons
                name={showServerSettings ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#64748B"
              />
            </Pressable>

            {showServerSettings && (
              <View style={styles.serverSettingsBody}>
                <Text style={styles.serverSettingsHint}>
                  Pre-configured to 2S Egypt persistent Odoo Cloud. No manual setup required for evaluation.
                </Text>
                <Input
                  label="Odoo Server URL"
                  placeholder="https://2s-task.odoo.com"
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon="globe-outline"
                  containerStyle={styles.serverSettingInput}
                  accessibilityLabel="Odoo server URL input"
                />
                <Input
                  label="Database Name"
                  placeholder="2s-task"
                  value={database}
                  onChangeText={setDatabase}
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon="file-tray-stacked-outline"
                  containerStyle={styles.serverSettingInput}
                  accessibilityLabel="Database name input"
                />
              </View>
            )}
          </View>

          {/* Primary Sign In Button */}
          <Button
            title="Sign In"
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            loading={isLoading}
            style={styles.submitBtn}
            accessibilityLabel="Sign in button"
            rightIcon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
          />
        </View>

        {/* Corporate Trust Footer */}
        <View style={styles.footerContainer}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#64748B" />
          <Text style={styles.footerText}>
            2S Egypt Business Systems • Authorized Sales Personnel Only
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'center',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandBadge: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: '#0E1926',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FF8622',
    shadowColor: '#0E1926',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  brandMonogram: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FF8622',
    letterSpacing: -0.5,
  },
  companyName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0E1926',
    letterSpacing: -0.5,
  },
  appName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginTop: 2,
  },
  tagline: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0E1926',
    marginBottom: 4,
  },
  cardSubheader: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  errorContent: {
    flex: 1,
    gap: 8,
  },
  errorBannerText: {
    fontSize: 13,
    color: ThemeColors.light.danger,
    lineHeight: 18,
    fontWeight: '500',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 5,
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  serverSettingsSection: {
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  serverSettingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  serverSettingsHeaderPressed: {
    backgroundColor: '#F1F5F9',
  },
  serverSettingsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serverSettingsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  serverBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  serverBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  serverSettingsBody: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
    gap: 10,
  },
  serverSettingsHint: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  serverSettingInput: {
    marginBottom: 0,
  },
  submitBtn: {
    marginTop: 8,
    backgroundColor: '#0E1926',
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    gap: 6,
  },
  footerText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
});
