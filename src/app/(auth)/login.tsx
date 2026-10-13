import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { LoginForm } from '@/features/auth/LoginForm';
import { useAuth } from '@/features/auth/use-auth';

export default function LoginScreen() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(app)/(tabs)/customers');
    }
  }, [isAuthenticated, router]);

  return <LoginForm />;
}
