import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MainTabParamList } from "../types/navigation";
import { CommunityScreen } from "../screens/main/CommunityScreen";
import { MapTabScreen } from "../screens/main/MapTabScreen";
import { ChatListScreen } from "../screens/main/ChatListScreen";
import { CallHistoryScreen } from "../screens/main/CallHistoryScreen";
import { ProfileScreen } from "../screens/main/ProfileScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const tabBarHeight = 60 + insets.bottom;

  return (
    <Tab.Navigator
      initialRouteName="Community"
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: "#0B2B26" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "700", letterSpacing: 0.6, fontSize: 16 },
        tabBarActiveTintColor: "#C5A059",
        tabBarInactiveTintColor: "#636B69",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 12,
          height: tabBarHeight,
          paddingBottom: bottomInset,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.4,
          marginBottom: 2,
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
