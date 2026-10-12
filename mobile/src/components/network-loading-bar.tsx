import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  View,
} from "react-native";
import { useConvexAuth, useConvexConnectionState } from "convex/react";
import { t } from "@glowcose/core";

import { colors } from "@/theme";

const BAR_WIDTH_RATIO = 0.33;

/** Thin top-edge indeterminate bar. */
export function TopNetworkBar({ busy }: { busy: boolean }) {
  const translate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const loop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (busy) {
      const screenWidth = Dimensions.get("window").width;
      const barWidth = screenWidth * BAR_WIDTH_RATIO;
      opacity.setValue(1);
      translate.setValue(-barWidth);
      loop.current = Animated.loop(
        Animated.timing(translate, {
          toValue: screenWidth,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      );
      loop.current.start();
      return () => {
        loop.current?.stop();
        loop.current = null;
      };
    }

    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    loop.current?.stop();
    loop.current = null;
    return undefined;
  }, [busy, opacity, translate]);

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden={!busy}
      importantForAccessibility={busy ? "yes" : "no-hide-descendants"}
      accessibilityRole="progressbar"
      accessibilityLabel={t("loading.network")}
      accessibilityState={{ busy }}
      style={styles.track}
    >
      <Animated.View
        style={[
          styles.bar,
          {
            opacity,
            transform: [{ translateX: translate }],
          },
        ]}
      />
    </View>
  );
}

/**
 * Thin top-edge progress bar while Clerk↔Convex session auth is settling
 * or any Convex request is in flight.
 */
export function NetworkLoadingBar() {
  const { isLoading: authLoading } = useConvexAuth();
  const { hasInflightRequests } = useConvexConnectionState();
  const busy = authLoading || hasInflightRequests;

  return <TopNetworkBar busy={busy} />;
}

const styles = StyleSheet.create({
  track: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    zIndex: 100,
    height: 2,
    overflow: "hidden",
  },
  bar: {
    height: 2,
    width: `${BAR_WIDTH_RATIO * 100}%`,
    backgroundColor: colors.primary,
  },
});
