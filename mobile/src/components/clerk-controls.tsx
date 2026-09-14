import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { useAuth, useUser } from "@clerk/expo";
import { useHostedAuth } from "@clerk/expo/hosted-auth";

import { colors } from "@/theme";

export function ClerkControls() {
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const { startHostedAuth } = useHostedAuth();

  if (isSignedIn) {
    return (
      <Pressable
        onPress={() => {
          void signOut();
        }}
        style={styles.ghostBtn}
      >
        <Text style={styles.ghostLabel} numberOfLines={1}>
          {user?.primaryEmailAddress?.emailAddress ?? "Compte"}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => {
        void startHostedAuth({ mode: "sign-in" }).catch(() => {
          Alert.alert("Connexion", "Impossible d’ouvrir Clerk pour le moment.");
        });
      }}
      style={styles.outlineBtn}
    >
      <Text style={styles.outlineLabel}>Se connecter</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.card,
  },
  outlineLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foreground,
  },
  ghostBtn: {
    maxWidth: 140,
  },
  ghostLabel: {
    fontSize: 11,
    color: colors.muted,
  },
});
