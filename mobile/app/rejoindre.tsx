import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import { useHostedAuth } from "@clerk/expo/hosted-auth";

import { formatInviteCode, normalizeInviteCode, t } from "@glowcose/core";
import { Screen } from "@/components/screen";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui";
import { useCarnet } from "@/providers/carnet-provider";
import { rememberPendingInvite } from "@/stores/pending-invite";
import { isClerkConfigured } from "@/runtime";
import { colors } from "@/theme";

function JoinAuthed({ code }: { code: string }) {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { startHostedAuth } = useHostedAuth();
  const { joinWithCode } = useCarnet();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    void rememberPendingInvite(code);
  }, [code]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    void joinWithCode(code)
      .then(() => {
        if (!cancelled) {
          router.replace("/");
        }
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : t("share.joinCta"));
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, code, isLoaded, isSignedIn, joinWithCode, router]);

  return (
    <>
      <Text style={styles.code}>{formatInviteCode(code)}</Text>
      {!isLoaded ? (
        <View style={styles.pulse} />
      ) : !isSignedIn ? (
        <>
          <Text style={styles.lead}>{t("rejoindre.signingIn")}</Text>
          <Button
            title="Se connecter"
            onPress={() => {
              void startHostedAuth({ mode: "sign-in" });
            }}
          />
        </>
      ) : (
        <>
          <Text style={styles.lead}>
            {error ?? t("rejoindre.joining")}
          </Text>
          {error ? (
            <Button
              title={t("share.joinCta")}
              onPress={() => {
                setError(null);
                setAttempt((value) => value + 1);
              }}
            />
          ) : null}
        </>
      )}
    </>
  );
}

export default function RejoindreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const raw = Array.isArray(params.code) ? params.code[0] : params.code;
  const code = normalizeInviteCode(raw ?? "");
  const clerkEnabled = isClerkConfigured();

  return (
    <Screen>
      <View style={styles.wrap}>
        <Logo />
        <Text style={styles.title}>{t("rejoindre.title")}</Text>
        {!clerkEnabled ? (
          <Text style={styles.lead}>{t("share.needAccount")}</Text>
        ) : !code ? (
          <Text style={styles.lead}>{t("rejoindre.missing")}</Text>
        ) : (
          <JoinAuthed code={code} />
        )}
        <Button
          title={t("notFound.backToJournal")}
          variant="ghost"
          onPress={() => router.replace("/")}
          style={styles.back}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: colors.foreground,
    fontFamily: "Georgia",
    textAlign: "center",
  },
  lead: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
  },
  code: {
    fontSize: 28,
    fontWeight: "600",
    letterSpacing: 4,
    color: colors.foreground,
    fontFamily: "Georgia",
  },
  pulse: {
    height: 48,
    width: "100%",
    borderRadius: 16,
    backgroundColor: colors.mutedSurface,
  },
  back: {
    marginTop: 16,
  },
});
