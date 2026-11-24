import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { useAuthStore } from "../../store/useAuthStore";
import { useSocket } from "../../context/SocketContext";
import { roomApi } from "../../api/room.api";
import { Room, UserSearchResult } from "../../types/chat";

export const ChatListScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user: currentUser } = useAuthStore();
  const { socket } = useSocket();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Broker New Group Meeting Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [listingId, setListingId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Participant selection state
  const [selectedParticipants, setSelectedParticipants] = useState<UserSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      const data = await roomApi.getRooms();
      setRooms(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn("Failed to fetch rooms:", err.message);
      setRooms([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Reload rooms whenever ChatListScreen gains focus (switching tabs or navigating back)
  useFocusEffect(
    useCallback(() => {
      fetchRooms();
    }, [fetchRooms])
  );

  // Real-time synchronization: reload rooms on message:new or room:created
  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdate = () => {
      fetchRooms();
    };

    socket.on("message:new", handleRoomUpdate);
    socket.on("room:created", handleRoomUpdate);
    socket.on("room:updated", handleRoomUpdate);

    return () => {
      socket.off("message:new", handleRoomUpdate);
      socket.off("room:created", handleRoomUpdate);
      socket.off("room:updated", handleRoomUpdate);
    };
  }, [socket, fetchRooms]);

  // Search registered users for Brokers
  const handleSearchUsers = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await roomApi.searchUsers(query.trim());
      setSearchResults(results);
    } catch (err: any) {
      console.warn("User search failed:", err.message);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSelectUser = (user: UserSearchResult) => {
    if (selectedParticipants.some((p) => p.id === user.id)) return;
    setSelectedParticipants((prev) => [...prev, user]);
  };

  const handleRemoveParticipant = (id: string) => {
    setSelectedParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  // Quick select demo users
  const handleAddDemoUser = async (email: string) => {
    try {
      const results = await roomApi.searchUsers(email);
      const found = results.find((u) => u.email.toLowerCase() === email.toLowerCase()) || results[0];
      if (found) {
        handleSelectUser(found);
      } else {
        // Fallback demo user if search returned empty
        const role = email.includes("buyer") ? "buyer" : "seller";
        handleSelectUser({
          id: email, // If backend supports email search or fallback
          email,
          full_name: role === "buyer" ? "Demo Buyer" : "Demo Seller",
          role,
          avatar_url: null,
        });
      }
    } catch {
      // Offline / direct fallback
      const role = email.includes("buyer") ? "buyer" : "seller";
      handleSelectUser({
        id: email,
        email,
        full_name: role === "buyer" ? "Demo Buyer" : "Demo Seller",
        role,
        avatar_url: null,
      });
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchRooms();
  };

  const handleCreateMeeting = async () => {
    if (!meetingTitle.trim()) {
      Alert.alert("Missing Title", "Please enter a meeting title.");
      return;
    }

    if (selectedParticipants.length === 0) {
      Alert.alert(
        "No Participants Selected",
        "Please select at least one Buyer or Seller to add to the negotiation."
      );
      return;
    }

    const participantIds = selectedParticipants.map((p) => p.id);

    setIsCreating(true);
    try {
      const newRoom = await roomApi.createOrGetRoom({
        type: "group",
        title: meetingTitle.trim(),
        listingId: listingId.trim() || undefined,
        participantIds,
      });

      setIsModalVisible(false);
      setMeetingTitle("");
      setListingId("");
      setSelectedParticipants([]);
      setSearchQuery("");
      setSearchResults([]);
      await fetchRooms();

      navigation.navigate("ChatRoom", {
        roomId: newRoom.id,
        title: newRoom.name || "3-Way Negotiation",
      });
    } catch (err: any) {
      Alert.alert(
        "Creation Failed",
        err.response?.data?.error || err.message || "Failed to create group meeting."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const getRoomTitle = (room: Room) => {
    if (room.name) return room.name;
    if (room.listing?.title) return room.listing.title;
    const otherParticipants = (room.participants || []).filter(
      (p) => p.user_id !== currentUser?.id
    );
    if (otherParticipants.length > 0) {
      return otherParticipants.map((p) => p.user?.full_name || "User").join(", ");
    }
    return "Inquiry Room";
  };

  const formatTime = (dateString?: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const renderRoomItem = ({ item, index }: { item: Room; index: number }) => {
    const title = getRoomTitle(item);
    const isGroup = item.type === "group" || item.type === "meeting_room";
    const lastMsg = item.latest_message || item.lastMessage || (item.messages && item.messages[0]);
    const otherParticipants = (item.participants || []).filter(
      (p) => p.user_id !== currentUser?.id
    );

    return (
      <TouchableOpacity
        key={item.id || `room-card-${index}`}
        style={styles.roomCard}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate("ChatRoom", {
            roomId: item.id,
            title,
          })
        }
      >
        <View style={styles.avatarWrapper}>
          {item.listing?.cover_image ? (
            <Image
              source={{ uri: item.listing.cover_image }}
              style={styles.avatarImage}
            />
          ) : (
            <View
              style={[
                styles.avatarFallback,
                isGroup && { backgroundColor: "#0284c7" },
              ]}
            >
              <Ionicons
                name={isGroup ? "people" : "person"}
                size={24}
                color="#ffffff"
              />
            </View>
          )}
          {isGroup && (
            <View style={styles.groupBadgeDot}>
              <Ionicons name="shield-checkmark" size={10} color="#ffffff" />
            </View>
          )}
        </View>

        <View style={styles.roomContent}>
          <View style={styles.roomHeaderRow}>
            <Text style={styles.roomTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.roomTime}>
              {formatTime(lastMsg?.created_at || item.updated_at || item.created_at)}
            </Text>
          </View>

          <View style={styles.participantsBadgeRow}>
            <View
              style={[
                styles.typeTag,
                isGroup ? styles.typeTagGroup : styles.typeTagDirect,
              ]}
            >
              <Text
                style={[
                  styles.typeTagText,
                  isGroup ? styles.typeTagTextGroup : styles.typeTagTextDirect,
                ]}
              >
                {isGroup ? "3-Way Negotiation" : "Direct Inquiry"}
              </Text>
            </View>

            {otherParticipants.slice(0, 2).map((p, pIdx) => {
              const uniqueKey = p.user_id || p.user?.id || `${item.id}-part-${pIdx}`;
              return (
                <View key={uniqueKey} style={styles.roleTag}>
                  <Text style={styles.roleTagText}>
                    {(p.user?.role || "USER").toUpperCase()}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.lastMessageText} numberOfLines={1}>
            {lastMsg ? lastMsg.content : "Tap to open chat & secure call"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const safeRooms = Array.isArray(rooms) ? rooms : [];

  return (
    <View style={styles.container}>
      {/* Broker Action Banner */}
      {currentUser?.role === "broker" && (
        <View style={styles.brokerBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brokerBannerTitle}>Broker Management</Text>
            <Text style={styles.brokerBannerSub}>
              Bridge buyers & sellers in 3-way negotiation rooms
            </Text>
          </View>
          <TouchableOpacity
            style={styles.newMeetingBtn}
            onPress={() => setIsModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color="#ffffff" />
            <Text style={styles.newMeetingText}>New Meeting</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1b5e20" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={safeRooms}
          keyExtractor={(item, index) => item?.id || `room-${index}`}
          renderItem={renderRoomItem}
          contentContainerStyle={
            safeRooms.length === 0 ? styles.emptyContainer : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={["#1b5e20"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="chatbubbles-outline"
                size={64}
                color="#94a3b8"
                style={{ marginBottom: 16 }}
              />
              <Text style={styles.emptyTitle}>No Conversations Yet</Text>
              <Text style={styles.emptySubtitle}>
                Inquire on any land listing from the Explore tab to start a
                private negotiation or audio/video call.
              </Text>
            </View>
          }
        />
      )}

      {/* New 3-Way Meeting Modal for Brokers */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.meetingModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Host 3-Way Meeting</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSubtitle}>
                Create a secure negotiation room connecting you, the buyer, and
                the land seller.
              </Text>

              <Text style={styles.inputLabel}>Meeting / Property Title *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 5-Acre Mysore Highway Deal"
                placeholderTextColor="#94a3b8"
                value={meetingTitle}
                onChangeText={setMeetingTitle}
              />

              <Text style={styles.inputLabel}>Listing ID (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Paste listing UUID if applicable"
                placeholderTextColor="#94a3b8"
                value={listingId}
                onChangeText={setListingId}
              />

              {/* Quick-Select Demo Participants */}
              <Text style={styles.inputLabel}>Quick Select Demo Accounts</Text>
              <View style={styles.chipsRow}>
                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => handleAddDemoUser("buyer@landconnect.com")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-add" size={14} color="#0284c7" />
                  <Text style={styles.demoChipText}>+ Demo Buyer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => handleAddDemoUser("seller@landconnect.com")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-add" size={14} color="#059669" />
                  <Text style={styles.demoChipText}>+ Demo Seller</Text>
                </TouchableOpacity>
              </View>

              {/* Live Search by Email or Name */}
              <Text style={styles.inputLabel}>Search Users by Email / Name</Text>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Type email or name to search..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={handleSearchUsers}
                />
                {isSearching && <ActivityIndicator size="small" color="#1b5e20" />}
              </View>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <View style={styles.resultsContainer}>
                  {searchResults.map((user, idx) => (
                    <TouchableOpacity
                      key={user.id || `search-res-${idx}`}
                      style={styles.userResultRow}
                      onPress={() => handleSelectUser(user)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultName}>{user.full_name}</Text>
                        <Text style={styles.resultEmail}>{user.email}</Text>
                      </View>
                      <View style={styles.roleTag}>
                        <Text style={styles.roleTagText}>{user.role.toUpperCase()}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Selected Participants List */}
              <Text style={styles.inputLabel}>
                Selected Participants ({selectedParticipants.length})
              </Text>
              {selectedParticipants.length === 0 ? (
                <Text style={styles.noParticipantsText}>
                  No participants added yet. Use the demo buttons above or search by email.
                </Text>
              ) : (
                <View style={styles.selectedWrapper}>
                  {selectedParticipants.map((p, idx) => (
                    <View key={p.id || `selected-p-${idx}`} style={styles.selectedBadge}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.selectedName}>{p.full_name}</Text>
                        <Text style={styles.selectedSub}>{p.email} • {p.role.toUpperCase()}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveParticipant(p.id)}>
                        <Ionicons name="close-circle" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.submitMeetingBtn, isCreating && { opacity: 0.6 }]}
                onPress={handleCreateMeeting}
                disabled={isCreating}
                activeOpacity={0.8}
              >
                {isCreating ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                    <Text style={styles.submitMeetingText}>
                      Initialize 3-Way Room
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  brokerBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#065f46",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  brokerBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  brokerBannerSub: {
    fontSize: 11,
    color: "#a7f3d0",
    marginTop: 2,
  },
  newMeetingBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  newMeetingText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 12,
    marginLeft: 4,
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
  roomCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    alignItems: "center",
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 12,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#e2e8f0",
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1b5e20",
    justifyContent: "center",
    alignItems: "center",
  },
  groupBadgeDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#0284c7",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  roomContent: {
    flex: 1,
  },
  roomHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  roomTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
    marginRight: 8,
  },
  roomTime: {
    fontSize: 11,
    color: "#94a3b8",
  },
  participantsBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  typeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeTagGroup: {
    backgroundColor: "#e0f2fe",
  },
  typeTagDirect: {
    backgroundColor: "#ecfdf5",
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  typeTagTextGroup: {
    color: "#0284c7",
  },
  typeTagTextDirect: {
    color: "#059669",
  },
  roleTag: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#475569",
  },
  lastMessageText: {
    fontSize: 13,
    color: "#64748b",
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  meetingModal: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    maxHeight: "85%",
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 14,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  demoChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  demoChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
  },
  resultsContainer: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    marginBottom: 12,
    maxHeight: 140,
  },
  userResultRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  resultName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  resultEmail: {
    fontSize: 11,
    color: "#64748b",
  },
  selectedWrapper: {
    marginBottom: 12,
    gap: 6,
  },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectedName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065f46",
  },
  selectedSub: {
    fontSize: 10,
    color: "#047857",
  },
  noParticipantsText: {
    fontSize: 11,
    color: "#94a3b8",
    fontStyle: "italic",
    marginBottom: 12,
  },
  submitMeetingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1b5e20",
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  submitMeetingText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
    marginLeft: 6,
  },
});
