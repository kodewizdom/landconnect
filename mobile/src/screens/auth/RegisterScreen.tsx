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
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../types/navigation";
import { Role } from "../../types/auth";
import { useAuthStore } from "../../store/useAuthStore";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const ROLES: Array<{ key: Role; label: string; desc: string }> = [
  { key: "buyer", label: "Buyer", desc: "Browse plots & initiate calls/chats" },
  { key: "seller", label: "Seller", desc: "Post & manage your own land listings" },
  { key: "broker", label: "Broker", desc: "List plots & coordinate 3-way meetings" },
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join LandConnect to buy, sell, or broker verified plots</Text>
        </View>

        <View style={styles.formCard}>
          {error && <Text style={styles.errorBanner}>{error}</Text>}

          {/* Role Selection */}
          <Text style={styles.sectionLabel}>Select Your Role</Text>
          <View style={styles.roleContainer}>
            {ROLES.map((r) => {
              const isSelected = selectedRole === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.roleCard, isSelected && styles.roleCardActive]}
                  onPress={() => setSelectedRole(r.key)}
                >
                  <Text style={[styles.roleLabel, isSelected && styles.roleLabelActive]}>
                    {r.label}
                  </Text>
                  <Text style={styles.roleDesc}>{r.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Input Fields */}
          <Text style={styles.inputLabel}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rahul Sharma"
            placeholderTextColor="#999"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) clearError();
            }}
          />

          <Text style={styles.inputLabel}>Email Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. rahul@example.com"
            placeholderTextColor="#999"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) clearError();
            }}
          />

          <Text style={styles.inputLabel}>Password (min 6 characters) *</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) clearError();
            }}
          />

          <Text style={styles.inputLabel}>Phone Number (Optional - Never Shared Publicly)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. +91 9876543210"
            placeholderTextColor="#999"
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
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Register as {selectedRole.toUpperCase()}</Text>
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
    backgroundColor: "#f4f6f8",
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1b5e20",
  },
  subtitle: {
    fontSize: 13,
    color: "#555",
    marginTop: 4,
    textAlign: "center",
  },
  formCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  errorBanner: {
    backgroundColor: "#ffebee",
    color: "#c62828",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 13,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  roleContainer: {
    marginBottom: 16,
  },
  roleCard: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#fafafa",
  },
  roleCardActive: {
    borderColor: "#1b5e20",
    backgroundColor: "#f0f7f0",
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#444",
  },
  roleLabelActive: {
    color: "#1b5e20",
  },
  roleDesc: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d0d7de",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#222",
    backgroundColor: "#fafbfc",
  },
  primaryBtn: {
    backgroundColor: "#1b5e20",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  footerText: {
    color: "#666",
    fontSize: 14,
  },
  footerLink: {
    color: "#1b5e20",
    fontWeight: "bold",
    fontSize: 14,
  },
});
