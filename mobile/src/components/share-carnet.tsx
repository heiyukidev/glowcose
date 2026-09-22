import { useState } from "react";
import { Alert, Share, StyleSheet, Text, TextInput, View } from "react-native";

import {
  formatInviteCode,
  INVITE_CODE_LENGTH,
  inviteShareMessage,
  MAX_CARNET_MEMBERS,
  t,
} from "@glowcose/core";
import { useCarnet } from "@/providers/carnet-provider";
import { Button } from "@/components/ui";
import { isClerkConfigured } from "@/runtime";
import { colors } from "@/theme";

export function ShareCarnet() {
  const clerkEnabled = isClerkConfigured();
  const { mine, ready, createInvite, joinWithCode } = useCarnet();
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);

  if (!clerkEnabled) {
    return null;
  }

  const memberCount = mine?.memberCount ?? 1;
  const shared = memberCount >= MAX_CARNET_MEMBERS;
  const invite = mine?.invite;

  async function handleCreate() {
    if (busy) return;
    setBusy(true);
    try {
      await createInvite();
    } catch (error) {
      Alert.alert(
        t("share.title"),
        error instanceof Error ? error.message : t("share.createCode"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    if (!invite) return;
    try {
      await Share.share({ message: inviteShareMessage(invite.code) });
    } catch {
      Alert.alert(t("share.title"), t("share.share"));
    }
  }

  async function handleJoin() {
    if (busy) return;
    setBusy(true);
    try {
      await joinWithCode(joinCode);
      setJoinCode("");
      Alert.alert(t("share.title"), t("share.joinSuccess"));
    } catch (error) {
      Alert.alert(
        t("share.joinTitle"),
        error instanceof Error ? error.message : t("share.joinCta"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t("share.title")}</Text>
      {!ready ? (
        <View style={styles.pulse} />
      ) : !mine ? (
        <Text style={styles.lead}>{t("share.needAccount")}</Text>
      ) : (
        <>
          <Text style={styles.lead}>
            {shared
              ? t("share.leadShared", { count: memberCount })
              : t("share.leadSolo")}
          </Text>
          {invite ? (
            <View style={styles.card}>
              <Text style={styles.code}>{formatInviteCode(invite.code)}</Text>
              <Text style={styles.hint}>{t("share.codeHint")}</Text>
              <Button
                title={t("share.share")}
                onPress={() => void handleShare()}
                style={styles.button}
              />
              {!shared ? (
                <Button
                  title={t("share.newCode")}
                  variant="outline"
                  disabled={busy}
                  onPress={() => void handleCreate()}
                  style={styles.button}
                />
              ) : null}
            </View>
          ) : !shared ? (
            <Button
              title={t("share.createCode")}
              disabled={busy}
              onPress={() => void handleCreate()}
              style={styles.button}
            />
          ) : null}
          {!shared ? (
            <View style={styles.join}>
              <Text style={styles.joinTitle}>{t("share.joinTitle")}</Text>
              <Text style={styles.hint}>{t("share.joinLead")}</Text>
              <TextInput
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={INVITE_CODE_LENGTH + 8}
                placeholder={t("share.joinPlaceholder")}
                placeholderTextColor={colors.muted}
                value={joinCode}
                onChangeText={setJoinCode}
                style={styles.input}
              />
              <Button
                title={t("share.joinCta")}
                disabled={busy || joinCode.trim() === ""}
                onPress={() => void handleJoin()}
              />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 8,
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  lead: {
    marginBottom: 10,
    fontSize: 13,
    color: colors.muted,
  },
  pulse: {
    height: 88,
    borderRadius: 18,
    backgroundColor: colors.mutedSurface,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  code: {
    fontSize: 28,
    fontWeight: "600",
    letterSpacing: 4,
    color: colors.foreground,
    fontFamily: "Georgia",
  },
  hint: {
    marginTop: 6,
    marginBottom: 10,
    fontSize: 12,
    color: colors.muted,
  },
  button: {
    marginTop: 8,
  },
  join: {
    marginTop: 8,
  },
  joinTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    marginBottom: 10,
    color: colors.foreground,
    fontSize: 16,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
});
