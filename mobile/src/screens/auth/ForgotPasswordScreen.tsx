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

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email.trim()) {
      Alert.alert("Required", "Please enter your registered email address.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.forgotPassword(email.trim().toLowerCase());
      Alert.alert("OTP Sent", res.message || "A 6-digit verification code has been sent to your email.", [
        {
          text: "Enter OTP",
          onPress: () =>
            navigation.navigate("ResetPassword", { email: email.trim().toLowerCase() }),
        },
      ]);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to send reset code. Please try again.";
      Alert.alert("Error", msg);
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
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          Enter your registered email address to receive a 6-digit reset code.
        </Text>

        <View style={styles.card}>
          <Text style={styles.inputLabel}>Registered Email</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. user@landconnect.com"
            placeholderTextColor="#999"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
            onPress={handleSendOtp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Send 6-Digit OTP</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>Back to Login</Text>
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
    marginBottom: 16,
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
