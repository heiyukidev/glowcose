import { Tabs } from "expo-router";
import { CalendarDays, LineChart, Settings, Sun } from "lucide-react-native";

import { colors } from "@/theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Aujourd’hui",
          tabBarIcon: ({ color, size }) => <Sun color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="historique"
        options={{
          title: "Historique",
          tabBarIcon: ({ color, size }) => (
            <CalendarDays color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="graphique"
        options={{
          title: "Graphique",
          tabBarIcon: ({ color, size }) => (
            <LineChart color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="reglages"
        options={{
          title: "Réglages",
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
