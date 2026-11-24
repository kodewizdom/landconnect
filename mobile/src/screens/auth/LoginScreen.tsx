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
      {/* Header Crest Block */}
      <View style={styles.crestHeader}>
        <Text style={styles.brandTitle}>LANDCONNECT</Text>
        <Text style={styles.brandSubtitle}>Private Land Marketplace</Text>
        <View style={styles.diamondSeparator} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Demo Access Section */}
        <View style={styles.demoSection}>
          <Text style={styles.demoEyebrow}>QUICK DEMO ACCESS</Text>
          <View style={styles.demoChipsRow}>
            <TouchableOpacity
              style={styles.demoPill}
              onPress={() => handleQuickDemoFill("buyer@landconnect.com")}
            >
              <Ionicons name="person-outline" size={14} color="#0B2B26" />
              <Text style={styles.demoPillText}>Buyer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoPill}
              onPress={() => handleQuickDemoFill("seller@landconnect.com")}
            >
              <Ionicons name="home-outline" size={14} color="#0B2B26" />
              <Text style={styles.demoPillText}>Seller</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoPill}
              onPress={() => handleQuickDemoFill("broker@landconnect.com")}
            >
              <Ionicons name="briefcase-outline" size={14} color="#0B2B26" />
              <Text style={styles.demoPillText}>Broker</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. buyer@landconnect.com"
            placeholderTextColor="#9CA5A3"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) clearError();
            }}
          />

          <Text style={styles.inputLabel}>PASSWORD</Text>
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
              <ActivityIndicator color="#C5A059" />
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

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>New member? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text style={styles.footerLink}>Create Account</Text>
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
  demoSection: {
    marginBottom: 16,
  },
  demoEyebrow: {
    letterSpacing: 1.2,
    fontSize: 10,
    fontWeight: "700",
    color: "#636B69",
    marginBottom: 10,
  },
  demoChipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  demoPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E6E2D8",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
  },
  demoPillText: {
    color: "#181C1B",
    fontSize: 13,
    fontWeight: "600",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginTop: 16,
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
  forgotBtn: {
    alignSelf: "flex-end",
    marginTop: 10,
    marginBottom: 4,
  },
  forgotBtnText: {
    fontSize: 13,
    color: "#C5A059",
    fontWeight: "600",
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
  googleBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E6E2D8",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  googleBtnText: {
    color: "#636B69",
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
    color: "#636B69",
    fontSize: 14,
  },
  footerLink: {
    color: "#C5A059",
    fontWeight: "700",
    fontSize: 14,
  },
});
