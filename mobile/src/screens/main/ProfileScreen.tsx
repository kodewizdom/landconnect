import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { useAuthStore } from "../../store/useAuthStore";

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, role, logout } = useAuthStore();

  const isSellerOrBroker = role === "seller" || role === "broker";

  const handleLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.headerCard}>
        <Ionicons name="person-circle" size={72} color="#1b5e20" />
        <Text style={styles.userName}>{user?.full_name || "LandConnect User"}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>

        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{role?.toUpperCase()} ACCOUNT</Text>
        </View>
      </View>

      {/* Role-Specific Management Actions */}
      {isSellerOrBroker && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Property Management</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("CreateListing")}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="add-circle-outline" size={20} color="#1b5e20" />
              <Text style={styles.menuText}>Post New Land Plot</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("MyListings")}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="business-outline" size={20} color="#1b5e20" />
              <Text style={styles.menuText}>My Land Listings</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>
        </View>
      )}

      {/* Privacy Guarantee Info */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Privacy & Security</Text>
        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#2e7d32" />
          <Text style={styles.infoText}>
            Your email and phone number are never exposed to other buyers, sellers, or brokers.
          </Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#dc2626" style={{ marginRight: 8 }} />
        <Text style={styles.logoutBtnText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
    padding: 16,
  },
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
    marginTop: 6,
  },
  userEmail: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  roleBadgeText: {
    color: "#1b5e20",
    fontWeight: "bold",
    fontSize: 11,
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuText: {
    fontSize: 15,
    color: "#222",
    marginLeft: 12,
    fontWeight: "500",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    fontSize: 13,
    color: "#555",
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
  logoutBtn: {
    flexDirection: "row",
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  logoutBtnText: {
    color: "#dc2626",
    fontWeight: "bold",
    fontSize: 15,
  },
});
