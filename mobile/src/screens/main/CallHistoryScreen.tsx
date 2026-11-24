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
import { formatCallDate } from "../../utils/dateFormat";

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
    const duration = formatDuration(item.duration_seconds);

    return (
      <View style={styles.callCard} key={item.id || `call-item-${index}`}>
        <View style={styles.callIconWrapper}>
          <View
            style={[
              styles.callIconBg,
              isConnected
                ? isOutgoing
                  ? styles.bgOutgoing
                  : styles.bgIncoming
                : styles.bgMissed,
            ]}
          >
            <Ionicons
              name={
                item.call_type === "video"
                  ? "videocam"
                  : isOutgoing
                  ? "arrow-up"
                  : "arrow-down"
              }
              size={18}
              color={
                isConnected
                  ? isOutgoing
                    ? "#16a34a"
                    : "#0284c7"
                  : "#ef4444"
              }
            />
          </View>
        </View>

        <View style={styles.callInfo}>
          <View style={styles.callHeaderRow}>
            <Text style={styles.counterpartName} numberOfLines={1}>
              {counterpart?.full_name || "LandConnect User"}
            </Text>
            <Text style={styles.callDate}>{formatCallDate(item.started_at)}</Text>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.roleTag}>
              <Text style={styles.roleTagText}>
                {counterpart?.role?.toUpperCase() || "USER"}
              </Text>
            </View>

            <Text style={styles.callStatusText}>
              {isConnected
                ? duration
                  ? `${item.call_type === "video" ? "Video" : "Audio"} • ${duration}`
                  : `${item.call_type === "video" ? "Video" : "Audio"} Call`
                : item.status === "rejected"
                ? "Declined"
                : "Missed"}
            </Text>
          </View>
        </View>

        {item.room_id && (
          <TouchableOpacity
            style={styles.callBackBtn}
            onPress={() => handleCallBack(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={item.call_type === "video" ? "videocam" : "call"}
              size={18}
              color="#1b5e20"
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const safeCalls = Array.isArray(calls) ? calls : [];

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1b5e20" />
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
              colors={["#1b5e20"]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="call-outline"
                size={64}
                color="#94a3b8"
                style={{ marginBottom: 16 }}
              />
              <Text style={styles.emptyTitle}>No Call Logs Yet</Text>
              <Text style={styles.emptySubtitle}>
                Conduct private, zero-PII audio and video calls directly from any
                negotiation room.
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
    backgroundColor: "#f8fafc",
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
    color: "#64748b",
  },
  listContent: {
    padding: 12,
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
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
  callCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    alignItems: "center",
  },
  callIconWrapper: {
    marginRight: 12,
  },
  callIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  bgOutgoing: {
    backgroundColor: "#dcfce7",
  },
  bgIncoming: {
    backgroundColor: "#e0f2fe",
  },
  bgMissed: {
    backgroundColor: "#fee2e2",
  },
  callInfo: {
    flex: 1,
  },
  callHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  counterpartName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
    marginRight: 8,
  },
  callDate: {
    fontSize: 11,
    color: "#94a3b8",
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  roleTag: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#475569",
  },
  callStatusText: {
    fontSize: 12,
    color: "#64748b",
  },
  callBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ecfdf5",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
});
