import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '@/features/auth/use-auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { LoginForm } from '@/features/auth/LoginForm';

export default function IndexScreen() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(app)/(tabs)/customers');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner message="Initializing Odoo Sales..." />
      </View>
    );
  }

  if (isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner message="Loading workspace..." />
      </View>
    );
  }

  return <LoginForm />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
