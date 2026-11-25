import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  findNodeHandle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { useSocket } from "../../context/SocketContext";
import { useAuthStore } from "../../store/useAuthStore";
import { callApi } from "../../api/call.api";
import { zegoService, ZegoRemoteStreamInfo, AudioRouteKind } from "../../services/zego";
import {
  requestCallPermissions,
  requestCameraPermission,
} from "../../utils/callPermissions";

type Props = NativeStackScreenProps<RootStackParamList, "CallScreen">;

type NativeEnginePhase =
  | "initializing"
  | "connecting_room"
  | "waiting_stream"
  | "connected"
  | "error";

const { width } = Dimensions.get("window");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DIALTONE_ASSET = require("../../../assets/sounds/dialtone.wav");

export const CallScreen: React.FC<Props> = ({ route, navigation }) => {
  const {
    roomId,
    callId: initialCallId,
    callType,
    callerName,
    receiverName,
    isIncoming = false,
  } = route.params;

  const insets = useSafeAreaInsets();
  const { socket, consumePendingCallError } = useSocket();
  const { user: currentUser } = useAuthStore();

  // Only show the simulated UI inside Expo Go
  const isExpoGo = Constants.appOwnership === "expo";

  // Socket signaling state
  const [callId, setCallId] = useState<string | undefined>(initialCallId);
  const [callStatus, setCallStatus] = useState<
    "calling" | "ringing" | "connected" | "ended"
  >(isIncoming ? "connected" : "calling");

  // Real Zego engine state (used when !isExpoGo)
  const [enginePhase, setEnginePhase] = useState<NativeEnginePhase>("initializing");
  const [zegoError, setZegoError] = useState<{ code?: number; message: string } | null>(
    null
  );
  const [remoteStreams, setRemoteStreams] = useState<ZegoRemoteStreamInfo[]>([]);

  // Active call controls state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [audioRoute, setAudioRoute] = useState<AudioRouteKind>(
    callType === "video" ? "speaker" : "earpiece"
  );
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === "video");
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dialtonePlayerRef = useRef<AudioPlayer | null>(null);
  const localVideoRef = useRef<any>(null);
  const remoteVideoRefs = useRef<Record<string, any>>({});
  const boundRemoteTagsRef = useRef<Record<string, number>>({});
  const boundLocalPreviewTagRef = useRef<number | null>(null);
  const hasCleanedUpRef = useRef(false);
  const hasStartedZegoRef = useRef(false);

  const counterpartName = isIncoming
    ? callerName || "LandConnect Member"
    : receiverName || "LandConnect Contact";

  const initials = counterpartName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0] || "")
    .join("")
    .toUpperCase();

  const stopDialtone = useCallback(async () => {
    if (dialtonePlayerRef.current) {
      const player = dialtonePlayerRef.current;
      dialtonePlayerRef.current = null;
      try {
        player.pause();
        player.remove();
      } catch {}
    }
  }, []);

  const startDialtone = useCallback(async () => {
    if (isIncoming) return;
    await stopDialtone();
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: "mixWithOthers",
      });
      const player = createAudioPlayer(DIALTONE_ASSET);
      player.loop = true;
      player.volume = 0.35;
      player.play();
      dialtonePlayerRef.current = player;
    } catch (err) {
      console.warn("[Dialtone] Playback warning:", err);
    }
  }, [isIncoming, stopDialtone]);

  // Outgoing dialtone lifecycle (plays only while ringing before Zego VoIP starts)
  useEffect(() => {
    if (
      !isIncoming &&
      (callStatus === "calling" || callStatus === "ringing") &&
      remoteStreams.length === 0
    ) {
      startDialtone();
    } else {
      stopDialtone();
    }

    return () => {
      stopDialtone();
    };
  }, [isIncoming, callStatus, remoteStreams.length, startDialtone, stopDialtone]);

  // Native ZegoCloud Engine startup (after expo-audio dialtone/ringtone is fully unloaded)
  const startZegoEngine = useCallback(async () => {
    if (isExpoGo) return;

    // Guarantee expo-audio media players are stopped and unloaded before Zego acquires VoIP audio focus
    await stopDialtone();

    setZegoError(null);
    setEnginePhase("initializing");
    boundLocalPreviewTagRef.current = null;
    boundRemoteTagsRef.current = {};

    try {
      const permissionsOk = await requestCallPermissions(callType);
      if (!permissionsOk) {
        setZegoError({
          message: "Microphone/Camera permission was denied. Enable permissions in Settings.",
        });
        setEnginePhase("error");
        return;
      }

      const tokenRes = await callApi.getToken(roomId);
      const effectiveAppId = Number(
        tokenRes.appId || process.env.EXPO_PUBLIC_ZEGO_APP_ID || 0
      );
      const targetRoomId = tokenRes.roomId || roomId;

      setEnginePhase("connecting_room");

      const joinResult = await zegoService.initAndJoinRoom({
        appId: effectiveAppId,
        roomId: targetRoomId,
        userId: currentUser?.id || tokenRes.userId || "user",
        userName: currentUser?.full_name || "LandConnect Member",
        token: tokenRes.token,
        callType,
        callbacks: {
          onRoomStateUpdate: (_rId, state, errorCode) => {
            if (errorCode !== 0) {
              setZegoError({
                code: errorCode,
                message: `Room state error (code ${errorCode}).`,
              });
              setEnginePhase("error");
              return;
            }
            // ZegoRoomState.Connected === 2
            if (state === 2) {
              setEnginePhase((prev) =>
                prev === "connected" ? "connected" : "waiting_stream"
              );
            }
          },
          onRoomStreamUpdate: (_rId, updateType, streams) => {
            if (updateType === "ADD") {
              stopDialtone();
              setRemoteStreams((prev) => {
                const map = new Map(prev.map((s) => [s.streamID, s]));
                streams.forEach((s) => map.set(s.streamID, s));
                return Array.from(map.values());
              });
              setCallStatus("connected");
              setEnginePhase("connected");

              // Start audio/initial stream playback immediately; video canvas attaches via onLayout
              streams.forEach((s) => {
                const viewRef = remoteVideoRefs.current[s.streamID];
                zegoService.startPlayingRemoteStream(s.streamID, viewRef);
              });
            } else {
              streams.forEach((s) => {
                zegoService.stopPlayingRemoteStream(s.streamID);
                delete boundRemoteTagsRef.current[s.streamID];
              });
              setRemoteStreams((prev) => {
                const remaining = prev.filter(
                  (p) => !streams.some((removed) => removed.streamID === p.streamID)
                );
                if (remaining.length === 0) {
                  setEnginePhase((phase) =>
                    phase === "connected" ? "waiting_stream" : phase
                  );
                }
                return remaining;
              });
            }
          },
          onPublisherStateUpdate: (_streamID, _state, errorCode) => {
            if (errorCode !== 0) {
              setZegoError({
                code: errorCode,
                message: `Audio/Video publishing failed (Zego errorCode ${errorCode}).`,
              });
              setEnginePhase("error");
            }
          },
          onPlayerStateUpdate: (_streamID, _state, errorCode) => {
            if (errorCode !== 0) {
              setZegoError({
                code: errorCode,
                message: `Remote stream playback error (Zego errorCode ${errorCode}).`,
              });
            }
          },
          onAudioRouteChange: (route) => {
            setAudioRoute(route);
          },
          onDebugError: (errorCode, funcName, info) => {
            if (errorCode !== 0) {
              console.warn(`[Zego debugError] ${funcName} (${errorCode}): ${info}`);
            }
          },
        },
      });

      setAudioRoute(joinResult.initialAudioRoute);
      setEnginePhase((prev) =>
        prev === "connected" ? "connected" : "waiting_stream"
      );

      // Attach local camera preview if video view already mounted
      if (callType === "video" && localVideoRef.current) {
        const tag = findNodeHandle(localVideoRef.current);
        if (tag) {
          boundLocalPreviewTagRef.current = tag;
          await zegoService.startLocalPreview(localVideoRef.current);
        }
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to initialize native calling engine.";
      setZegoError({ message: msg });
      setEnginePhase("error");
    }
  }, [isExpoGo, callType, roomId, currentUser?.id, currentUser?.full_name, stopDialtone]);

  useEffect(() => {
    const earlyFailure = consumePendingCallError();
    if (earlyFailure) {
      hasCleanedUpRef.current = true;
      stopDialtone();
      Alert.alert("Call Failed", earlyFailure, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
      return;
    }

    if (!isExpoGo && (isIncoming || callStatus === "connected") && !hasStartedZegoRef.current) {
      hasStartedZegoRef.current = true;
      startZegoEngine();
    }
  }, [
    consumePendingCallError,
    isExpoGo,
    isIncoming,
    callStatus,
    navigation,
    startZegoEngine,
    stopDialtone,
  ]);

  useEffect(() => {
    return () => {
      if (!hasCleanedUpRef.current) {
        hasCleanedUpRef.current = true;
        stopDialtone();
        if (!isExpoGo) {
          zegoService.destroy();
        }
      }
    };
  }, [isExpoGo, stopDialtone]);

  // Socket event listeners for signaling
  useEffect(() => {
    if (!socket) return;

    const handleCallInitiated = (data: { callId: string }) => {
      setCallId(data.callId);
      setCallStatus("ringing");
    };

    const handleCallAccepted = (data: { callId: string }) => {
      setCallId(data.callId);
      stopDialtone();
      setCallStatus("connected");
    };

    const handleCallRejected = () => {
      stopDialtone();
      setCallStatus("ended");
      if (!isExpoGo) zegoService.destroy();
      Alert.alert("Call Declined", "The recipient declined your call.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    };

    const handleCallEnded = () => {
      stopDialtone();
      setCallStatus("ended");
      if (!isExpoGo) zegoService.destroy();
      navigation.goBack();
    };

    const handleCallFailed = (data: { reason: string }) => {
      stopDialtone();
      if (!isExpoGo) zegoService.destroy();
      Alert.alert("Call Failed", data.reason || "Unable to connect call.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    };

    socket.on("call:initiated", handleCallInitiated);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("call:rejected", handleCallRejected);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:cancelled", handleCallEnded);
    socket.on("call:failed", handleCallFailed);

    return () => {
      socket.off("call:initiated", handleCallInitiated);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("call:rejected", handleCallRejected);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:cancelled", handleCallEnded);
      socket.off("call:failed", handleCallFailed);
    };
  }, [socket, navigation, isExpoGo, stopDialtone]);

  // Connected duration timer: real stream in APK, simulated connected state in Expo Go
  const isTimerActive = isExpoGo
    ? callStatus === "connected"
    : enginePhase === "connected";

  useEffect(() => {
    if (isTimerActive) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerActive]);

  // View layout binders for ZegoTextureView
  const handleLocalViewLayout = useCallback(() => {
    if (isExpoGo || !isVideoEnabled || !localVideoRef.current) return;
    const tag = findNodeHandle(localVideoRef.current);
    if (tag && boundLocalPreviewTagRef.current !== tag) {
      boundLocalPreviewTagRef.current = tag;
      zegoService.startLocalPreview(localVideoRef.current);
    }
  }, [isExpoGo, isVideoEnabled]);

  const handleRemoteViewLayout = useCallback(
    (streamID: string) => {
      if (isExpoGo || !isVideoEnabled) return;
      const viewRef = remoteVideoRefs.current[streamID];
      if (!viewRef) return;
      const tag = findNodeHandle(viewRef);
      if (tag && boundRemoteTagsRef.current[streamID] !== tag) {
        boundRemoteTagsRef.current[streamID] = tag;
        zegoService.startPlayingRemoteStream(streamID, viewRef);
      }
    },
    [isExpoGo, isVideoEnabled]
  );

  // Control handlers wired directly to ZegoExpressEngine
  const handleToggleMute = async () => {
    const next = !isMuted;
    setIsMuted(next);
    if (!isExpoGo) {
      try {
        await zegoService.setMicMuted(next);
      } catch (err: any) {
        Alert.alert("Audio Error", err?.message || "Failed to toggle microphone.");
      }
    }
  };

  const handleToggleVideo = async () => {
    const next = !isVideoEnabled;
    if (next && !isExpoGo) {
      const camOk = await requestCameraPermission();
      if (!camOk) return;
    }
    setIsVideoEnabled(next);
    if (!isExpoGo) {
      try {
        boundLocalPreviewTagRef.current = null;
        await zegoService.setCameraEnabled(next, localVideoRef.current);
      } catch (err: any) {
        Alert.alert("Camera Error", err?.message || "Failed to toggle camera.");
      }
    }
  };

  const handleFlipCamera = async () => {
    const next = !isFrontCamera;
    setIsFrontCamera(next);
    if (!isExpoGo) {
      try {
        await zegoService.setFrontCamera(next);
      } catch (err: any) {
        Alert.alert("Camera Error", err?.message || "Failed to switch camera.");
      }
    }
  };

  const handleToggleAudioRoute = async () => {
    const nextSpeaker = audioRoute !== "speaker";
    if (isExpoGo) {
      setAudioRoute(nextSpeaker ? "speaker" : "earpiece");
      return;
    }
    try {
      await zegoService.setSpeakerEnabled(nextSpeaker);
      const actualRoute = await zegoService.getCurrentAudioRoute();
      setAudioRoute(actualRoute);
    } catch (err: any) {
      Alert.alert("Audio Route Error", err?.message || "Failed to switch audio route.");
    }
  };

  const getAudioRouteButtonMeta = (): {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    active: boolean;
  } => {
    switch (audioRoute) {
      case "bluetooth":
        return { icon: "bluetooth", label: "Bluetooth", active: true };
      case "headset":
        return { icon: "headset", label: "Headset", active: true };
      case "speaker":
        return { icon: "volume-high", label: "Speaker", active: true };
      default:
        return { icon: "volume-medium", label: "Earpiece", active: false };
    }
  };

  const handleEndCall = async () => {
    hasCleanedUpRef.current = true;
    stopDialtone();
    if (socket) {
      socket.emit("call:end", { callId, roomId });
    }
    setCallStatus("ended");
    if (!isExpoGo) {
      await zegoService.destroy();
    }
    navigation.goBack();
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const getStatusLabel = () => {
    if (isExpoGo) {
      if (callStatus === "calling") return "Connecting...";
      if (callStatus === "ringing") return "Ringing...";
      if (callStatus === "connected") return `Connected - ${formatTimer(elapsedSeconds)}`;
      return "Call Ended";
    }

    if (!isIncoming && (callStatus === "calling" || callStatus === "ringing")) {
      return callStatus === "calling" ? "Calling..." : "Ringing...";
    }

    if (zegoError) return "Connection Issue";
    switch (enginePhase) {
      case "initializing":
        return "Initializing...";
      case "connecting_room":
        return "Connecting to room...";
      case "waiting_stream":
        return callStatus === "ringing"
          ? "Ringing - Waiting for remote stream..."
          : "Waiting for remote stream...";
      case "connected":
        return isVideoEnabled
          ? `Live Video Connected - ${formatTimer(elapsedSeconds)}`
          : `Live Audio Connected - ${formatTimer(elapsedSeconds)}`;
      default:
        return "Connecting...";
    }
  };

  const ZegoTextureView = !isExpoGo ? zegoService.getTextureViewComponent() : null;
  const showNativeVideoStage =
    !isExpoGo && ZegoTextureView && isVideoEnabled && enginePhase !== "error";

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top + 16, 48),
          paddingBottom: Math.max(insets.bottom + 20, 36),
        },
      ]}
    >
      {/* Full-Screen Remote Video Layer for Native APK Video Calls */}
      {showNativeVideoStage && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {remoteStreams.length > 0 ? (
            <View style={styles.remoteGrid}>
              {remoteStreams.map((stream) => (
                <View key={stream.streamID} style={styles.remoteVideoCell}>
                  <ZegoTextureView
                    ref={(el: any) => {
                      if (el) remoteVideoRefs.current[stream.streamID] = el;
                    }}
                    onLayout={() => handleRemoteViewLayout(stream.streamID)}
                    style={styles.fullVideo}
                  />
                  <View style={styles.remoteStreamNamePill}>
                    <Text style={styles.remoteStreamNameText}>
                      {stream.userName || counterpartName}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.waitingVideoOverlay}>
              <ActivityIndicator size="large" color="#C5A059" />
              <Text style={styles.waitingVideoText}>{getStatusLabel()}</Text>
            </View>
          )}

          {/* Local Camera Picture-in-Picture Preview */}
          <View style={[styles.localPipContainer, { top: Math.max(insets.top + 84, 112) }]}>
            <ZegoTextureView
              ref={(el: any) => {
                localVideoRef.current = el;
              }}
              onLayout={handleLocalViewLayout}
              style={styles.fullVideo}
            />
          </View>
        </View>
      )}

      {/* Top Info Header (Overlay on Video or Primary on Audio/Expo Go) */}
      <View style={styles.topSection}>
        {isExpoGo && (
          <View style={styles.expoGuardBadge}>
            <Ionicons name="information-circle" size={14} color="#C5A059" />
            <Text style={styles.expoGuardText}>
              Expo Go Mode - Simulated Media UI
            </Text>
          </View>
        )}

        <View style={styles.topInfo}>
          <Text style={styles.callTypeTitle}>
            {callType === "video" ? "SECURE VIDEO CALL" : "SECURE AUDIO CALL"}
          </Text>
          <Text style={styles.counterpartName}>{counterpartName}</Text>

          <View style={styles.statusBadge}>
            {(isExpoGo ? callStatus === "connected" : enginePhase === "connected") && (
              <View style={styles.liveDot} />
            )}
            <Text style={styles.statusText}>{getStatusLabel()}</Text>
          </View>
        </View>
      </View>

      {/* Center Stage: Visible Zego Error Banner OR Audio / Expo Go Stage */}
      <View style={styles.centerStage} pointerEvents="box-none">
        {!isExpoGo && zegoError ? (
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={36} color="#FCA5A5" />
            <Text style={styles.errorCardTitle}>
              {zegoError.code !== undefined
                ? `Zego Engine Error (${zegoError.code})`
                : "Media Connection Error"}
            </Text>
            <Text style={styles.errorCardBody}>{zegoError.message}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={startZegoEngine}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={16} color="#0B2B26" />
              <Text style={styles.retryBtnText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        ) : showNativeVideoStage ? null : (
          <>
            {isExpoGo && callType === "video" && isVideoEnabled ? (
              <View style={styles.videoPlaceholder}>
                <Ionicons name="videocam-outline" color="#C5A059" size={48} />
                <Text style={styles.videoPlaceholderText}>
                  Video Simulation (Expo Go)
                </Text>
                <Text style={styles.videoRoomSub}>
                  Install EAS APK for Live Video • Room: {roomId.slice(0, 8)}
                </Text>
              </View>
            ) : (
              <View style={styles.avatarGlow}>
                <View style={styles.avatarCircle}>
                  {!isExpoGo && enginePhase !== "connected" && (
                    <ActivityIndicator
                      size="small"
                      color="#C5A059"
                      style={{ marginBottom: 6 }}
                    />
                  )}
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              </View>
            )}

            {remoteStreams.length > 1 && (
              <Text style={styles.participantCountText}>
                {remoteStreams.length + 1} Participants Connected
              </Text>
            )}

            <View style={styles.securityNote}>
              <Ionicons name="shield-checkmark-outline" color="#1A6B45" size={16} />
              <Text style={styles.securityNoteText}>
                End-to-End Encrypted • Zero-PII Protected
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Bottom In-Call Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
            onPress={handleToggleMute}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isMuted ? "mic-off" : "mic"}
              size={24}
              color="#ffffff"
            />
            <Text style={styles.controlLabel}>{isMuted ? "Unmute" : "Mute"}</Text>
          </TouchableOpacity>

          {callType === "video" && (
            <TouchableOpacity
              style={[styles.controlBtn, !isVideoEnabled && styles.controlBtnActive]}
              onPress={handleToggleVideo}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isVideoEnabled ? "videocam" : "videocam-off"}
                size={24}
                color="#ffffff"
              />
              <Text style={styles.controlLabel}>
                {isVideoEnabled ? "Camera Off" : "Camera On"}
              </Text>
            </TouchableOpacity>
          )}

          {callType === "video" && isVideoEnabled && (
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={handleFlipCamera}
              activeOpacity={0.8}
            >
              <Ionicons name="camera-reverse-outline" size={24} color="#ffffff" />
              <Text style={styles.controlLabel}>Flip</Text>
            </TouchableOpacity>
          )}

          {(() => {
            const routeMeta = getAudioRouteButtonMeta();
            return (
              <TouchableOpacity
                style={[styles.controlBtn, routeMeta.active && styles.controlBtnActive]}
                onPress={handleToggleAudioRoute}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={routeMeta.icon}
                  size={24}
                  color="#ffffff"
                />
                <Text style={styles.controlLabel}>{routeMeta.label}</Text>
              </TouchableOpacity>
            );
          })()}
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
    backgroundColor: "#0B2B26",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  topSection: {
    alignItems: "center",
    zIndex: 10,
  },
  expoGuardBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(197,160,89,0.15)",
    borderColor: "rgba(197,160,89,0.4)",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
    gap: 6,
  },
  expoGuardText: {
    color: "#C5A059",
    fontSize: 11,
    fontWeight: "600",
  },
  topInfo: {
    alignItems: "center",
  },
  callTypeTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#C5A059",
    letterSpacing: 1.8,
    marginBottom: 6,
  },
  counterpartName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(11, 43, 38, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(197, 160, 89, 0.35)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F8F7F4",
  },
  centerStage: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    zIndex: 5,
  },
  remoteGrid: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  remoteVideoCell: {
    flex: 1,
    backgroundColor: "#0B2B26",
    position: "relative",
  },
  fullVideo: {
    width: "100%",
    height: "100%",
  },
  remoteStreamNamePill: {
    position: "absolute",
    bottom: 168,
    left: 16,
    backgroundColor: "rgba(11, 43, 38, 0.72)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  remoteStreamNameText: {
    color: "#F8F7F4",
    fontSize: 12,
    fontWeight: "600",
  },
  waitingVideoOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B2B26",
    gap: 12,
  },
  waitingVideoText: {
    color: "#C5A059",
    fontSize: 14,
    fontWeight: "600",
  },
  localPipContainer: {
    position: "absolute",
    right: 16,
    width: 112,
    height: 158,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#C5A059",
    backgroundColor: "#143D36",
    elevation: 10,
    zIndex: 20,
  },
  avatarGlow: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(197,160,89,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: "#143D36",
    borderWidth: 2,
    borderColor: "#C5A059",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: 42,
    fontWeight: "700",
    color: "#C5A059",
  },
  participantCountText: {
    color: "#C5A059",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  videoPlaceholder: {
    width: width - 48,
    height: (width - 48) * 0.65,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(197,160,89,0.3)",
  },
  videoPlaceholderText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#F8F7F4",
    marginTop: 12,
  },
  videoRoomSub: {
    fontSize: 11,
    color: "#A0A8A6",
    marginTop: 4,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  securityNoteText: {
    fontSize: 12,
    color: "#A0A8A6",
    fontWeight: "500",
  },
  errorCard: {
    width: width - 48,
    backgroundColor: "rgba(139, 26, 26, 0.9)",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  errorCardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 6,
  },
  errorCardBody: {
    color: "#FEE2E2",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 14,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#C5A059",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  retryBtnText: {
    color: "#0B2B26",
    fontSize: 13,
    fontWeight: "700",
  },
  controlsContainer: {
    width: "100%",
    alignItems: "center",
    zIndex: 10,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    width: "100%",
    marginBottom: 24,
  },
  controlBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "rgba(20, 61, 54, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  controlBtnActive: {
    backgroundColor: "rgba(197, 160, 89, 0.35)",
    borderColor: "#C5A059",
  },
  controlLabel: {
    fontSize: 10,
    color: "#F8F7F4",
    marginTop: 4,
    fontWeight: "600",
  },
  endCallBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#8B1A1A",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#8B1A1A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  hangupIcon: {
    transform: [{ rotate: "135deg" }],
  },
});
