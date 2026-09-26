import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { filter, find, map, size } from "lodash";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import {
  canOfferRappel,
  canMoveJournalForward,
  dayScoreTone,
  journalDayKey,
  journalDayLabel,
  readingStatus,
  readingsOnLocalDay,
  shiftLocalDay,
  startOfLocalDay,
  t,
  todayMealCards,
  type DayScoreTone,
} from "@glowcose/core";
import { Screen } from "@/components/screen";
import { AppHeader } from "@/components/header";
import { Disclaimer } from "@/components/disclaimer";
import { RappelOfferToast } from "@/components/rappel-offer-toast";
import { ReadingsList } from "@/components/reading-list";
import { useRappels } from "@/hooks/use-rappels";
import { scheduleRappel } from "@/lib/rappel-notifications";
import { useReadings } from "@/providers/readings-provider";
import { useSettings } from "@/providers/settings-provider";
import { colors } from "@/theme";

const TONE: Record<
  DayScoreTone,
  { backgroundColor: string; color: string; shadow: string }
> = {
  green: {
    backgroundColor: "#E5F6EA",
    color: colors.statusInFg,
    shadow: colors.statusIn,
  },
  yellow: {
    backgroundColor: "#FBEED6",
    color: colors.statusHighFg,
    shadow: colors.statusHigh,
  },
  red: {
    backgroundColor: "#F8E4DF",
    color: colors.statusAlertFg,
    shadow: colors.statusAlert,
  },
};

export default function TodayScreen() {
  const { readings, ready } = useReadings();
  const { settings } = useSettings();
  const { offer, dismissOffer } = useRappels();
  const [today] = useState(() => startOfLocalDay(new Date()));
  const [day, setDay] = useState(() => startOfLocalDay(new Date()));
  const [scoreOpen, setScoreOpen] = useState(false);
  const dayReadings = readingsOnLocalDay(readings, day);
  const statuses = map(dayReadings, (reading) =>
    readingStatus(
      reading.valueMgDl,
      reading.context,
      reading.postMealOffset,
      settings.thresholds,
    ),
  );
  const inRangeCount = size(filter(statuses, (status) => status === "in_range"));
  const tone = dayScoreTone(statuses);
  const onToday = !canMoveJournalForward(day, today);
  const label = journalDayLabel(day, today);
  const dayKey = journalDayKey(day);
  const scoreLabel = t("home.score", {
    inRange: inRangeCount,
    total: size(dayReadings),
  });
  const tooltip = onToday
    ? t("home.inRangeToday", {
        inRange: inRangeCount,
        total: size(dayReadings),
      })
    : t("home.inRangeOnDay", {
        inRange: inRangeCount,
        total: size(dayReadings),
        date: label,
      });

  async function onScheduleFromToast() {
    if (!offer) return;
    const { meals } = todayMealCards(readings);
    const meal = find(meals, (item) => item.slot === offer.slot);
    if (!meal || meal.isShell || !canOfferRappel(meal)) {
      dismissOffer();
      return;
    }
    const scheduled = await scheduleRappel({
      mealId: meal.id,
      mealLabel: offer.mealLabel,
      afterContext: offer.afterContext,
    });
    if (scheduled) dismissOffer();
  }

  return (
    <Screen>
      <AppHeader />
      <View style={styles.nav}>
        <View style={styles.side}>
          <DayStep
            label={t("home.previousDay")}
            onPress={() => {
              setScoreOpen(false);
              setDay((current) => shiftLocalDay(current, -1));
            }}
          >
            <ChevronLeft color={colors.foreground} size={22} />
          </DayStep>
        </View>
        <Text style={styles.title}>{label}</Text>
        <View style={styles.sideRight}>
          {tone ? (
            <View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tooltip}
                onPress={() => setScoreOpen((open) => !open)}
                style={[
                  styles.score,
                  {
                    backgroundColor: TONE[tone].backgroundColor,
                    shadowColor: TONE[tone].shadow,
                  },
                ]}
              >
                <Text style={[styles.scoreText, { color: TONE[tone].color }]}>
                  {scoreLabel}
                </Text>
              </Pressable>
              {scoreOpen ? (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipText}>{tooltip}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          <DayStep
            label={t("home.nextDay")}
            disabled={onToday}
            onPress={() => {
              setScoreOpen(false);
              setDay((current) =>
                canMoveJournalForward(current, today)
                  ? shiftLocalDay(current, 1)
                  : current,
              );
            }}
          >
            <ChevronRight
              color={onToday ? colors.muted : colors.foreground}
              size={22}
            />
          </DayStep>
        </View>
      </View>
      {offer ? (
        <RappelOfferToast
          onSchedule={() => {
            void onScheduleFromToast();
          }}
          onDismiss={dismissOffer}
        />
      ) : null}
      {!ready ? (
        <View
          accessible
          accessibilityLabel={t("loading.journal")}
          accessibilityState={{ busy: true }}
          style={styles.skeleton}
        />
      ) : (
        <ReadingsList
          readings={dayReadings}
          byMeal
          dayKey={dayKey}
          emptyTitle={t("home.emptyTitle")}
          emptyBody={t("home.emptyBody")}
        />
      )}
      <Disclaimer style={styles.disclaimer} />
    </Screen>
  );
}

function DayStep({
  label,
  disabled,
  onPress,
  children,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.step, disabled && styles.stepDisabled]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    zIndex: 20,
  },
  side: {
    flex: 1,
    alignItems: "flex-start",
  },
  sideRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  title: {
    textAlign: "center",
    fontSize: 32,
    fontWeight: "600",
    color: colors.foreground,
    fontFamily: "Georgia",
  },
  step: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDisabled: {
    opacity: 0.35,
  },
  score: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "700",
  },
  tooltip: {
    position: "absolute",
    top: 62,
    right: 0,
    width: 180,
    borderRadius: 12,
    backgroundColor: colors.foreground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 20,
  },
  tooltipText: {
    color: colors.background,
    fontSize: 12,
    textAlign: "center",
  },
  skeleton: {
    height: 160,
    borderRadius: 24,
    backgroundColor: colors.mutedSurface,
  },
  disclaimer: {
    marginTop: 28,
  },
});
