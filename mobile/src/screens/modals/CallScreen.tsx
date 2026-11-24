import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { useSocket } from "../../context/SocketContext";

type Props = NativeStackScreenProps<RootStackParamList, "CallScreen">;

const { width } = Dimensions.get("window");

export const CallScreen: React.FC<Props> = ({ route, navigation }) => {
  const {
    roomId,
    callId: initialCallId,
    callType,
    callerName,
    receiverName,
    isIncoming = false,
  } = route.params;

  const { socket } = useSocket();

  const [callId, setCallId] = useState<string | undefined>(initialCallId);
  const [callStatus, setCallStatus] = useState<
    "calling" | "ringing" | "connected" | "ended"
  >(isIncoming ? "connected" : "calling");

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === "video");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const counterpartName = isIncoming
    ? callerName || "LandConnect Seller"
    : receiverName || "LandConnect Contact";

  // Check if running inside Expo Go
  const isExpoGo =
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === "storeClient";

  // Socket event listeners for signaling
  useEffect(() => {
    if (!socket) return;

    const handleCallInitiated = (data: { callId: string }) => {
      setCallId(data.callId);
      setCallStatus("ringing");
    };

    const handleCallAccepted = (data: { callId: string }) => {
      setCallId(data.callId);
      setCallStatus("connected");
    };

    const handleCallRejected = () => {
      setCallStatus("ended");
      Alert.alert("Call Declined", "The user was unable to take your call.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    };

    const handleCallEnded = () => {
      setCallStatus("ended");
      navigation.goBack();
    };

    const handleCallFailed = (data: { reason: string }) => {
      Alert.alert("Call Failed", data.reason || "Unable to connect call.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    };

    socket.on("call:initiated", handleCallInitiated);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("call:rejected", handleCallRejected);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:failed", handleCallFailed);

    return () => {
      socket.off("call:initiated", handleCallInitiated);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("call:rejected", handleCallRejected);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:failed", handleCallFailed);
    };
  }, [socket, navigation]);

  // Connected call duration timer
  useEffect(() => {
    if (callStatus === "connected") {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  const handleEndCall = () => {
    if (socket && callId) {
      socket.emit("call:end", { callId });
    }
    setCallStatus("ended");
    navigation.goBack();
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <View style={styles.container}>
      {/* Simulation / Expo Go Guard Banner */}
      {isExpoGo && (
        <View style={styles.expoGuardBadge}>
          <Ionicons name="information-circle" size={14} color="#f59e0b" />
          <Text style={styles.expoGuardText}>
            Expo Go Mode • Real-Time Signaling Active
          </Text>
        </View>
      )}

      {/* Top Header info */}
      <View style={styles.topInfo}>
        <Text style={styles.callTypeTitle}>
          {callType === "video" ? "SECURE VIDEO CALL" : "SECURE AUDIO CALL"}
        </Text>
        <Text style={styles.counterpartName}>{counterpartName}</Text>

        <View style={styles.statusBadge}>
          {callStatus === "connected" && (
            <View style={styles.liveDot} />
          )}
          <Text style={styles.statusText}>
            {callStatus === "calling"
              ? "Connecting..."
              : callStatus === "ringing"
              ? "Ringing..."
              : callStatus === "connected"
              ? `Connected • ${formatTimer(elapsedSeconds)}`
              : "Call Ended"}
          </Text>
        </View>
      </View>

      {/* Center Video / Avatar Area */}
      <View style={styles.centerStage}>
        {callType === "video" && isVideoEnabled ? (
          <View style={styles.videoPlaceholder}>
            <Ionicons name="videocam" size={64} color="#475569" />
            <Text style={styles.videoPlaceholderText}>
              Video Stream Connected
            </Text>
            <Text style={styles.videoRoomSub}>Room: {roomId.slice(0, 8)}...</Text>
          </View>
        ) : (
          <View style={styles.avatarGlow}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={72} color="#ffffff" />
            </View>
          </View>
        )}

        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={16} color="#22c55e" />
          <Text style={styles.securityNoteText}>
            End-to-End Encrypted • Zero-PII Protected
          </Text>
        </View>
      </View>

      {/* Bottom In-Call Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[
              styles.controlBtn,
              isMuted && styles.controlBtnActive,
            ]}
            onPress={() => setIsMuted(!isMuted)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isMuted ? "mic-off" : "mic"}
              size={24}
              color={isMuted ? "#ef4444" : "#ffffff"}
            />
            <Text style={styles.controlLabel}>{isMuted ? "Unmute" : "Mute"}</Text>
          </TouchableOpacity>

          {callType === "video" && (
            <TouchableOpacity
              style={[
                styles.controlBtn,
                !isVideoEnabled && styles.controlBtnActive,
              ]}
              onPress={() => setIsVideoEnabled(!isVideoEnabled)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isVideoEnabled ? "videocam" : "videocam-off"}
                size={24}
                color={!isVideoEnabled ? "#ef4444" : "#ffffff"}
              />
              <Text style={styles.controlLabel}>
                {isVideoEnabled ? "Stop Video" : "Start Video"}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.controlBtn,
              !isSpeakerOn && styles.controlBtnActive,
            ]}
            onPress={() => setIsSpeakerOn(!isSpeakerOn)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isSpeakerOn ? "volume-high" : "volume-mute"}
              size={24}
              color="#ffffff"
            />
            <Text style={styles.controlLabel}>
              {isSpeakerOn ? "Speaker" : "Earpiece"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* End Call Button */}
        <TouchableOpacity
          style={styles.endCallBtn}
          onPress={handleEndCall}
          activeOpacity={0.8}
        >
          <Ionicons name="call" size={32} color="#ffffff" style={styles.hangupIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  expoGuardBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 8,
    gap: 6,
  },
  expoGuardText: {
    color: "#f59e0b",
    fontSize: 11,
    fontWeight: "600",
  },
  topInfo: {
    alignItems: "center",
  },
  callTypeTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  counterpartName: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#cbd5e1",
  },
  centerStage: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  avatarGlow: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(27, 94, 32, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  avatarCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: "#1b5e20",
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlaceholder: {
    width: width - 48,
    height: (width - 48) * 0.75,
    backgroundColor: "#1e293b",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#334155",
  },
  videoPlaceholderText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#cbd5e1",
    marginTop: 12,
  },
  videoRoomSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  securityNoteText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  controlsContainer: {
    width: "100%",
    alignItems: "center",
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 36,
  },
  controlBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#1e293b",
  },
  controlBtnActive: {
    backgroundColor: "#334155",
  },
  controlLabel: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 4,
    fontWeight: "600",
  },
  endCallBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  hangupIcon: {
    transform: [{ rotate: "135deg" }],
  },
});
