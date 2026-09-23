import { compact, map, size, take } from "lodash";
import { Images } from "lucide-react-native";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import {
  contextForMealSide,
  formatInputValue,
  formatTime,
  readingStatus,
  t,
  UNIT_LABELS,
  type MealCardModel,
  type MealCardSide,
  type Reading,
  type ReadingStatus,
} from "@glowcose/core";
import { useSettings } from "@/providers/settings-provider";
import { colors, statusColors } from "@/theme";

const STATUS_SURFACE: Record<
  ReadingStatus,
  { backgroundColor: string; color: string }
> = {
  in_range: {
    backgroundColor: statusColors.in_range.bg,
    color: statusColors.in_range.fg,
  },
  high: {
    backgroundColor: statusColors.high.bg,
    color: statusColors.high.fg,
  },
  very_high: {
    backgroundColor: statusColors.very_high.bg,
    color: statusColors.very_high.fg,
  },
  hypo: {
    backgroundColor: statusColors.hypo.bg,
    color: statusColors.hypo.fg,
  },
};

/** Idle empty slots stay paper/ink — status green/red only when a value exists. */
const EMPTY_SURFACE = {
  backgroundColor: colors.mutedSurface,
  color: colors.muted,
} as const;


function MealSideCell({
  side,
  meal,
  reading,
}: {
  side: MealCardSide;
  meal: MealCardModel;
  reading?: Reading;
}) {
  const router = useRouter();
  const { settings } = useSettings();
  const context = contextForMealSide(meal.slot, side);
  const label =
    side === "before" ? t("meal.addBefore") : t("meal.addAfter");

  const onPress = () => {
    if (reading) {
      router.push(`/mesure/${reading._id}`);
      return;
    }
    router.push({ pathname: "/ajouter", params: { context } });
  };

  if (!reading) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[styles.side, { backgroundColor: EMPTY_SURFACE.backgroundColor }]}
      >
        <Text style={[styles.value, { color: EMPTY_SURFACE.color }]}>
          {t("meal.emptyValue")}
        </Text>
        <Text style={[styles.plus, { color: EMPTY_SURFACE.color }]}>+</Text>
      </Pressable>
    );
  }

  const status = readingStatus(
    reading.valueMgDl,
    reading.context,
    reading.postMealOffset,
    settings.thresholds,
  );
  const surface = STATUS_SURFACE[status];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} · ${formatInputValue(reading.valueMgDl, settings.unit)}`}
      style={[styles.side, { backgroundColor: surface.backgroundColor }]}
    >
      <Text style={[styles.value, { color: surface.color }]}>
        {formatInputValue(reading.valueMgDl, settings.unit)}
      </Text>
      <Text style={[styles.unit, { color: surface.color }]}>
        {UNIT_LABELS[settings.unit]}
      </Text>
      <Text style={[styles.time, { color: surface.color }]}>
        {formatTime(reading.takenAt)}
      </Text>
    </Pressable>
  );
}

export function MealCard({ meal }: { meal: MealCardModel }) {
  const urls = compact(map(meal.photos, (photo) => photo.url));
  const stack = take(urls, 3);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{meal.label}</Text>
      <View style={styles.row}>
        <MealSideCell side="before" meal={meal} reading={meal.before} />
        <View style={styles.photosCol}>
          <Text style={styles.photosLabel}>{t("meal.photos")}</Text>
          {size(stack) > 0 ? (
            <View style={styles.stack}>
              {map(stack, (url, index) => (
                <Image
                  key={`${meal.id}-photo-${index}`}
                  source={{ uri: url }}
                  style={[
                    styles.thumb,
                    {
                      left: index * 3,
                      top: index * 2,
                      zIndex: 3 - index,
                    },
                  ]}
                  accessibilityLabel={`Photo du ${meal.label}`}
                />
              ))}
            </View>
          ) : (
            <View style={styles.photoEmpty} accessibilityElementsHidden>
              <Images color={colors.muted} size={16} />
            </View>
          )}
        </View>
        <MealSideCell side="after" meal={meal} reading={meal.after} />
      </View>
      {meal.note ? <Text style={styles.note}>{meal.note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  title: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "500",
    color: colors.foreground,
    fontFamily: "Georgia",
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  side: {
    flex: 1,
    minHeight: 88,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 28,
    fontWeight: "400",
    fontFamily: "Georgia",
    letterSpacing: -0.4,
  },
  unit: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.85,
  },
  time: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.9,
  },
  plus: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.85,
  },
  photosCol: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  photosLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.muted,
  },
  stack: {
    width: 40,
    height: 40,
  },
  thumb: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.card,
  },
  photoEmpty: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.mutedSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  note: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 13,
    color: colors.muted,
  },
});
