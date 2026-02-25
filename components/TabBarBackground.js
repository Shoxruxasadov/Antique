import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useWindowDimensions, View, StyleSheet } from 'react-native';

/**
 * Bottom tab bar shape with central hump (from Figma).
 * viewBox="0 0 402 117" - white path with bump in the middle.
 */
export default function TabBarBackground() {
  const { width } = useWindowDimensions();
  const aspectRatio = 117 / 402;
  const height = width * aspectRatio;

  return (
    <View style={[styles.shadow, { width, height }]}>
      <Svg width={width} height={height} viewBox="0 0 402 117" fill="none">
        <Path
          d="M201 0C211.428 0 220.819 4.43363 227.394 11.5186C230.793 15.1819 235.26 18 240.258 18H402V117H0V18H161.742C166.74 18 171.207 15.1819 174.606 11.5186C181.181 4.43363 190.572 0 201 0Z"
          fill="white"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
});
