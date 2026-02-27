import React, { useMemo } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Camera } from 'phosphor-react-native';
import { useColors, fonts } from '../theme';
import { useAppSettingsStore } from '../stores/useAppSettingsStore';
import { triggerHaptic } from '../lib/haptics';

/**
 * Center tab button: golden circle with camera, navigates to Identify screen.
 */
export default function CenterTabButton(props) {
  const colors = useColors();
  const navigation = useNavigation();
  const parent = navigation.getParent();
  const vibration = useAppSettingsStore((s) => s.vibration);

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
      }),
    [colors]
  );

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
<Camera size={28} color={colors.textWhite} weight='fill' />
    </View>
    </Pressable>
  );
}
