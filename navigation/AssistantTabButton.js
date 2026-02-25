import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { useAppSettingsStore } from '../stores/useAppSettingsStore';
import { triggerHaptic } from '../lib/haptics';

const TAB_ICON_SIZE = 24;

/**
 * Assistant tab: bosilganda chat ekraniga o‘ngdan ochiladi (stack), tab bar ko‘rinmaydi.
 */
export default function AssistantTabButton(props) {
  const navigation = useNavigation();
  const parent = navigation.getParent();
  const vibration = useAppSettingsStore((s) => s.vibration);
  const focused = props.focused;
  const color = focused ? colors.brand : colors.textSecondary;

  const onPress = () => {
    triggerHaptic(vibration);
    if (parent) {
      parent.navigate('AssistantChat');
    }
  };

  return (
    <Pressable
      {...props}
      onPress={onPress}
      style={[styles.tab, props.style]}
      accessibilityRole="button"
      accessibilityLabel="Assistant"
    >
      <Ionicons name="sparkles" size={TAB_ICON_SIZE} color={color} />
      <Text style={[styles.label, { color }]}>Assistant</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 4,
  },
});
