import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';

const QUICK_REPLIES = [
  'Affectable factors to antique item',
  'Determine age of an antique',
  'How to identify antique hallmarks',
];

export default function AssistantScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textBase} />
        </Pressable>
        <Text style={styles.headerTitle}>Assistant</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Assistant message */}
          <View style={styles.messageRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>AI</Text>
            </View>
            <View style={styles.bubbleWrap}>
              <View style={styles.bubble}>
                <Text style={styles.bubbleText}>
                  Hello! How can I help you about antique items?
                </Text>
              </View>
              <Text style={styles.time}>08:34 PM</Text>
            </View>
          </View>

          {/* Quick replies */}
          {QUICK_REPLIES.map((text, i) => (
            <Pressable
              key={i}
              style={styles.quickReply}
              onPress={() => setInput(text)}
            >
              <Text style={styles.quickReplyText} numberOfLines={2}>
                {text}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable style={styles.inputBarIcon}>
            <Ionicons name="camera-outline" size={24} color={colors.textSecondary} />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Ask anything"
            placeholderTextColor={colors.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <Pressable style={styles.sendBtn}>
            <Ionicons name="send" size={22} color={colors.textWhite} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border3,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.textBase,
  },
  headerRight: {
    width: 32,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.brand,
  },
  bubbleWrap: {
    flex: 1,
    alignItems: 'flex-start',
  },
  bubble: {
    backgroundColor: colors.border3,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: '85%',
  },
  bubbleText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textBase,
    lineHeight: 22,
  },
  time: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 4,
    marginLeft: 4,
  },
  quickReply: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandLight,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginBottom: 10,
  },
  quickReplyText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textBase,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: colors.bgWhite,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border3,
  },
  inputBarIcon: {
    padding: 8,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textBase,
    backgroundColor: colors.bgBase,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 18,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
