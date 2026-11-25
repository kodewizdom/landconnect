import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Vibration,
} from "react-native";
import { io, Socket } from "socket.io-client";
import { Ionicons } from "@expo/vector-icons";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import * as Notifications from "expo-notifications";
import { useAuthStore } from "../store/useAuthStore";
import { storage } from "../utils/storage";
import { MaskedUser, CallType } from "../types/chat";
import { navigate } from "../navigation/navigationRef";
import { formatRoleBadge } from "../utils/roleLabel";
import {
  requestCallPermissions,
  requestNotificationPermission,
} from "../utils/callPermissions";

// Configure foreground notification display cleanly
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (err) {
  console.warn("[Notifications] Foreground handler warning:", err);
}

const INCOMING_CALL_CHANNEL_ID = "incoming-calls";

export interface IncomingCallData {
  callId: string;
  caller: MaskedUser;
  callType: CallType;
  roomId?: string;
}

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  incomingCall: IncomingCallData | null;
  clearIncomingCall: () => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  incomingCall: null,
  clearIncomingCall: () => {},
});

export const useSocket = () => useContext(SocketContext);

const { width } = Dimensions.get("window");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RINGTONE_ASSET = require("../../assets/sounds/ringtone.wav");

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const ringtonePlayerRef = useRef<AudioPlayer | null>(null);
  const activeNotificationIdRef = useRef<string | null>(null);

  const stopIncomingAlert = useCallback(async () => {
    try {
      Vibration.cancel();
    } catch {}

    if (ringtonePlayerRef.current) {
      try {
        ringtonePlayerRef.current.pause();
        ringtonePlayerRef.current.remove();
      } catch {}
      ringtonePlayerRef.current = null;
    }

    if (activeNotificationIdRef.current) {
      const notifId = activeNotificationIdRef.current;
      activeNotificationIdRef.current = null;
      try {
        await Notifications.dismissNotificationAsync(notifId);
      } catch {}
    }
  }, []);

  const startIncomingAlert = useCallback(
    async (data: IncomingCallData) => {
      // Stop any stale ringtone first
      await stopIncomingAlert();

      // 1. Play ringtone.wav in a continuous loop via expo-audio
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: "duckOthers",
        });
        const player = createAudioPlayer(RINGTONE_ASSET);
        player.loop = true;
        player.volume = 1.0;
        player.play();
        ringtonePlayerRef.current = player;
      } catch (err) {
        console.warn("[Ringtone] Failed to start incoming ringtone:", err);
      }

      // 2. Start repeating haptic vibration pattern
      try {
        Vibration.vibrate([0, 800, 600], true);
      } catch (err) {
        console.warn("[Vibration] Failed to start vibration:", err);
      }

      // 3. Fire high-importance local notification (surfaces sound/banner if minimized)
      try {
        const callerRole = formatRoleBadge(data.caller?.role);
        const callLabel = data.callType === "video" ? "Video" : "Audio";
        const notifId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `Incoming ${callLabel} Call`,
            body: `${data.caller?.full_name || "LandConnect User"} (${callerRole})`,
            sound: "ringtone.wav",
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: {
              callId: data.callId,
              roomId: data.roomId || "",
              callType: data.callType,
            },
          },
          trigger:
            Platform.OS === "android"
              ? { channelId: INCOMING_CALL_CHANNEL_ID }
              : null,
        });
        activeNotificationIdRef.current = notifId;
      } catch (err) {
        console.warn("[Notifications] Failed to present incoming call notification:", err);
      }
    },
    [stopIncomingAlert]
  );

  const clearIncomingCall = useCallback(() => {
    stopIncomingAlert();
    setIncomingCall(null);
  }, [stopIncomingAlert]);

  // Configure Android Notification Channel & request POST_NOTIFICATIONS on login
  useEffect(() => {
    if (!isAuthenticated) return;

    const setupNotifications = async () => {
      await requestNotificationPermission();

      if (Platform.OS === "android") {
        try {
          await Notifications.setNotificationChannelAsync(INCOMING_CALL_CHANNEL_ID, {
            name: "Incoming Calls",
            importance: Notifications.AndroidImportance.MAX,
            sound: "ringtone.wav",
            vibrationPattern: [0, 800, 600],
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            bypassDnd: true,
          });
        } catch (err) {
          console.warn("[Notifications] Channel setup warning:", err);
        }
      }
    };

    setupNotifications();
  }, [isAuthenticated]);

  useEffect(() => {
    let isMounted = true;

    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      stopIncomingAlert();
      setSocket(null);
      setIsConnected(false);
      setIncomingCall(null);
      return;
    }

    const initSocket = async () => {
      const token = await storage.getItem("landconnect_access_token");
      if (!token || !isMounted) return;

      const defaultUrl = process.env.EXPO_PUBLIC_API_URL
        ? process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, "")
        : "http://localhost:5000";

      const socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL || defaultUrl;

      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      newSocket.on("connect", () => {
        if (isMounted) setIsConnected(true);
      });

      newSocket.on("disconnect", () => {
        if (isMounted) setIsConnected(false);
      });

      newSocket.on("call:incoming", (data: IncomingCallData) => {
        if (!isMounted) return;
        setIncomingCall(data);
        startIncomingAlert(data);
      });

      const handleDismissIncoming = (data: { callId?: string }) => {
        setIncomingCall((current) => {
          if (current && (!data?.callId || current.callId === data.callId)) {
            stopIncomingAlert();
            return null;
          }
          return current;
        });
      };

      newSocket.on("call:rejected", handleDismissIncoming);
      newSocket.on("call:ended", handleDismissIncoming);
      newSocket.on("call:cancelled", handleDismissIncoming);

      socketRef.current = newSocket;
      if (isMounted) {
        setSocket(newSocket);
      }
    };

    initSocket();

    return () => {
      isMounted = false;
      stopIncomingAlert();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, startIncomingAlert, stopIncomingAlert]);

  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    const callData = { ...incomingCall };
    await stopIncomingAlert();
    setIncomingCall(null);

    // Explicitly request Android runtime permissions before answering
    const permissionsGranted = await requestCallPermissions(callData.callType);
    if (!permissionsGranted) {
      if (socketRef.current) {
        socketRef.current.emit("call:reject", { callId: callData.callId });
      }
      return;
    }

    if (socketRef.current) {
      socketRef.current.emit("call:accept", { callId: callData.callId });
    }

    const targetRoomId = callData.roomId || `call_${callData.callId}`;

    navigate("CallScreen", {
      roomId: targetRoomId,
      callId: callData.callId,
      callType: callData.callType,
      callerName: callData.caller.full_name,
      isIncoming: true,
    });
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;

    const targetCallId = incomingCall.callId;
    await stopIncomingAlert();
    setIncomingCall(null);

    if (socketRef.current) {
      socketRef.current.emit("call:reject", { callId: targetCallId });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        incomingCall,
        clearIncomingCall,
      }}
    >
      {children}

      {/* Global Incoming Call Modal Banner */}
      <Modal
        visible={incomingCall !== null}
        transparent
        animationType="slide"
        onRequestClose={handleRejectCall}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.callCard}>
            <View style={styles.callerIconContainer}>
              <Ionicons
                name={
                  incomingCall?.callType === "video"
                    ? "videocam"
                    : "call"
                }
                size={36}
                color="#ffffff"
              />
            </View>

            <Text style={styles.callTypeLabel}>
              Incoming {incomingCall?.callType === "video" ? "Video" : "Audio"} Call
            </Text>

            <Text style={styles.callerName}>
              {incomingCall?.caller.full_name || "LandConnect User"}
            </Text>

            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {formatRoleBadge(incomingCall?.caller.role)}
              </Text>
            </View>

            <Text style={styles.ringingText}>Zero-PII Secure Call Ringing...</Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={handleRejectCall}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={28} color="#ffffff" />
                <Text style={styles.actionText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={handleAcceptCall}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={28} color="#ffffff" />
                <Text style={styles.actionText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SocketContext.Provider>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(11, 43, 38, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  callCard: {
    width: width - 48,
    backgroundColor: "#143D36",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#C5A059",
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  callerIconContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#0B2B26",
    borderWidth: 1.5,
    borderColor: "#C5A059",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  callTypeLabel: {
    fontSize: 12,
    color: "#C5A059",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  callerName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: "#F5EDD8",
    borderWidth: 1,
    borderColor: "#E6E2D8",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92610A",
    letterSpacing: 0.8,
  },
  ringingText: {
    fontSize: 12,
    color: "#C5A059",
    fontWeight: "600",
    marginBottom: 32,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 32,
    minWidth: 120,
  },
  rejectBtn: {
    backgroundColor: "#8B1A1A",
  },
  acceptBtn: {
    backgroundColor: "#1A6B45",
  },
  actionText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
    marginLeft: 8,
  },
});
