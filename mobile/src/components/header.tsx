import { useEffect, useState, type ComponentType } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Logo } from "@/components/logo";
import { colors } from "@/theme";
import { isClerkConfigured } from "@/runtime";

export function AppHeader({ demo }: { demo: boolean }) {
  const [ClerkControls, setClerkControls] = useState<ComponentType | null>(
    null,
  );

  useEffect(() => {
    if (!isClerkConfigured()) return;
    let cancelled = false;
    void import("./clerk-controls").then((mod) => {
      if (!cancelled) {
        setClerkControls(() => mod.ClerkControls);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.header}>
      <Logo />
      <View style={styles.actions}>
        {demo ? (
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>Mode démo</Text>
          </View>
        ) : null}
        {ClerkControls ? <ClerkControls /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  badge: {
    backgroundColor: colors.mutedSurface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foreground,
  },
});
