import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Image,
  ImageBackground,
  useWindowDimensions,
  Modal,
  Text,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  Camera,
  X,
  Lightning,
  CameraRotate,
  Images,
  Info,
  Warning,
  Check,
} from "phosphor-react-native";
import { BlurView } from "expo-blur";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { useColors, fonts } from "../../theme";
import { useAuthStore } from "../../stores/useAuthStore";
import { useAppSettingsStore } from "../../stores/useAppSettingsStore";
import { triggerHaptic } from "../../lib/haptics";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { analyzeAntiqueImage } from "../../lib/gemini";
import { fetchMarketPricesFromEbay } from "../../lib/ebay";
import { uploadSnapImage } from "../../lib/snapStorage";

const CAMERA_BORDER_RADIUS = 24;
const SCAN_CORNER_SIZE = 40;
const SCAN_BORDER_WIDTH = 4;

const CHECKLIST_STEPS = [
  "Analyzing image",
  "Fetching market value",
  "Saving result",
];

function isLocalFileUri(uri) {
  return (
    typeof uri === "string" &&
    (uri.startsWith("file://") || uri.startsWith("content://"))
  );
}

function mimeFromUri(uri) {
  if (!uri) return "image/jpeg";
  const lower = uri.toLowerCase();
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

/** Snap uchun max o‘lcham (4K va undan kattalarini qisqartiradi) */
const MAX_SNAP_WIDTH = 1200;
const SNAP_JPEG_QUALITY = 0.85;

/**
 * Rasmni 1200px kenglikgacha qisqartirib, JPEG siqib, keyin yuklash.
 * 4K va katta rasmlar appda ochilishini yengillashtiradi.
 */
async function resizeAndUploadSnap(imageUri, userId) {
  if (!userId || !imageUri) return imageUri;
  const snapId = `snap_${Date.now()}`;
  try {
    const resized = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: MAX_SNAP_WIDTH } }],
      { compress: SNAP_JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );
    const data = await FileSystem.readAsStringAsync(resized.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const uploaded = await uploadSnapImage(
      userId,
      snapId,
      data,
      "image/jpeg"
    );
    return uploaded || null;
  } catch (e) {
    console.warn("Snap resize/upload failed:", e?.message);
    return null;
  }
}

/** Faqat Supabase Storage public URL qaytaradi; local file hech qachon DB ga yozilmasin */
async function ensurePublicImageUrl(imageUri, base64, userId) {
  if (!userId || !imageUri) return null;
  if (!isLocalFileUri(imageUri)) return imageUri;
  const uploaded = await resizeAndUploadSnap(imageUri, userId);
  return isLocalFileUri(uploaded) ? null : uploaded;
}

export default function ScannerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { width: screenWidth } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const vibration = useAppSettingsStore((s) => s.vibration);
  const cameraRef = useRef(null);
  const [cameraAreaHeight, setCameraAreaHeight] = useState(
    screenWidth * (4 / 3),
  );
  const [facing, setFacing] = useState("back");
  const [enableTorch, setEnableTorch] = useState(false);
  const [lastPhotoUri, setLastPhotoUri] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [showScanModal, setShowScanModal] = useState(false);
  const [scanImageUri, setScanImageUri] = useState(null);
  const [scanBase64, setScanBase64] = useState(null);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [scanError, setScanError] = useState(null);
  const [notAntique, setNotAntique] = useState(false);
  const [notAntiqueReason, setNotAntiqueReason] = useState(null);
  const [scanningDots, setScanningDots] = useState(0);

  const step1TranslateY = useRef(new Animated.Value(0)).current;
  const step2TranslateY = useRef(new Animated.Value(12)).current;
  const step3TranslateY = useRef(new Animated.Value(12)).current;
  const step2Opacity = useRef(new Animated.Value(0)).current;
  const step3Opacity = useRef(new Animated.Value(0)).current;
  const step1CheckScale = useRef(new Animated.Value(0)).current;
  const step2CheckScale = useRef(new Animated.Value(0)).current;
  const step3CheckScale = useRef(new Animated.Value(0)).current;
  const prevCompletedSteps = useRef(0);
  const modalOpacity = useRef(new Animated.Value(0)).current;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: "#000", position: "relative" },
        center: { justifyContent: "center", alignItems: "center" },
        permissionBtn: { marginTop: 16, padding: 16, borderRadius: 30, backgroundColor: colors.brand },
        header: { position: "absolute", left: 0, right: 0, top: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 10 },
        headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(80, 80, 80, 0.5)", alignItems: "center", justifyContent: "center" },
        headerRight: { flexDirection: "row", alignItems: "center" },
        cameraWrapper: { flex: 1, overflow: "hidden", alignItems: "center", marginBottom: 88 },
        cameraBox: { borderRadius: CAMERA_BORDER_RADIUS, overflow: "hidden", position: "relative" },
        scanFrame: { position: "absolute", zIndex: 5 },
        corner: { position: "absolute", width: SCAN_CORNER_SIZE, height: SCAN_CORNER_SIZE, borderColor: "#FFFFFF" },
        cornerTopLeft: { top: 0, left: 0, borderTopWidth: SCAN_BORDER_WIDTH, borderLeftWidth: SCAN_BORDER_WIDTH, borderTopLeftRadius: 12 },
        cornerTopRight: { top: 0, right: 0, borderTopWidth: SCAN_BORDER_WIDTH, borderRightWidth: SCAN_BORDER_WIDTH, borderTopRightRadius: 12 },
        cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: SCAN_BORDER_WIDTH, borderLeftWidth: SCAN_BORDER_WIDTH, borderBottomLeftRadius: 12 },
        cornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: SCAN_BORDER_WIDTH, borderRightWidth: SCAN_BORDER_WIDTH, borderBottomRightRadius: 12 },
        bottomControls: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingHorizontal: 32, zIndex: 10 },
        galleryButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(80, 80, 80, 0.5)", alignItems: "center", justifyContent: "center", overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
        galleryButtonImage: { width: "100%", height: "100%", borderRadius: 25 },
        captureButton: { width: 76, height: 76, borderRadius: 38, backgroundColor: "rgba(80, 80, 80, 0.5)", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
        captureButtonInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: "rgba(255, 255, 255, 0.95)" },
        infoButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(80, 80, 80, 0.5)", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
        modalFullScreen: { flex: 1, width: "100%" },
        modalBg: { ...StyleSheet.absoluteFillObject },
        modalBlur: { ...StyleSheet.absoluteFillObject },
        modalOverlay: { ...StyleSheet.absoluteFillObject },
        modalContent: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
        scanCard: { width: "80%", maxWidth: 340, overflow: "hidden", alignItems: "center" },
        scanCardImage: { width: "100%", aspectRatio: 1, borderRadius: 40, borderWidth: 6, borderColor: "#ffffff" },
        scanningText: { marginTop: 24, fontSize: 22, fontFamily: fonts.bold, color: colors.textWhite },
        scanStepsWrap: { width: "100%", maxWidth: 340, marginTop: 16, alignItems: "flex-start" },
        stepRow: { flexDirection: "row", alignItems: "center", marginTop: 14, alignSelf: "stretch" },
        checkCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center", marginRight: 12 },
        checkCircleDone: { backgroundColor: colors.green },
        stepText: { fontSize: 15, fontFamily: fonts.regular, color: colors.textWhite, flex: 1 },
        errorCard: { backgroundColor: colors.bgWhite, borderRadius: 20, padding: 24, alignItems: "center", maxWidth: 320 },
        errorText: { fontFamily: fonts.regular, fontSize: 16, color: colors.textBase, textAlign: "center" },
        notAntiqueCard: { backgroundColor: colors.bgWhite, borderRadius: 20, padding: 24, alignItems: "center", marginHorizontal: 24, maxWidth: 320 },
        notAntiqueTitle: { fontFamily: fonts.semiBold, fontSize: 20, color: colors.textBase, marginTop: 16 },
        notAntiqueReason: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, textAlign: "center", marginTop: 8, lineHeight: 22 },
        backHint: { color: colors.brand, marginTop: 16, fontSize: 16 },
      }),
    [colors]
  );

  const loadLastPhoto = useCallback(async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") return;
      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        first: 1,
        sortBy: [MediaLibrary.SortBy.creationTime],
      });
      if (assets.length > 0) {
        const info = await MediaLibrary.getAssetInfoAsync(assets[0]);
        if (info?.localUri) setLastPhotoUri(info.localUri);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLastPhoto();
    }, [loadLastPhoto]),
  );

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission?.granted, permission?.canAskAgain]);

  useEffect(() => {
    if (showScanModal) {
      modalOpacity.setValue(0);
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }
  }, [showScanModal]);

  useEffect(() => {
    if (!showScanModal) return;
    step1TranslateY.setValue(0);
  }, [showScanModal]);

  useEffect(() => {
    const prev = prevCompletedSteps.current;
    prevCompletedSteps.current = completedSteps;

    if (completedSteps === 1 && prev === 0) {
      step1CheckScale.setValue(0);
      Animated.spring(step1CheckScale, {
        toValue: 1,
        friction: 6,
        tension: 200,
        useNativeDriver: true,
      }).start();

      step2Opacity.setValue(0);
      step2TranslateY.setValue(12);
      Animated.parallel([
        Animated.timing(step2Opacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(step2TranslateY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (completedSteps === 2 && prev === 1) {
      step2CheckScale.setValue(0);
      Animated.spring(step2CheckScale, {
        toValue: 1,
        friction: 6,
        tension: 200,
        useNativeDriver: true,
      }).start();

      step3Opacity.setValue(0);
      step3TranslateY.setValue(12);
      Animated.parallel([
        Animated.timing(step3Opacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(step3TranslateY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (completedSteps === 3 && prev === 2) {
      step3CheckScale.setValue(0);
      Animated.spring(step3CheckScale, {
        toValue: 1,
        friction: 6,
        tension: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [completedSteps]);

  useEffect(() => {
    if (!showScanModal || !scanImageUri || scanError || notAntique) return;
    const id = setInterval(() => {
      setScanningDots((d) => (d + 1) % 4);
    }, 400);
    return () => clearInterval(id);
  }, [showScanModal, scanImageUri, scanError, notAntique]);

  useEffect(() => {
    if (!showScanModal || !scanImageUri) return;
    let cancelled = false;
    setScanError(null);
    setNotAntique(false);
    setNotAntiqueReason(null);
    setCompletedSteps(0);
    setScanningDots(0);
    prevCompletedSteps.current = 0;
    step2TranslateY.setValue(12);
    step3TranslateY.setValue(12);
    step2Opacity.setValue(0);
    step3Opacity.setValue(0);
    step1CheckScale.setValue(0);
    step2CheckScale.setValue(0);
    step3CheckScale.setValue(0);

    (async () => {
      try {
        const geminiResult = await analyzeAntiqueImage(
          scanBase64 || "",
          "image/jpeg",
        );
        if (cancelled) return;
        if (geminiResult.is_antique === false) {
          setNotAntique(true);
          setNotAntiqueReason(
            geminiResult.not_antique_reason ||
              "This does not appear to be an antique.",
          );
          return;
        }
        setCompletedSteps(1);
        await new Promise((r) => setTimeout(r, 500));
        if (cancelled) return;

        const {
          market_value_min,
          market_value_max,
          avg_growth_percentage,
          image_urls: ebayImageUrls,
          ebay_links: ebayLinks = [],
          ebay_items: ebayItems = [],
        } = await fetchMarketPricesFromEbay(geminiResult.search_keywords || []);
        if (cancelled) return;
        setCompletedSteps(2);
        await new Promise((r) => setTimeout(r, 500));
        if (cancelled) return;

        const now = new Date().toISOString();
        const userId = user?.id;
        let scanImageUrl = scanImageUri;
        if (
          isSupabaseConfigured() &&
          supabase &&
          userId &&
          isLocalFileUri(scanImageUri)
        ) {
          scanImageUrl = await ensurePublicImageUrl(
            scanImageUri,
            scanBase64,
            userId,
          );
        }
        if (isLocalFileUri(scanImageUrl)) scanImageUrl = null;

        // Faqat Supabase Storage URL; file:// hech qachon antiques/snap_history ga yozilmasin
        const snapDisplayImageUrl = scanImageUrl;

        const antiqueRow = {
          user_id: userId,
          name: geminiResult.name || "Unknown Antique",
          description: geminiResult.description || "",
          image_url: scanImageUrl || null,
          origin_country: geminiResult.origin_country || "Unknown",
          period_start_year: Number(geminiResult.period_start_year) || 1800,
          period_end_year: Number(geminiResult.period_end_year) || 1900,
          estimated_age_years: Number(geminiResult.estimated_age_years) || 50,
          rarity_score: 7,
          rarity_max_score: 10,
          overall_condition_summary:
            geminiResult.overall_condition_summary || "Good",
          condition_grade: geminiResult.condition_grade || "B",
          condition_description: geminiResult.condition_description || "",
          market_value_min: market_value_min ?? 0,
          market_value_max: market_value_max ?? 0,
          avg_growth_percentage: avg_growth_percentage ?? 0,
          mechanical_function_status:
            geminiResult.mechanical_function_status || "N/A",
          mechanical_function_notes:
            geminiResult.mechanical_function_notes || "",
          case_condition_status: geminiResult.case_condition_status || "N/A",
          case_condition_notes: geminiResult.case_condition_notes || "",
          dial_hands_condition_status:
            geminiResult.dial_hands_condition_status || "N/A",
          dial_hands_condition_notes:
            geminiResult.dial_hands_condition_notes || "",
          crystal_condition_status:
            geminiResult.crystal_condition_status || "N/A",
          crystal_condition_notes: geminiResult.crystal_condition_notes || "",
          category: Array.isArray(geminiResult.category)
            ? geminiResult.category
            : ["Antique"],
          specification: {
            ...(geminiResult.specification ?? {}),
            ...(geminiResult.estimated_market_value_usd != null
              ? { estimated_market_value_usd: Number(geminiResult.estimated_market_value_usd) }
              : {}),
            ...(geminiResult.estimated_market_value_low_usd != null
              ? { estimated_market_value_low_usd: Number(geminiResult.estimated_market_value_low_usd) }
              : {}),
            ...(geminiResult.estimated_market_value_high_usd != null
              ? { estimated_market_value_high_usd: Number(geminiResult.estimated_market_value_high_usd) }
              : {}),
            ...(Array.isArray(ebayLinks) && ebayLinks.length > 0
              ? { ebay_links: ebayLinks }
              : {}),
            ...(Array.isArray(ebayItems) && ebayItems.length > 0
              ? { ebay_items: ebayItems }
              : {}),
          },
          origin_provenance: geminiResult.origin_provenance ?? "",
          source: geminiResult.source ?? "AI Analysis",
          purchase_price: geminiResult.purchase_price ?? null,
          created_at: now,
          updated_at: now,
        };

        setCompletedSteps(3);

        await new Promise((resolve) => setTimeout(resolve, 2000));
        if (cancelled) return;

        if (!userId) {
          setShowScanModal(false);
          navigation.reset({
            index: 1,
            routes: [
              { name: "MainTabs" },
              {
                name: "ItemDetails",
                params: {
                  antique: { ...antiqueRow, id: null },
                  fromScan: true,
                },
              },
            ],
          });
          return;
        }

        const { data: antique, error: antErr } = await supabase
          .from("antiques")
          .insert(antiqueRow)
          .select("id")
          .single();
        if (antErr) throw antErr;
        if (cancelled) return;

        const payload = {
          ...geminiResult,
          market_value_min,
          market_value_max,
          avg_growth_percentage,
          ...(geminiResult.estimated_market_value_usd != null
            ? { estimated_market_value_usd: Number(geminiResult.estimated_market_value_usd) }
            : {}),
          ...(Array.isArray(ebayLinks) && ebayLinks.length > 0
            ? { ebay_links: ebayLinks }
            : {}),
        };
        const { error: snapErr } = await supabase.from("snap_history").insert({
          user_id: userId,
          image_url: snapDisplayImageUrl,
          antique_id: antique.id,
          payload,
        });
        if (snapErr) throw snapErr;
        if (cancelled) return;

        setShowScanModal(false);
        navigation.reset({
          index: 1,
          routes: [
            { name: "MainTabs" },
            {
              name: "ItemDetails",
              params: { antiqueId: antique.id, fromScan: true },
            },
          ],
        });
      } catch (e) {
        if (!cancelled) setScanError(e?.message || "Analysis failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showScanModal, scanImageUri]);

  const toggleTorch = () => setEnableTorch((v) => !v);
  const toggleFacing = () => {
    setFacing((f) => {
      const next = f === "back" ? "front" : "back";
      if (next === "front") setEnableTorch(false);
      return next;
    });
  };

  const openScanModal = (uri, base64) => {
    setScanImageUri(uri);
    setScanBase64(base64 ?? undefined);
    setShowScanModal(true);
  };

  const closeScanModal = () => {
    Animated.timing(modalOpacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setShowScanModal(false);
        setScanImageUri(null);
        setScanBase64(null);
        setCompletedSteps(0);
        setScanError(null);
        setNotAntique(false);
        setNotAntiqueReason(null);
      }
    });
  };

  const goBackToScanner = () => {
    closeScanModal();
  };

  if (!permission) {
    return <View style={[styles.container, styles.center]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center, { padding: 24 }]}>
        <StatusBar style="light" />
        <Camera
          size={48}
          color={colors.textSecondary}
        />
        {permission.canAskAgain ? (
          <Pressable style={styles.permissionBtn} onPress={requestPermission}>
            <Camera size={20} color="#fff" />
          </Pressable>
        ) : null}
      </View>
    );
  }

  const cameraBoxWidth = screenWidth;
  const cameraBoxHeight = screenWidth * (4 / 3);
  const scanSize = Math.min(cameraBoxWidth, cameraBoxHeight) - 40;
  const scanTop = (cameraBoxHeight - scanSize) / 2;
  const scanLeft = (cameraBoxWidth - scanSize) / 2;
  const cameraBoxMarginTop = (cameraAreaHeight - cameraBoxHeight) / 2;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, paddingBottom: 12 },
        ]}
      >
        <Pressable
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={12}
        >
          <X size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable
            style={styles.headerBtn}
            onPress={toggleTorch}
            hitSlop={12}
          >
            <Lightning
              size={24}
              weight={enableTorch ? "fill" : "regular"}
              color="#FFFFFF"
            />
          </Pressable>
          <Pressable
            style={[styles.headerBtn, { marginLeft: 12 }]}
            onPress={toggleFacing}
            hitSlop={12}
          >
            <CameraRotate size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <View
        style={styles.cameraWrapper}
        onLayout={(e) => setCameraAreaHeight(e.nativeEvent.layout.height)}
      >
        <View
          style={[
            styles.cameraBox,
            {
              width: cameraBoxWidth,
              height: cameraBoxHeight,
              marginTop: cameraBoxMarginTop,
            },
          ]}
        >
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
            enableTorch={enableTorch}
          />
          <View
            style={[
              styles.scanFrame,
              {
                left: scanLeft,
                top: scanTop,
                width: scanSize,
                height: scanSize,
              },
            ]}
          >
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
        </View>
      </View>

      <View
        style={[styles.bottomControls, { paddingBottom: insets.bottom + 20 }]}
      >
        <Pressable
          style={styles.galleryButton}
          onPress={async () => {
            try {
              const { status } =
                await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== "granted") return;
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                base64: true,
              });
              if (result.canceled || !result.assets?.[0]?.uri) return;
              const asset = result.assets[0];
              openScanModal(asset.uri, asset.base64);
            } catch (e) {
              console.warn("Gallery error", e);
            }
          }}
        >
          {lastPhotoUri ? (
            <Image
              source={{ uri: lastPhotoUri }}
              style={styles.galleryButtonImage}
              resizeMode="cover"
            />
          ) : (
            <Images size={24} color="#FFFFFF" />
          )}
        </Pressable>

        <Pressable
          style={styles.captureButton}
          onPress={async () => {
            triggerHaptic(vibration);
            if (!cameraRef.current) return;
            try {
              const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                base64: true,
              });
              if (photo?.uri) openScanModal(photo.uri, photo.base64);
            } catch (e) {
              console.warn("Capture error", e);
            }
          }}
        >
          <View style={styles.captureButtonInner} />
        </Pressable>

        <Pressable
          style={styles.infoButton}
          onPress={() => navigation.navigate("InfoScanner")}
        >
          <Info
            size={28}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      {/* Full-screen scan modal: blur background, checklist */}
      <Modal
        visible={showScanModal}
        transparent
        animationType="none"
        onRequestClose={closeScanModal}
        statusBarTranslucent
      >
        <Animated.View style={[styles.modalFullScreen, { opacity: modalOpacity }]}>
          <BlurView intensity={95} tint="dark" style={styles.modalBlur} />
          <View style={styles.modalOverlay} />
          <View style={styles.modalContent}>
            {notAntique ? (
              <View style={styles.notAntiqueCard}>
                <Warning
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={styles.notAntiqueTitle}>Bu antikvar emas</Text>
                <Text style={styles.notAntiqueReason}>{notAntiqueReason}</Text>
                <Text style={styles.backHint} onPress={goBackToScanner}>
                  Orqaga
                </Text>
              </View>
            ) : scanError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{scanError}</Text>
                <Text style={styles.backHint} onPress={goBackToScanner}>
                  Orqaga
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.scanCard}>
                  <Image
                    source={{ uri: scanImageUri }}
                    style={styles.scanCardImage}
                    resizeMode="cover"
                  />
                </View>
                <Text style={styles.scanningText}>
                  Scanning{'.'.repeat(scanningDots)}
                </Text>
                <View style={styles.scanStepsWrap}>
                  {CHECKLIST_STEPS.filter((_, index) => (index === 0 ? completedSteps >= 1 : index <= completedSteps)).map((label, index) => {
                    const done = completedSteps >= index + 1;
                    const current = completedSteps === index;
                    const translateY =
                      index === 0
                        ? step1TranslateY
                        : index === 1
                          ? step2TranslateY
                          : step3TranslateY;
                    const opacity = index === 0 ? 1 : index === 1 ? step2Opacity : step3Opacity;
                    const checkScale =
                      index === 0 ? step1CheckScale : index === 1 ? step2CheckScale : step3CheckScale;
                    return (
                      <Animated.View
                        key={label}
                        style={[
                          styles.stepRow,
                          { transform: [{ translateY }], opacity },
                        ]}
                      >
                        <View
                          style={[
                            styles.checkCircle,
                            done && styles.checkCircleDone,
                          ]}
                        >
                          {done ? (
                            <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                              <Check size={18} color="#fff" />
                            </Animated.View>
                          ) : null}
                        </View>
                        <Text style={styles.stepText}>{label}</Text>
                      </Animated.View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        </Animated.View>
      </Modal>
    </View>
  );
}
