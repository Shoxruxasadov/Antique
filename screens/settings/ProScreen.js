import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';

const FEATURES = [
  'Unlimited Antique Scans every day',
  'Detailed Valuation Reports and insights',
  'Provenance & History Breakdown',
];

export default function ProScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState('annual'); // 'monthly' | 'annual'

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="dark" />

      <Pressable
        style={[styles.closeBtn, { top: insets.top + 12 }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="close" size={28} color={colors.textBase} />
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Crown icon */}
        <View style={styles.crownIconWrap}>
          <Ionicons name="diamond" size={40} color={colors.textBase} />
        </View>

        <Text style={styles.headline}>Elevate Your Collection</Text>
        <Text style={styles.description}>
          Join thousands of collectors who trust our AI-powered authentication and valuation
        </Text>

        {/* Features */}
        {FEATURES.map((item, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={22} color={colors.green} />
            <Text style={styles.featureText}>{item}</Text>
          </View>
        ))}

        {/* Monthly plan */}
        <Pressable
          style={[styles.planCard, plan !== 'annual' && styles.planCardSelected]}
          onPress={() => setPlan('monthly')}
        >
          <View style={styles.planLeft}>
            <View style={[styles.radio, plan === 'monthly' && styles.radioSelected]}>
              {plan === 'monthly' && <Ionicons name="checkmark" size={14} color={colors.brand} />}
            </View>
            <View>
              <Text style={styles.planTitle}>Monthly</Text>
              <Text style={styles.planSub}>First 3 days free then paid</Text>
            </View>
          </View>
          <Text style={styles.planPrice}>$3.99</Text>
        </Pressable>

        {/* Annual plan */}
        <Pressable
          style={[styles.planCard, styles.planCardAnnual, plan === 'annual' && styles.planCardSelected]}
          onPress={() => setPlan('annual')}
        >
          <View style={styles.planLeft}>
            <View style={[styles.radio, styles.radioAnnual, plan === 'annual' && styles.radioSelected]}>
              {plan === 'annual' && <Ionicons name="checkmark" size={14} color={colors.brand} />}
            </View>
            <View>
              <Text style={styles.planTitle}>Annual</Text>
              <Text style={styles.planSub}>
                <Text style={styles.planSubStrike}>$49.99</Text> $39.99 / year
              </Text>
            </View>
          </View>
          <Text style={styles.planPrice}>$32.99</Text>
        </Pressable>

        <View style={styles.trialRow}>
          <Ionicons name="checkmark-circle" size={20} color={colors.green} />
          <Text style={styles.trialText}>No payments due now</Text>
        </View>

        <Pressable style={styles.ctaBtn}>
          <Text style={styles.ctaBtnText}>Start my 7-day trial</Text>
        </Pressable>

        <View style={styles.footer}>
          <Pressable onPress={() => {}}>
            <Text style={styles.footerLink}>Terms of Use</Text>
          </Pressable>
          <Pressable onPress={() => {}}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Pressable>
          <Pressable onPress={() => {}}>
            <Text style={styles.footerLink}>Restore</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgWhite,
  },
  closeBtn: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 24,
  },
  crownIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: colors.brandLight,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  headline: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.textBase,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  featureText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textBase,
    flex: 1,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgWhite,
    borderWidth: 1,
    borderColor: colors.border3,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  planCardAnnual: {
    borderColor: colors.border3,
  },
  planCardSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandLight,
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioAnnual: {
    borderColor: colors.border3,
  },
  radioSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.bgWhite,
  },
  planTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.textBase,
  },
  planSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planSubStrike: {
    textDecorationLine: 'line-through',
  },
  planPrice: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.textBase,
  },
  trialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 24,
  },
  trialText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textBase,
  },
  ctaBtn: {
    backgroundColor: colors.bgInverted,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 32,
  },
  ctaBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.textWhite,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  footerLink: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textBase,
  },
});
