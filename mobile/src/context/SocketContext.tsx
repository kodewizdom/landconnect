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
} from "react-native";
import { io, Socket } from "socket.io-client";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/useAuthStore";
import { storage } from "../utils/storage";
import { MaskedUser, CallType } from "../types/chat";
import { navigate } from "../navigation/navigationRef";

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

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);

  const socketRef = useRef<Socket | null>(null);

  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
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
        if (isMounted) setIncomingCall(data);
      });

      newSocket.on("call:rejected", (data: { callId: string }) => {
        setIncomingCall((current) =>
          current && current.callId === data.callId ? null : current
        );
      });

      newSocket.on("call:ended", (data: { callId: string }) => {
        setIncomingCall((current) =>
          current && current.callId === data.callId ? null : current
        );
      });

      socketRef.current = newSocket;
      if (isMounted) {
        setSocket(newSocket);
      }
    };

    initSocket();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated]);

  const handleAcceptCall = () => {
    if (!incomingCall) return;

    if (socketRef.current) {
      socketRef.current.emit("call:accept", { callId: incomingCall.callId });
    }

    const targetRoomId =
      incomingCall.roomId || `call_${incomingCall.callId}`;
    const callData = { ...incomingCall };
    setIncomingCall(null);

    navigate("CallScreen", {
      roomId: targetRoomId,
      callId: callData.callId,
      callType: callData.callType,
      callerName: callData.caller.full_name,
      isIncoming: true,
    });
  };

  const handleRejectCall = () => {
    if (!incomingCall) return;

    if (socketRef.current) {
      socketRef.current.emit("call:reject", { callId: incomingCall.callId });
    }

    setIncomingCall(null);
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
                {incomingCall?.caller.role?.toUpperCase() || "USER"}
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
