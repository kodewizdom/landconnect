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
      {/* Header Crest Block */}
      <View style={styles.crestHeader}>
        <Text style={styles.brandTitle}>LANDCONNECT</Text>
        <Text style={styles.brandSubtitle}>Forgot Password</Text>
        <View style={styles.diamondSeparator} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.instructionText}>
          Enter your registered email address to receive a 6-digit reset code.
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>REGISTERED EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. user@landconnect.com"
            placeholderTextColor="#9CA5A3"
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
              <ActivityIndicator color="#C5A059" />
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
  },
  input: {
    borderBottomWidth: 1.5,
    borderColor: "#E6E2D8",
    paddingVertical: 10,
    fontSize: 15,
    color: "#181C1B",
    backgroundColor: "transparent",
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: "#0B2B26",
    borderRadius: 10,
    paddingVertical: 15,
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
