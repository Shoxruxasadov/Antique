import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { CaretLeft, X, PaperPlaneRightIcon, ImageIcon } from "phosphor-react-native";
import * as ImagePicker from "expo-image-picker";
import { useColors, fonts } from "../../theme";
import { useAssistantStore } from "../../stores/useAssistantStore";
import { chatWithGemini } from "../../lib/gemini";
import { checkIsPro } from "../../lib/revenueCat";

const SUGGESTIONS = [
  "Affectable factors to antique item",
  "Determine age of an antique",
  "How to identify antique hallmarks",
];

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch (_) {
    return "";
  }
}

function stripMarkdown(text) {
  if (typeof text !== "string") return text;
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^\s*\*\s+/gm, "• ");
}

export default function AssistantScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const messages = useAssistantStore((s) => s.messages);
  const addMessage = useAssistantStore((s) => s.addMessage);
  const listRef = useRef(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [imageCaption, setImageCaption] = useState("");
  const [isPro, setIsPro] = useState(false);

  useFocusEffect(
    useCallback(() => {
      checkIsPro().then(setIsPro);
    }, []),
  );

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const hasUserSentAny = userMessageCount > 0;
  const showSuggestions = !hasUserSentAny;
  const prevMessageCountRef = useRef(0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.bgWhite },
        header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.bgWhite, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border3 },
        backBtn: { padding: 4 },
        headerTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.textBase },
        headerRight: { width: 32 },
        keyboardView: { flex: 1 },
        chatArea: { flex: 1, paddingHorizontal: 16, backgroundColor: colors.bgBase },
        list: { flex: 1 },
        messageRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 16 },
        loadingRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
        avatar: { width: 40, height: 40, borderRadius: 20, overflow: "hidden", marginRight: 12 },
        avatarImage: { width: 40, height: 40 },
        bubbleWrapLeft: { flex: 1, alignItems: "flex-start" },
        bubbleLeft: { backgroundColor: colors.bgWhite, borderRadius: 16, borderBottomLeftRadius: 4, paddingVertical: 10, paddingHorizontal: 14, maxWidth: "85%" },
        bubbleText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textBase, lineHeight: 22 },
        timeInBubble: { fontFamily: fonts.regular, fontSize: 11, color: colors.textTertiary, marginTop: 4, alignSelf: "flex-end" },
        messageRowUser: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 16 },
        bubbleWrapRight: { maxWidth: "85%", alignItems: "flex-end" },
        bubbleRight: { backgroundColor: colors.brand, borderRadius: 16, borderBottomRightRadius: 4, paddingVertical: 10, paddingHorizontal: 10, paddingLeft: 14 },
        bubbleRightImage: { backgroundColor: colors.brand, borderRadius: 16, borderBottomRightRadius: 4, overflow: "hidden", maxWidth: 280 },
        msgImage: { width: 280, aspectRatio: 1, backgroundColor: colors.bgWhite, borderWidth: 8, borderRadius: 16, borderColor: colors.brand },
        bubbleTextUser: { minWidth: 160, fontFamily: fonts.regular, fontSize: 15, color: colors.textWhite, lineHeight: 22, paddingRight: 4 },
        timeInBubbleRight: { fontFamily: fonts.regular, fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 4, marginRight: 4, alignSelf: "flex-end" },
        suggestionsWrap: { paddingBottom: 12 },
        quickReply: { alignSelf: "flex-start", backgroundColor: colors.brand, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 20, marginBottom: 10 },
        quickReplyText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textWhite },
        inputBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingTop: 12, backgroundColor: colors.bgWhite, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border3 },
        inputBarIcon: { width: 44, height: 44, justifyContent: "center", alignItems: "center", backgroundColor: colors.border1, borderRadius: 22, padding: 8, marginRight: 8 },
        inputBarInputWrap: { flex: 1, height: 44, borderRadius: 22, backgroundColor: colors.border1, display: "flex", flexDirection: "row" },
        input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.textBase, backgroundColor: colors.border1, borderRadius: 22, paddingVertical: 12, paddingLeft: 16 },
        sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
        sendBtnDisabled: { opacity: 0.5 },
        pendingImageBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingTop: 12, backgroundColor: colors.bgWhite, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border3 },
        pendingPreview: { width: 44, height: 44, borderRadius: 8, marginRight: 8, overflow: "hidden" },
        pendingThumb: { width: 44, height: 44, backgroundColor: colors.bgBase },
        removeImage: { position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center" },
        captionInput: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.textBase, backgroundColor: colors.bgBase, borderRadius: 22, paddingVertical: 12, paddingLeft: 16 },
      }),
    [colors]
  );

  useEffect(() => {
    const count = messages.length;
    const prev = prevMessageCountRef.current;
    prevMessageCountRef.current = count;
    if (count > prev || pendingImage) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length, pendingImage]);

  const sendText = useCallback(
    async (text) => {
      const trimmed = (text || "").trim();
      const caption = (imageCaption || "").trim();
      if (!trimmed && !pendingImage) return;
      if (!isPro && userMessageCount >= 1) {
        navigation.navigate("Pro", { fromAssistant: true });
        return;
      }
      setInput("");
      const userText = trimmed || caption;
      const userMsg = {
        role: "user",
        text: userText,
        imageUri: pendingImage?.uri ?? null,
        timestamp: new Date().toISOString(),
      };
      addMessage(userMsg);
      const base64ToSend = pendingImage?.base64 ?? null;
      const mimeToSend = pendingImage?.mimeType ?? null;
      setPendingImage(null);
      setImageCaption("");
      setLoading(true);
      try {
        const history = messages
          .filter((m) => {
            if (m.role !== "user" && m.role !== "assistant") return false;
            if (
              m.role === "assistant" &&
              (m.text || "").trim() ===
                "Sorry, something went wrong. Please try again."
            )
              return false;
            return true;
          })
          .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            text: m.text || "",
          }));
        const reply = await chatWithGemini(history, {
          text: userText ? userText : undefined,
          imageBase64: base64ToSend || undefined,
          mimeType: mimeToSend || undefined,
        });
        addMessage({
          role: "assistant",
          text: reply,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        const errMessage = e?.message || "Unknown error";
        if (__DEV__) console.warn("Assistant error", errMessage, e);
        const isNetworkError = /network request failed|failed to fetch|network error|timeout|econnreset|enotfound/i.test(errMessage);
        const displayMessage = isNetworkError ? "Internet aloqani tekshiring va qayta urinib ko'ring." : __DEV__ ? `Error: ${errMessage}` : "Sorry, something went wrong. Please try again.";
        addMessage({
          role: "assistant",
          text: displayMessage,
          timestamp: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    },
    [messages, addMessage, pendingImage, imageCaption, isPro, userMessageCount, navigation],
  );

  const onSend = () => {
    if (pendingImage) {
      sendText(imageCaption.trim());
      return;
    }
    sendText(input);
  };

  const onSuggestionPress = (text) => {
    setInput(text);
    sendText(text);
  };

  const openGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow access to photos to send images.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setPendingImage({
        uri: asset.uri,
        base64: asset.base64 ?? "",
        mimeType: asset.uri?.toLowerCase?.().endsWith(".png") ? "image/png" : "image/jpeg",
      });
      setImageCaption("");
    } catch (e) {
      Alert.alert("Error", "Could not pick image.");
    }
  };

  const renderItem = ({ item }) => {
    if (item.role === "assistant" || item.id === "welcome") {
      return (
        <View style={styles.messageRow}>
          <View style={styles.avatar}>
            <Image
              source={require("../../assets/Bot.png")}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </View>
          <View style={styles.bubbleWrapLeft}>
            <View style={styles.bubbleLeft}>
              <Text style={styles.bubbleText}>{stripMarkdown(item.text)}</Text>
              <Text style={styles.timeInBubble}>
                {formatTime(item.timestamp)}
              </Text>
            </View>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.messageRowUser}>
        <View style={styles.bubbleWrapRight}>
          {item.imageUri ? (
            <View style={styles.bubbleRightImage}>
              <Image
                source={{ uri: item.imageUri }}
                style={styles.msgImage}
                resizeMode="contain"
              />
              {item.text ? (
                <Text style={[styles.bubbleTextUser, {paddingHorizontal: 14, paddingVertical: 0}]}>{item.text}</Text>
              ) : null}
              <Text style={[styles.timeInBubbleRight, {paddingHorizontal: 10, paddingBottom: 10}]}>
                {formatTime(item.timestamp)}
              </Text>
            </View>
          ) : (
            <View style={styles.bubbleRight}>
              <Text style={styles.bubbleTextUser}>{item.text}</Text>
              <Text style={styles.timeInBubbleRight}>
                {formatTime(item.timestamp)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const listFooter = (
    <>
      {showSuggestions && (
        <View style={styles.suggestionsWrap}>
          {SUGGESTIONS.map((text, i) => (
            <Pressable
              key={i}
              style={styles.quickReply}
              onPress={() => onSuggestionPress(text)}
            >
              <Text style={styles.quickReplyText} numberOfLines={2}>
                {text}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {loading && (
        <View style={styles.loadingRow}>
          <View style={styles.avatar}>
            <Image
              source={require("../../assets/Bot.png")}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </View>
          <View style={styles.bubbleLeft}>
            <ActivityIndicator size="small" color={colors.brand} />
          </View>
        </View>
      )}
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <CaretLeft size={24} color={colors.textBase} weight="bold" />
        </Pressable>
        <Text style={styles.headerTitle}>Ask Expert</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.chatArea}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            ListFooterComponent={listFooter}
            style={styles.list}
            contentContainerStyle={[
              { paddingVertical: 16},
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
            onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        </View>

        {pendingImage ? (
          <View
            style={[
              styles.pendingImageBar,
              { paddingBottom: insets.bottom + 12 },
            ]}
          >
            <View style={styles.pendingPreview}>
              <Image
                source={{ uri: pendingImage.uri }}
                style={styles.pendingThumb}
                resizeMode="cover"
              />
              <Pressable
                style={styles.removeImage}
                onPress={() => setPendingImage(null)}
              >
                <X size={16} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.inputBarInputWrap}>
              <TextInput
                style={styles.captionInput}
                placeholder="Add a caption (optional)"
                placeholderTextColor={colors.textTertiary}
                value={imageCaption}
                onChangeText={setImageCaption}
                numberOfLines={1}
                maxLength={300}
              />
              <Pressable style={styles.sendBtn} onPress={onSend}>
                <PaperPlaneRightIcon size={20} color={colors.textBase} weight="fill" />
              </Pressable>
            </View>
          </View>
        ) : (
          <View
            style={[styles.inputBar, { paddingBottom: insets.bottom + 12 }]}
          >
            <Pressable style={styles.inputBarIcon} onPress={openGallery}>
              <ImageIcon
                size={24}
                color={colors.textSecondary}
                weight="fill"
              />
            </Pressable>
            <View style={styles.inputBarInputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Ask anything"
                placeholderTextColor={colors.textTertiary}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={onSend}
                numberOfLines={1}
                maxLength={500}
              />
              <Pressable
                style={[
                  styles.sendBtn,
                  !input.trim() && !loading && styles.sendBtnDisabled,
                ]}
                onPress={onSend}
                disabled={!input.trim() && !loading}
              >
                <PaperPlaneRightIcon size={20} color={colors.textBase} weight="fill" />
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}
