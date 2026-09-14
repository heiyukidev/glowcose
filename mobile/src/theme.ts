export const colors = {
  background: "#FBF6EC",
  foreground: "#4A3F32",
  card: "#FFFCF6",
  primary: "#2F7A6B",
  primaryForeground: "#F8FBF8",
  muted: "#8A7B6B",
  mutedSurface: "#F3EBDD",
  border: "#E8DCC8",
  statusIn: "#3DAA6D",
  statusInFg: "#1F6B40",
  statusHigh: "#E2A03A",
  statusHighFg: "#8A5A12",
  statusAlert: "#D4543C",
  statusAlertFg: "#8A2618",
  statusLow: "#4A8FBF",
  statusLowFg: "#1F4F73",
} as const;

export const statusColors = {
  in_range: { bg: "#E5F6EA", fg: colors.statusInFg, dot: colors.statusIn },
  high: { bg: "#FBEED6", fg: colors.statusHighFg, dot: colors.statusHigh },
  very_high: { bg: "#F8E4DF", fg: colors.statusAlertFg, dot: colors.statusAlert },
  hypo: { bg: "#E4F0F8", fg: colors.statusLowFg, dot: colors.statusLow },
} as const;
