import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SalesOrderList } from '@/features/sales-orders/SalesOrderList';
import { RoleGuard } from '@/components/RoleGuard';
import { Palette } from '@/constants/colors';

export default function OrdersTab() {
  return (
    <View style={styles.container}>
      <RoleGuard>
        <SalesOrderList />
      </RoleGuard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.surfaceBackground,
  },
});
