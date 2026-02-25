import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { useAppSettingsStore } from '../stores/useAppSettingsStore';
import { triggerHaptic } from '../lib/haptics';

/**
 * Center tab button: golden circle with camera, navigates to Identify screen.
 */
export default function CenterTabButton(props) {
  const navigation = useNavigation();
  const parent = navigation.getParent();
  const vibration = useAppSettingsStore((s) => s.vibration);

  const onPress = () => {
    triggerHaptic(vibration);
    if (parent) {
      parent.navigate('Identify');
    }
  };

  return (
    <Pressable
      {...props}
      onPress={onPress}
      style={[styles.outer, props.style]}
      accessibilityRole="button"
      accessibilityLabel="Identify"
    >
      <View style={styles.circle}>
        <Ionicons name="camera" size={28} color={colors.textWhite} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -24,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
});
