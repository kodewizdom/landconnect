import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MainTabParamList } from "../types/navigation";
import { useAuthStore } from "../store/useAuthStore";

const Tab = createBottomTabNavigator<MainTabParamList>();

const CommunityScreen = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>🏡 Community & Land Feed</Text>
    <Text style={styles.subtitle}>Verified land plots from sellers and brokers.</Text>
  </View>
);

const MapScreen = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>🗺️ Interactive OpenStreetMap</Text>
    <Text style={styles.subtitle}>Explore plot locations, boundaries, and GPS coordinates.</Text>
  </View>
);

const ChatsScreen = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>💬 Chats & Meeting Rooms</Text>
    <Text style={styles.subtitle}>Direct inquiries and 3-way broker negotiations.</Text>
  </View>
);

const CallsScreen = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>📞 In-App Calls</Text>
    <Text style={styles.subtitle}>Zero-PII audio and video calls powered by ZegoCloud.</Text>
  </View>
);

const ProfileScreen = () => {
  const { user, role, logout } = useAuthStore();

  return (
    <View style={styles.screen}>
      <View style={styles.profileCard}>
        <Text style={styles.profileName}>{user?.full_name || "LandConnect User"}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>ROLE: {role?.toUpperCase()}</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="Community"
      screenOptions={{
        headerStyle: { backgroundColor: "#1b5e20" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        tabBarActiveTintColor: "#1b5e20",
        tabBarInactiveTintColor: "#888",
        tabBarStyle: { paddingBottom: 5, height: 60 },
      }}
    >
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{ tabBarLabel: "Community" }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ tabBarLabel: "Map" }}
      />
      <Tab.Screen
        name="Chats"
        component={ChatsScreen}
        options={{ tabBarLabel: "Chats" }}
      />
      <Tab.Screen
        name="Calls"
        component={CallsScreen}
        options={{ tabBarLabel: "Calls" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f9fafb",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1b5e20",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  profileCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
  },
  profileEmail: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  badge: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 20,
  },
  badgeText: {
    color: "#1b5e20",
    fontSize: 12,
    fontWeight: "bold",
  },
  logoutBtn: {
    backgroundColor: "#c62828",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
