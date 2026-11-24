import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
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

  // Build initials from name
  const initials = (user?.full_name || "LC")
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0] || "")
    .join("")
    .toUpperCase();

  const roleLabel = role
    ? `${role.toUpperCase()} MEMBER`
    : "MEMBER";

  return (
    <View style={styles.container}>
      {/* Header banner */}
      <View style={styles.headerBanner}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user?.full_name || "LandConnect User"}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{roleLabel}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        {/* Property Management Card */}
        {isSellerOrBroker && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionEyebrow}>PROPERTY MANAGEMENT</Text>

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate("CreateListing")}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={20} color="#C5A059" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Post Listing</Text>
              <Ionicons name="chevron-forward" size={18} color="#E6E2D8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, styles.menuRowLast]}
              onPress={() => navigation.navigate("MyListings")}
              activeOpacity={0.7}
            >
              <Ionicons name="home-outline" size={20} color="#C5A059" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>My Listings</Text>
              <Ionicons name="chevron-forward" size={18} color="#E6E2D8" />
            </TouchableOpacity>
          </View>
        )}

        {/* Privacy & Security Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionEyebrow}>PRIVACY & SECURITY</Text>

          <View style={styles.privacyRow}>
            <Ionicons name="shield-checkmark" size={20} color="#1A6B45" style={styles.menuIcon} />
            <Text style={styles.privacyText}>
              Your email and phone number are never exposed to other buyers, sellers, or brokers. All communication goes through LandConnect's zero-PII secure channel.
            </Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color="#8B1A1A" style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7F4",
  },
  headerBanner: {
    backgroundColor: "#0B2B26",
    paddingTop: 60,
    paddingBottom: 32,
    alignItems: "center",
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#143D36",
    borderWidth: 2.5,
    borderColor: "#C5A059",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: "700",
    color: "#C5A059",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 12,
  },
  roleBadge: {
    backgroundColor: "#F5EDD8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginTop: 8,
  },
  roleBadgeText: {
    color: "#92610A",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.0,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    overflow: "hidden",
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#636B69",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#E6E2D8",
  },
  menuRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F8F7F4",
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 15,
    color: "#181C1B",
    flex: 1,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  privacyText: {
    fontSize: 13,
    color: "#636B69",
    flex: 1,
    lineHeight: 20,
  },
  logoutBtn: {
    borderWidth: 1.5,
    borderColor: "#8B1A1A",
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 0,
    marginBottom: 8,
  },
  logoutBtnText: {
    color: "#8B1A1A",
    fontWeight: "700",
    fontSize: 15,
  },
});
