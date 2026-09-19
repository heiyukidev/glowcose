import { useEffect, useState, type ComponentType } from "react";
import { StyleSheet, View } from "react-native";

import { Logo } from "@/components/logo";
import { isClerkConfigured } from "@/runtime";

export function AppHeader() {
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
});
