import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, fonts } from '../../theme';

const GOOD_IMAGE = require('../../assets/scanner/Group1.png');
const BAD_IMAGES = [
  require('../../assets/scanner/Group2.png'),
  require('../../assets/scanner/Group3.png'),
];
const BAD_LABELS = ['Too close', 'Blurry'];

const TOP_SIZE = 156;
const BOTTOM_SIZE = 96;
const BADGE_SIZE = 24;

function TipCircle({ source, label, size, styles }) {
  return (
    <View style={styles.tipItem}>
      <View style={[styles.circleWrap, { width: size, height: size }]}>
        <Image
          source={source}
          style={[styles.circleImage, { width: size, height: size }]}
          resizeMode="cover"
        />
      </View>
      <Text style={styles.tipLabel}>{label}</Text>
    </View>
  );
}

export default function InfoScannerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        scrollView: { flex: 1, paddingHorizontal: 24, paddingTop: 60, justifyContent: 'center', alignItems: 'center' },
        mainTitle: { fontFamily: fonts.bold, fontSize: 28, color: "#ffffff", textAlign: 'center', marginBottom: 28 },
        goodWrap: { alignItems: 'center', marginBottom: 28 },
        circleWrap: { overflow: 'hidden', position: 'relative' },
        circleImage: {},
        badge: { position: 'absolute', top: -2, right: -2, width: BADGE_SIZE, height: BADGE_SIZE, borderRadius: BADGE_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
        badgeGood: { backgroundColor: '#44D84B' },
        badgeBad: { backgroundColor: '#C8191B' },
        tipItem: { alignItems: 'center' },
        tipLabel: { fontFamily: fonts.regular, fontSize: 14, color: "#ffffff", marginTop: 10, textAlign: 'center', marginBottom: 40 },
        badRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 12 },
        badItem: { flex: 1, alignItems: 'center', marginHorizontal: 8 },
        footer: { paddingHorizontal: 24, paddingTop: 16 },
        doneButton: { backgroundColor: "#ffffff", borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
        doneButtonText: { fontFamily: fonts.semiBold, fontSize: 17, color: "#000000" },
      }),
    [colors]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bgDark }]}>
      <StatusBar style="light" />

      <View style={styles.scrollView}>
        <Text style={styles.mainTitle}>Snap Tips</Text>

        <View style={styles.goodWrap}>
          <TipCircle
            source={GOOD_IMAGE}
            label="Snap the item from the front"
            size={TOP_SIZE}
            styles={styles}
          />
        </View>

        <View style={styles.badRow}>
          <View style={styles.badItem}>
            <TipCircle
              source={BAD_IMAGES[0]}
              label={BAD_LABELS[0]}
              size={BOTTOM_SIZE}
              styles={styles}
            />
          </View>
          <View style={styles.badItem}>
            <TipCircle
              source={BAD_IMAGES[1]}
              label={BAD_LABELS[1]}
              size={BOTTOM_SIZE}
              styles={styles}
            />
          </View>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable style={styles.doneButton} onPress={() => navigation.goBack()}>
          <Text style={styles.doneButtonText}>Understand</Text>
        </Pressable>
      </View>
    </View>
  );
}
