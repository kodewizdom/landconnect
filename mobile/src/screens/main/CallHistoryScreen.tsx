import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { useAuthStore } from "../../store/useAuthStore";
import { callApi } from "../../api/call.api";
import { useSocket } from "../../context/SocketContext";
import { CallLog } from "../../types/chat";
import { formatCallDate, formatTime12Hour } from "../../utils/dateFormat";
import { requestCallPermissions } from "../../utils/callPermissions";
import { formatRoleBadge } from "../../utils/roleLabel";

export const CallHistoryScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user: currentUser } = useAuthStore();
  const { socket } = useSocket();

  const [calls, setCalls] = useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchHistory = useCallback(async (pageNum = 1, shouldAppend = false) => {
    try {
      const data = await callApi.getHistory(pageNum, 20);
      const incomingCalls = Array.isArray(data?.calls) ? data.calls : [];
      if (shouldAppend) {
        setCalls((prev) => [...(prev ?? []), ...incomingCalls]);
      } else {
        setCalls(incomingCalls);
      }
      setHasMore(pageNum < (data?.totalPages ?? 1));
    } catch (err: any) {
      console.warn("Failed to fetch call history:", err.message);
      if (!shouldAppend) setCalls([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchHistory(1, false);
  }, [fetchHistory]);

  // Reload history automatically whenever user navigates/focuses this tab
  useFocusEffect(
    useCallback(() => {
      fetchHistory(1, false);
    }, [fetchHistory])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    setPage(1);
    fetchHistory(1, false);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchHistory(nextPage, true);
    }
  };

  const handleCallBack = async (item: CallLog) => {
    const isOutgoing = item.caller_id === currentUser?.id;
    const counterpart = isOutgoing ? item.receiver : item.caller;

    if (!item.room_id) {
      Alert.alert(
        "Call Back",
        "Direct call back is available from active negotiation rooms."
      );
      return;
    }

    const permissionsGranted = await requestCallPermissions(item.call_type);
    if (!permissionsGranted) {
      return;
    }

    try {
      await callApi.getToken(item.room_id);

      if (socket) {
        socket.emit("call:initiate", {
          receiverId: counterpart.id,
          roomId: item.room_id,
          callType: item.call_type,
        });
      }

      navigation.navigate("CallScreen", {
        roomId: item.room_id,
        callType: item.call_type,
        receiverName: counterpart.full_name,
        receiverId: counterpart.id,
        isIncoming: false,
      });
    } catch (err: any) {
      Alert.alert(
        "Call Failed",
        err.response?.data?.error || err.message || "Failed to start call."
      );
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const renderCallItem = ({ item, index }: { item: CallLog; index: number }) => {
    const isOutgoing = item.caller_id === currentUser?.id;
    const counterpart = isOutgoing ? item.receiver : item.caller;
    const isConnected = item.status === "connected" || item.status === "ended";
    const isMissed = !isConnected;
    const duration = formatDuration(item.duration_seconds);
    const isVideo = item.call_type === "video";

    // Icon circle background & icon color
    let iconBg = "#F5EDD8";
    let iconColor = "#C5A059";
    if (isMissed) {
      iconBg = "#FEE2E2";
      iconColor = "#8B1A1A";
    } else if (isOutgoing) {
      iconBg = "#E8F5EE";
      iconColor = "#1A6B45";
    }

    return (
      <View style={styles.callCard} key={item.id || `call-item-${index}`}>
        {/* Left icon circle */}
        <View style={[styles.callIconBg, { backgroundColor: iconBg }]}>
          <Ionicons
            name={isVideo ? "videocam-outline" : "call-outline"}
            size={18}
            color={iconColor}
          />
        </View>

        {/* Center info */}
        <View style={styles.callInfo}>
          <Text style={styles.counterpartName} numberOfLines={1}>
            {counterpart?.full_name || "LandConnect User"}
          </Text>
          <View style={styles.detailsRow}>
            <View style={styles.roleTagSmall}>
              <Text style={styles.roleTagText}>
                {formatRoleBadge(counterpart?.role)}
              </Text>
            </View>
            <Text style={styles.callTimestamp}>
              {formatCallDate(item.started_at)}
            </Text>
          </View>
        </View>

        {/* Right: duration + callback */}
        <View style={styles.callRight}>
          {duration && (
            <Text style={styles.durationText}>{duration}</Text>
          )}
          {item.room_id && (
            <TouchableOpacity
              style={styles.callBackBtn}
              onPress={() => handleCallBack(item)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="call-outline"
                size={16}
                color="#636B69"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const safeCalls = Array.isArray(calls) ? calls : [];

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0B2B26" />
          <Text style={styles.loadingText}>Loading call history...</Text>
        </View>
      ) : (
        <FlatList
          data={safeCalls}
          keyExtractor={(item, index) => item?.id || `call-${index}`}
          renderItem={renderCallItem}
          contentContainerStyle={
            safeCalls.length === 0 ? styles.emptyContainer : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={["#0B2B26"]}
              tintColor="#0B2B26"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="call-outline"
                size={56}
                color="#E6E2D8"
                style={{ marginBottom: 16 }}
              />
              <Text style={styles.emptyEyebrow}>NO CALL HISTORY</Text>
              <Text style={styles.emptyBody}>
                Conduct private, zero-PII audio and video calls directly from any negotiation room.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7F4",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#636B69",
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#636B69",
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 13,
    color: "#A0A8A6",
    textAlign: "center",
    lineHeight: 20,
  },
  callCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    alignItems: "center",
  },
  callIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  callInfo: {
    flex: 1,
  },
  counterpartName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#181C1B",
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  roleTagSmall: {
    backgroundColor: "#F5EDD8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E6E2D8",
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#92610A",
  },
  callTimestamp: {
    fontSize: 12,
    color: "#636B69",
  },
  callRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  durationText: {
    fontSize: 12,
    color: "#A0A8A6",
  },
  callBackBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E6E2D8",
    padding: 6,
  },
});
