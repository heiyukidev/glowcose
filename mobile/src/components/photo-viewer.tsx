import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { size } from "lodash";
import { useCallback, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  openMealPhotos,
  stepMealPhoto,
  t,
  type OpenMealPhotos,
} from "@glowcose/core";
import { colors } from "@/theme";

export function useMealPhotoViewer() {
  const [open, setOpen] = useState<OpenMealPhotos | null>(null);
  const show = useCallback((urls: readonly string[], startIndex: number) => {
    setOpen(openMealPhotos(urls, startIndex));
  }, []);
  const step = useCallback((direction: -1 | 1) => {
    setOpen((current) =>
      current ? stepMealPhoto(current, direction) : current,
    );
  }, []);
  const close = useCallback(() => setOpen(null), []);
  return { open, show, step, close };
}

export function PhotoViewer({
  open,
  onClose,
  onStep,
}: {
  open: OpenMealPhotos | null;
  onClose: () => void;
  onStep: (direction: -1 | 1) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  if (!open) return null;
  const url = open.urls[open.index];
  if (!url) return null;
  const total = size(open.urls);
  const several = total > 1;
  const frameHeight = height - insets.top - insets.bottom - 96;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel={t("photo.close")}
        />
        <ScrollView
          key={open.index}
          style={{ width, height: frameHeight }}
          contentContainerStyle={styles.frame}
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
          pinchGestureEnabled
          bouncesZoom
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={{ uri: url }}
            style={{ width, height: frameHeight }}
            resizeMode="contain"
            accessibilityLabel={t("photo.position", {
              current: open.index + 1,
              total,
            })}
          />
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("photo.close")}
          onPress={onClose}
          style={[styles.close, { top: insets.top + 12 }]}
        >
          <X color={colors.foreground} size={22} />
        </Pressable>
        {several ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("photo.previous")}
            disabled={open.index === 0}
            onPress={() => onStep(-1)}
            style={[
              styles.step,
              styles.stepLeft,
              open.index === 0 && styles.stepDisabled,
            ]}
          >
            <ChevronLeft color={colors.foreground} size={28} />
          </Pressable>
        ) : null}
        {several ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("photo.next")}
            disabled={open.index === total - 1}
            onPress={() => onStep(1)}
            style={[
              styles.step,
              styles.stepRight,
              open.index === total - 1 && styles.stepDisabled,
            ]}
          >
            <ChevronRight color={colors.foreground} size={28} />
          </Pressable>
        ) : null}
        {several ? (
          <Text style={[styles.position, { bottom: insets.bottom + 16 }]}>
            {t("photo.position", { current: open.index + 1, total })}
          </Text>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.foreground,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  close: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  step: {
    position: "absolute",
    top: "46%",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  stepLeft: {
    left: 12,
  },
  stepRight: {
    right: 12,
  },
  stepDisabled: {
    opacity: 0.35,
  },
  position: {
    position: "absolute",
    color: colors.card,
    fontSize: 14,
    fontWeight: "600",
  },
});
