import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../types/navigation";
import { Role } from "../../types/auth";
import { useAuthStore } from "../../store/useAuthStore";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const ROLES: Array<{ key: Role; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "buyer", label: "Buyer", desc: "Browse plots & initiate calls/chats", icon: "person-outline" },
  { key: "seller", label: "Seller", desc: "Post & manage your own land listings", icon: "home-outline" },
  { key: "broker", label: "Broker", desc: "List plots & coordinate 3-way meetings", icon: "briefcase-outline" },
];

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("buyer");

  const { register, isLoading, error, clearError } = useAuthStore();

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Full name, email, and password are required.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Password Too Short", "Password must be at least 6 characters long.");
      return;
    }

    try {
      clearError();
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: selectedRole,
        phone: phone.trim() || undefined,
      });
    } catch (err: any) {
      Alert.alert("Registration Error", err.message || "Could not register account");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Header Crest Block */}
      <View style={styles.crestHeader}>
        <Text style={styles.brandTitle}>LANDCONNECT</Text>
        <Text style={styles.brandSubtitle}>Create Your Account</Text>
        <View style={styles.diamondSeparator} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* Role Selection */}
          <Text style={styles.sectionLabel}>SELECT YOUR ROLE</Text>
          <View style={styles.roleContainer}>
            {ROLES.map((r) => {
              const isSelected = selectedRole === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.roleCard, isSelected && styles.roleCardActive]}
                  onPress={() => setSelectedRole(r.key)}
                >
                  <Ionicons
                    name={r.icon}
                    size={20}
                    color={isSelected ? "#C5A059" : "#636B69"}
                    style={styles.roleIcon}
                  />
                  <View style={styles.roleTextColumn}>
                    <Text style={[styles.roleLabel, isSelected && styles.roleLabelActive]}>
                      {r.label}
                    </Text>
                    <Text style={styles.roleDesc}>{r.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Input Fields */}
          <Text style={styles.inputLabel}>FULL NAME *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rahul Sharma"
            placeholderTextColor="#9CA5A3"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) clearError();
            }}
          />

          <Text style={styles.inputLabel}>EMAIL ADDRESS *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. rahul@example.com"
            placeholderTextColor="#9CA5A3"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) clearError();
            }}
          />

          <Text style={styles.inputLabel}>PASSWORD (MIN 6 CHARACTERS) *</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#9CA5A3"
            secureTextEntry
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) clearError();
            }}
          />

          <Text style={styles.inputLabel}>PHONE NUMBER (OPTIONAL — NEVER SHARED PUBLICLY)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. +91 9876543210"
            placeholderTextColor="#9CA5A3"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#C5A059" />
            ) : (
              <Text style={styles.primaryBtnText}>
                REGISTER AS {selectedRole.toUpperCase()}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.footerLink}>Log in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7F4",
  },
  crestHeader: {
    backgroundColor: "#0B2B26",
    paddingTop: 60,
    paddingBottom: 36,
    alignItems: "center",
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 4,
    color: "#C5A059",
  },
  brandSubtitle: {
    fontSize: 12,
    color: "rgba(197,160,89,0.7)",
    marginTop: 4,
    letterSpacing: 1.5,
  },
  diamondSeparator: {
    width: 8,
    height: 8,
    backgroundColor: "#C5A059",
    transform: [{ rotate: "45deg" }],
    marginTop: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    color: "#8B1A1A",
    fontSize: 13,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#636B69",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  roleContainer: {
    marginBottom: 16,
  },
  roleCard: {
    borderWidth: 1.5,
    borderColor: "#E6E2D8",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    backgroundColor: "#F8F7F4",
    flexDirection: "row",
    alignItems: "center",
  },
  roleCardActive: {
    borderColor: "#C5A059",
    backgroundColor: "#F5EDD8",
  },
  roleIcon: {
    marginRight: 12,
  },
  roleTextColumn: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#181C1B",
  },
  roleLabelActive: {
    color: "#0B2B26",
  },
  roleDesc: {
    fontSize: 12,
    color: "#636B69",
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#636B69",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderBottomWidth: 1.5,
    borderColor: "#E6E2D8",
    paddingVertical: 10,
    fontSize: 15,
    color: "#181C1B",
    backgroundColor: "transparent",
  },
  primaryBtn: {
    backgroundColor: "#0B2B26",
    borderRadius: 10,
    paddingVertical: 15,
    marginTop: 24,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  footerText: {
    color: "#636B69",
    fontSize: 14,
  },
  footerLink: {
    color: "#C5A059",
    fontWeight: "700",
    fontSize: 14,
  },
});
