import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { MainTabParamList } from "../types/navigation";
import { CommunityScreen } from "../screens/main/CommunityScreen";
import { MapTabScreen } from "../screens/main/MapTabScreen";
import { ProfileScreen } from "../screens/main/ProfileScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();

const ChatsPlaceholderScreen = () => (
  <View style={styles.screen}>
    <Ionicons name="chatbubbles" size={44} color="#1b5e20" />
    <Text style={styles.title}>Chats & Meeting Rooms</Text>
    <Text style={styles.subtitle}>Direct inquiries and 3-way broker negotiations.</Text>
  </View>
);

const CallsPlaceholderScreen = () => (
  <View style={styles.screen}>
    <Ionicons name="call" size={44} color="#1b5e20" />
    <Text style={styles.title}>In-App Audio & Video Calls</Text>
    <Text style={styles.subtitle}>Zero-PII calls powered by ZegoCloud.</Text>
  </View>
);

export const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="Community"
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: "#1b5e20" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold", fontSize: 18 },
        tabBarActiveTintColor: "#1b5e20",
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: {
          paddingBottom: 6,
          paddingTop: 6,
          height: 62,
          backgroundColor: "#ffffff",
          borderTopColor: "#e5e7eb",
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home";

          if (route.name === "Community") {
            iconName = focused ? "business" : "business-outline";
          } else if (route.name === "Map") {
            iconName = focused ? "map" : "map-outline";
          } else if (route.name === "Chats") {
            iconName = focused ? "chatbubbles" : "chatbubbles-outline";
          } else if (route.name === "Calls") {
            iconName = focused ? "call" : "call-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          title: "LandConnect Community",
          tabBarLabel: "Explore",
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapTabScreen}
        options={{
          title: "Land Plots Map",
          tabBarLabel: "Map",
        }}
      />
      <Tab.Screen
        name="Chats"
        component={ChatsPlaceholderScreen}
        options={{
          title: "Messages & Rooms",
          tabBarLabel: "Chats",
        }}
      />
      <Tab.Screen
        name="Calls"
        component={CallsPlaceholderScreen}
        options={{
          title: "Calls History",
          tabBarLabel: "Calls",
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "My Profile",
          tabBarLabel: "Profile",
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f9fafb",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1b5e20",
    marginTop: 12,
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 6,
    textAlign: "center",
  },
});
