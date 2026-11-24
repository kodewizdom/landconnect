import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
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

      Alert.alert("Success", res.message || "Password updated successfully!", [
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
      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit OTP code sent to your email and set a new password.
        </Text>

        <View style={styles.card}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. user@landconnect.com"
            placeholderTextColor="#999"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.inputLabel}>6-Digit OTP Code</Text>
          <TextInput
            style={[styles.input, styles.otpInput]}
            placeholder="123456"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
          />

          <Text style={styles.inputLabel}>New Password (min 6 chars)</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#999"
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
              <ActivityIndicator color="#fff" />
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
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
    justifyContent: "center",
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1b5e20",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    marginTop: 6,
    marginBottom: 20,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    marginTop: 4,
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
    marginBottom: 10,
  },
  otpInput: {
    fontSize: 20,
    letterSpacing: 6,
    textAlign: "center",
    fontWeight: "bold",
    color: "#1b5e20",
  },
  primaryBtn: {
    backgroundColor: "#1b5e20",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  backBtn: {
    marginTop: 14,
    alignItems: "center",
  },
  backBtnText: {
    color: "#1b5e20",
    fontSize: 14,
    fontWeight: "600",
  },
});
