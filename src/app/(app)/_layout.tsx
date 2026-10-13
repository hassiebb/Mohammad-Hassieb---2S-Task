import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/features/auth/use-auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StyleSheet, View } from 'react-native';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner message="Checking session..." />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F8FAFC' },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="customer/[id]"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="order/[id]"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
