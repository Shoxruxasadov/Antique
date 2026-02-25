import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';

const GOOD = require('../../assets/scanner/Group 1.png');
const BAD_CLOSE = require('../../assets/scanner/Group 2.png');
const BAD_BLUR = require('../../assets/scanner/Group 3.png');

const CIRCLE_SIZE = 120;
const BAD_CIRCLE_SIZE = 100;
const BADGE_SIZE = 28;

function TipCircle({ source, isGood, label }) {
  return (
    <View style={styles.tipItem}>
      <View style={[styles.circleWrap, { width: BAD_CIRCLE_SIZE, height: BAD_CIRCLE_SIZE, borderRadius: BAD_CIRCLE_SIZE / 2 }]}>
        <Image source={source} style={[styles.circleImage, { width: BAD_CIRCLE_SIZE, height: BAD_CIRCLE_SIZE }]} resizeMode="cover" />
        <View style={[styles.badge, isGood ? styles.badgeGood : styles.badgeBad]}>
          <Ionicons
            name={isGood ? 'checkmark' : 'close'}
            size={16}
            color="#FFFFFF"
          />
        </View>
      </View>
      <Text style={styles.tipLabel}>{label}</Text>
    </View>
  );
}

export default function SnapTipsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <View style={styles.content}>
        <Text style={styles.title}>Snap Tips</Text>

        {/* To‘g‘ri — bitta yuqorida, yashil check */}
        <View style={styles.goodWrap}>
          <View style={[styles.circleWrap, { width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2 }]}>
            <Image source={GOOD} style={[styles.circleImage, { width: CIRCLE_SIZE, height: CIRCLE_SIZE }]} resizeMode="cover" />
            <View style={[styles.badge, styles.badgeGood]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.tipLabel}>Snap the item from the front</Text>
        </View>

        {/* Noto‘g‘ri — 2 ta pastda: Too close, Blurry */}
        <View style={styles.badRow}>
          <TipCircle source={BAD_CLOSE} isGood={false} label="Too close" />
          <TipCircle source={BAD_BLUR} isGood={false} label="Blurry" />
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable
          style={styles.understandBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.understandBtnText}>Understand</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1917',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.textWhite,
    marginBottom: 32,
    textAlign: 'center',
  },
  goodWrap: {
    alignItems: 'center',
    marginBottom: 36,
  },
  circleWrap: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    position: 'relative',
  },
  circleImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeGood: {
    backgroundColor: '#44D84B',
  },
  badgeBad: {
    backgroundColor: '#C8191B',
  },
  tipItem: {
    flex: 1,
    alignItems: 'center',
    maxWidth: '50%',
    marginHorizontal: 8,
  },
  tipLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textWhite,
    marginTop: 12,
    textAlign: 'center',
  },
  badRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    justifyContent: 'space-between',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  understandBtn: {
    backgroundColor: colors.bgWhite,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  understandBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 17,
    color: colors.textBase,
  },
});
