import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { MainTabParamList } from "../types/navigation";
import { CommunityScreen } from "../screens/main/CommunityScreen";
import { MapTabScreen } from "../screens/main/MapTabScreen";
import { ChatListScreen } from "../screens/main/ChatListScreen";
import { CallHistoryScreen } from "../screens/main/CallHistoryScreen";
import { ProfileScreen } from "../screens/main/ProfileScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();

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
        component={ChatListScreen}
        options={{
          title: "Messages & Rooms",
          tabBarLabel: "Chats",
        }}
      />
      <Tab.Screen
        name="Calls"
        component={CallHistoryScreen}
        options={{
          title: "Call History",
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
