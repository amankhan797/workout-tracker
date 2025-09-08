import { Tabs } from "expo-router";
import React from "react";
import { Platform, View } from "react-native";
import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useColorScheme } from "@/hooks/useColorScheme";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/app/context/ThemeContext"; // Import useTheme

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { themeColor } = useTheme(); // Get the current theme color

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: themeColor, // Use the theme color instead of hardcoded "#3498db"
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: () => (
          <View style={{ backgroundColor: 'rgb(38, 38, 38)', flex: 1 }} />
        ),
        tabBarStyle: {
          ...Platform.select({
            ios: {
              position: "absolute",
            },
            default: {},
          }),
          backgroundColor: 'rgb(38, 38, 38)',
          borderBottomWidth: 0,
          elevation: 0,
          height: 60,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 0,
          marginTop: 0
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: "Workout",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="dumbbell" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="chart.bar.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="clock.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="SettingsScreen"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="settings" size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}