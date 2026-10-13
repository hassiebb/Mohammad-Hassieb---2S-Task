import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CustomerList } from '@/features/customers/CustomerList';
import { Palette } from '@/constants/colors';

export default function CustomersTab() {
  return (
    <View style={styles.container}>
      <CustomerList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.surfaceBackground,
  },
});
