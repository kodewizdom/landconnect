import React, { useEffect, useState } from "react";
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
import { formatRoleLabel } from "../../utils/roleLabel";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const ROLES: Array<{ key: Role; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "buyer", label: formatRoleLabel("buyer"), desc: "Browse plots & initiate calls/chats", icon: "person-outline" },
  { key: "seller", label: formatRoleLabel("seller"), desc: "List & sell your own land", icon: "home-outline" },
  { key: "broker", label: formatRoleLabel("broker"), desc: "List plots & coordinate 3-way meetings", icon: "briefcase-outline" },
];

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("buyer");
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const {
    requestRegistrationOtp,
    verifyRegistrationOtp,
    isLoading,
    error,
    clearError,
  } = useAuthStore();

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      clearError();
    });
    return unsub;
  }, [navigation, clearError]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleRequestOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!name.trim() || !cleanEmail || !password.trim()) {
      Alert.alert("Missing Fields", "Full name, email, and password are required.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Password Too Short", "Password must be at least 6 characters long.");
      return;
    }

    try {
      clearError();
      const res = await requestRegistrationOtp({
        name: name.trim(),
        email: cleanEmail,
        password,
        role: selectedRole,
      });
      setOtp("");
      setResendCooldown(res.resendAfterSeconds || 30);
      setStep("otp");
    } catch (err: any) {
      Alert.alert("Verification Error", err.message || "Could not send verification code.");
    }
  };

  const handleVerifyOtp = async () => {
    const cleanOtp = otp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      Alert.alert("Invalid Code", "Please enter the 6-digit verification code from your email.");
      return;
    }

    try {
      clearError();
      await verifyRegistrationOtp({
        email: email.trim().toLowerCase(),
        otp: cleanOtp,
      });
    } catch (err: any) {
      Alert.alert("Verification Failed", err.message || "Invalid or expired verification code.");
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
        <Text style={styles.brandSubtitle}>
          {step === "details" ? "Create Your Account" : "Verify Your Email"}
        </Text>
        <View style={styles.diamondSeparator} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {step === "details" ? (
            <>
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
                placeholder="e.g. rahul@company.com"
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

              <TouchableOpacity
                style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
                onPress={handleRequestOtp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#C5A059" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    SEND VERIFICATION CODE
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.otpInfoBox}>
                <Ionicons name="mail-open-outline" size={22} color="#C5A059" />
                <View style={styles.otpInfoTextCol}>
                  <Text style={styles.otpInfoTitle}>6-Digit Code Sent</Text>
                  <Text style={styles.otpInfoSub}>
                    Enter the verification code sent to {email.trim().toLowerCase()}. Valid for 10 minutes.
                  </Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>VERIFICATION CODE *</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="000000"
                placeholderTextColor="#9CA5A3"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(text) => {
                  setOtp(text.replace(/[^0-9]/g, ""));
                  if (error) clearError();
                }}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
                onPress={handleVerifyOtp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#C5A059" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    VERIFY & CREATE ACCOUNT
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.otpActionsRow}>
                <TouchableOpacity
                  onPress={() => {
                    clearError();
                    setStep("details");
                  }}
                  disabled={isLoading}
                >
                  <Text style={styles.secondaryLinkText}>Change Email</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleRequestOtp}
                  disabled={isLoading || resendCooldown > 0}
                >
                  <Text
                    style={[
                      styles.secondaryLinkText,
                      resendCooldown > 0 && styles.secondaryLinkDisabled,
                    ]}
                  >
                    {resendCooldown > 0
                      ? `Resend Code (${resendCooldown}s)`
                      : "Resend Code"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => {
              clearError();
              navigation.navigate("Login");
            }}
          >
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
  otpInfoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F5EDD8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6D5AA",
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  otpInfoTextCol: {
    flex: 1,
  },
  otpInfoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0B2B26",
    marginBottom: 4,
  },
  otpInfoSub: {
    fontSize: 12,
    color: "#636B69",
    lineHeight: 18,
  },
  otpInput: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 8,
    textAlign: "center",
    color: "#0B2B26",
  },
  otpActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  secondaryLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0B2B26",
  },
  secondaryLinkDisabled: {
    color: "#9CA5A3",
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
