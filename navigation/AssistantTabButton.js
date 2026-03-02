import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Sparkle } from 'phosphor-react-native';
import { useColors, fonts } from '../theme';
import { useAppSettingsStore } from '../stores/useAppSettingsStore';
import { triggerHaptic } from '../lib/haptics';
import { t } from '../lib/i18n';

const TAB_ICON_SIZE = 24;

/**
 * Assistant tab: bosilganda chat ekraniga o‘ngdan ochiladi (stack), tab bar ko‘rinmaydi.
 */
export default function AssistantTabButton(props) {
  const colors = useColors();
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
      accessibilityLabel={t('tabs.askExpert')}
    >
      <Sparkle size={TAB_ICON_SIZE} color={color} weight='fill' />
      <Text style={[styles.label, { color }]} numberOfLines={1} ellipsizeMode="tail">{t('tabs.askExpert')}</Text>
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
    fontFamily: fonts.semiBold,
    marginTop: 4,
    maxWidth: '100%',
  },
});
