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
import { authApi } from "../../api/auth.api";

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;

export const ResetPasswordScreen: React.FC<Props> = ({ route, navigation }) => {
  const initialEmail = route.params?.email || "";
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim() || !otp.trim() || !newPassword.trim()) {
      Alert.alert("Missing Information", "Please enter your email, OTP, and new password.");
      return;
    }

    if (otp.trim().length !== 6) {
      Alert.alert("Invalid OTP", "OTP code must be exactly 6 digits.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Password Too Short", "New password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.resetPassword({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
      });

      Alert.alert("Success", res.message || "Password updated successfully.", [
        {
          text: "Log In Now",
          onPress: () => navigation.navigate("Login"),
        },
      ]);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Reset failed. Please verify the OTP code.";
      Alert.alert("Reset Error", msg);
    } finally {
      setIsLoading(false);
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
        <Text style={styles.brandSubtitle}>Reset Password</Text>
        <View style={styles.diamondSeparator} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.instructionText}>
          Enter the 6-digit OTP code sent to your email and set a new password.
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. user@landconnect.com"
            placeholderTextColor="#9CA5A3"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.inputLabel}>6-DIGIT OTP CODE</Text>
          <TextInput
            style={[styles.input, styles.otpInput]}
            placeholder="123456"
            placeholderTextColor="#9CA5A3"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
          />

          <Text style={styles.inputLabel}>NEW PASSWORD (MIN 6 CHARS)</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#9CA5A3"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#C5A059" />
            ) : (
              <Text style={styles.primaryBtnText}>Reset Password</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.backBtnText}>Return to Login</Text>
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
    paddingTop: 24,
    paddingBottom: 40,
  },
  instructionText: {
    fontSize: 14,
    color: "#636B69",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
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
    marginBottom: 4,
  },
  otpInput: {
    fontSize: 20,
    letterSpacing: 6,
    textAlign: "center",
    fontWeight: "700",
    color: "#C5A059",
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
  backBtn: {
    marginTop: 16,
    alignItems: "center",
  },
  backBtnText: {
    color: "#C5A059",
    fontSize: 14,
    fontWeight: "600",
  },
});
