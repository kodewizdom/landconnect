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
import { useAuthStore } from "../../store/useAuthStore";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async (loginEmail?: string, loginPassword?: string) => {
    const targetEmail = loginEmail || email;
    const targetPassword = loginPassword || password;

    if (!targetEmail.trim() || !targetPassword.trim()) {
      Alert.alert("Required Fields", "Please enter your email and password.");
      return;
    }

    try {
      clearError();
      await login({
        email: targetEmail.trim().toLowerCase(),
        password: targetPassword,
      });
    } catch (err: any) {
      Alert.alert("Login Error", err.message || "Could not log in");
    }
  };

  const handleQuickDemoFill = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword("Password@123");
    handleLogin(roleEmail, "Password@123");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Branding */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>LandConnect</Text>
          <Text style={styles.brandSubtitle}>Direct Land Deals with Zero Privacy Exposure</Text>
        </View>

        {/* Demo Fast-Login Chips */}
        <View style={styles.demoSection}>
          <Text style={styles.demoSectionTitle}>⚡ Quick Demo Sign-In (Password@123):</Text>
          <View style={styles.demoChipsRow}>
            <TouchableOpacity
              style={[styles.demoChip, { borderColor: "#2e7d32", backgroundColor: "#e8f5e9" }]}
              onPress={() => handleQuickDemoFill("buyer@landconnect.com")}
            >
              <Text style={[styles.demoChipText, { color: "#1b5e20" }]}>🟢 Buyer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoChip, { borderColor: "#f57c00", backgroundColor: "#fff3e0" }]}
              onPress={() => handleQuickDemoFill("seller@landconnect.com")}
            >
              <Text style={[styles.demoChipText, { color: "#e65100" }]}>🟡 Seller</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoChip, { borderColor: "#1976d2", backgroundColor: "#e3f2fd" }]}
              onPress={() => handleQuickDemoFill("broker@landconnect.com")}
            >
              <Text style={[styles.demoChipText, { color: "#0d47a1" }]}>🔵 Broker</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.formCard}>
          {error && <Text style={styles.errorBanner}>{error}</Text>}

          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. buyer@landconnect.com"
            placeholderTextColor="#999"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) clearError();
            }}
          />

          <Text style={styles.inputLabel}>Password</Text>
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

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigation.navigate("ForgotPassword")}
          >
            <Text style={styles.forgotBtnText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
            onPress={() => handleLogin()}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Log In</Text>
            )}
          </TouchableOpacity>

          {/* Google Sign-In */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={() =>
              Alert.alert(
                "Google Sign-In",
                "Google OAuth 2.0 flow is configured via google-auth-library on the backend."
              )
            }
          >
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Footer navigation */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text style={styles.footerLink}>Register now</Text>
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
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1b5e20",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: "#555",
    marginTop: 6,
    textAlign: "center",
  },
  demoSection: {
    marginBottom: 20,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  demoSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#444",
    marginBottom: 10,
  },
  demoChipsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  demoChip: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  demoChipText: {
    fontSize: 12,
    fontWeight: "700",
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
    paddingVertical: 12,
    fontSize: 15,
    color: "#222",
    backgroundColor: "#fafbfc",
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: 16,
  },
  forgotBtnText: {
    fontSize: 13,
    color: "#1b5e20",
    fontWeight: "600",
  },
  primaryBtn: {
    backgroundColor: "#1b5e20",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  googleBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  googleBtnText: {
    color: "#333",
    fontSize: 15,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 20,
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
