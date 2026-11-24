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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../../types/navigation";
import { useAuthStore } from "../../store/useAuthStore";
import { useSocket } from "../../context/SocketContext";
import { roomApi } from "../../api/room.api";
import { Room, UserSearchResult } from "../../types/chat";
import { formatTime12Hour } from "../../utils/dateFormat";

export const ChatListScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user: currentUser } = useAuthStore();
  const { socket } = useSocket();
  const insets = useSafeAreaInsets();

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
        const role = email.includes("buyer") ? "buyer" : "seller";
        handleSelectUser({
          id: email,
          email,
          full_name: role === "buyer" ? "Demo Buyer" : "Demo Seller",
          role,
          avatar_url: null,
        });
      }
    } catch {
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

  const renderRoomItem = ({ item, index }: { item: Room; index: number }) => {
    const title = getRoomTitle(item);
    const isGroup = item.type === "group" || item.type === "meeting_room";
    const lastMsg = item.latest_message || item.lastMessage || (item.messages && item.messages[0]);
    const otherParticipants = (item.participants || []).filter(
      (p) => p.user_id !== currentUser?.id
    );
    const initials = title
      .split(" ")
      .slice(0, 2)
      .map((w: string) => w[0])
      .join("")
      .toUpperCase();

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
        {/* Avatar */}
        <View style={[styles.avatar, isGroup ? styles.avatarGroup : styles.avatarDirect]}>
          {item.listing?.cover_image && !isGroup ? (
            <Image source={{ uri: item.listing.cover_image }} style={styles.avatarImage} />
          ) : isGroup ? (
            <Ionicons name="people" size={20} color="#FFFFFF" />
          ) : (
            <Text style={styles.avatarInitials}>{initials}</Text>
          )}
        </View>

        {/* Center content */}
        <View style={styles.roomContent}>
          <Text style={styles.roomTitle} numberOfLines={1}>{title}</Text>
          {item.listing?.title && (
            <Text style={styles.listingSubtitle} numberOfLines={1}>
              {item.listing.title}
            </Text>
          )}
          <Text style={styles.lastMessageText} numberOfLines={1}>
            {lastMsg ? lastMsg.content : "Tap to open chat and secure call"}
          </Text>
        </View>

        {/* Right column */}
        <View style={styles.roomRight}>
          <Text style={styles.roomTime}>
            {lastMsg?.created_at || item.updated_at || item.created_at
              ? formatTime12Hour(lastMsg?.created_at || item.updated_at || item.created_at)
              : ""}
          </Text>
          <Ionicons
            name={isGroup ? "people-outline" : "chatbubble-outline"}
            size={14}
            color="#E6E2D8"
            style={{ marginTop: 4 }}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const directRooms = safeRooms.filter((r) => r.type === "direct" || (!r.type));
  const groupRooms = safeRooms.filter((r) => r.type === "group" || r.type === "meeting_room");

  const listData: Array<{ kind: "eyebrow"; label: string } | { kind: "room"; item: Room; index: number }> = [];
  if (directRooms.length > 0) {
    listData.push({ kind: "eyebrow", label: "DIRECT INQUIRIES" });
    directRooms.forEach((r, i) => listData.push({ kind: "room", item: r, index: i }));
  }
  if (groupRooms.length > 0) {
    listData.push({ kind: "eyebrow", label: "BROKER MEETING ROOMS" });
    groupRooms.forEach((r, i) => listData.push({ kind: "room", item: r, index: i + directRooms.length }));
  }

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0B2B26" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={safeRooms.length === 0 ? [] : listData}
          keyExtractor={(entry, i) => {
            if ((entry as any).kind === "eyebrow") return `eyebrow-${(entry as any).label}`;
            return (entry as any).item?.id || `room-${i}`;
          }}
          renderItem={({ item: entry }) => {
            if ((entry as any).kind === "eyebrow") {
              return (
                <Text style={styles.eyebrow}>{(entry as any).label}</Text>
              );
            }
            const e = entry as { kind: "room"; item: Room; index: number };
            return renderRoomItem({ item: e.item, index: e.index });
          }}
          contentContainerStyle={
            safeRooms.length === 0 ? styles.emptyContainer : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={["#0B2B26"]}
              tintColor="#0B2B26"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="chatbubbles-outline"
                size={56}
                color="#E6E2D8"
                style={{ marginBottom: 16 }}
              />
              <Text style={styles.emptyEyebrow}>NO ACTIVE ROOMS</Text>
              <Text style={styles.emptyBody}>
                Start a conversation from any listing
              </Text>
            </View>
          }
        />
      )}

      {/* Broker FAB */}
      {currentUser?.role === "broker" && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 16 }]}
          onPress={() => setIsModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color="#C5A059" />
        </TouchableOpacity>
      )}

      {/* New 3-Way Meeting Modal for Brokers */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.meetingModal}>
            {/* Handle bar */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Host Negotiation Room</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#636B69" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSubtitle}>
                Create a secure negotiation room connecting you, the buyer, and the land seller.
              </Text>

              <Text style={styles.inputLabel}>Meeting / Property Title *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 5-Acre Mysore Highway Deal"
                placeholderTextColor="#A0A8A6"
                value={meetingTitle}
                onChangeText={setMeetingTitle}
              />

              <Text style={styles.inputLabel}>Listing ID (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Paste listing UUID if applicable"
                placeholderTextColor="#A0A8A6"
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
                  <Ionicons name="person-add" size={14} color="#C5A059" />
                  <Text style={styles.demoChipText}>Demo Buyer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => handleAddDemoUser("seller@landconnect.com")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-add" size={14} color="#C5A059" />
                  <Text style={styles.demoChipText}>Demo Seller</Text>
                </TouchableOpacity>
              </View>

              {/* Live Search by Email or Name */}
              <Text style={styles.inputLabel}>Search Users by Email / Name</Text>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={16} color="#A0A8A6" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Type email or name to search..."
                  placeholderTextColor="#A0A8A6"
                  value={searchQuery}
                  onChangeText={handleSearchUsers}
                />
                {isSearching && <ActivityIndicator size="small" color="#0B2B26" />}
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
                      <View style={styles.roleTagSmall}>
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
                        <Text style={styles.selectedSub}>{p.email} - {p.role.toUpperCase()}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveParticipant(p.id)}>
                        <Ionicons name="close-circle" size={18} color="#8B1A1A" />
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
                      Initialize Negotiation Room
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Cancel */}
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
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
    paddingBottom: 100,
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
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#636B69",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  roomCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarDirect: {
    backgroundColor: "#0B2B26",
  },
  avatarGroup: {
    backgroundColor: "#92610A",
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  roomContent: {
    flex: 1,
    marginLeft: 0,
  },
  roomTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#181C1B",
  },
  listingSubtitle: {
    fontSize: 12,
    color: "#636B69",
    marginTop: 1,
  },
  lastMessageText: {
    fontSize: 13,
    color: "#A0A8A6",
    numberOfLines: 1,
    marginTop: 2,
  } as any,
  roomRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 8,
  },
  roomTime: {
    fontSize: 11,
    color: "#A0A8A6",
  },
  // FAB
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0B2B26",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#0B2B26",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(11,43,38,0.6)",
    justifyContent: "flex-end",
  },
  meetingModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "88%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E6E2D8",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
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
    color: "#181C1B",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#636B69",
    marginBottom: 14,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.0,
    color: "#636B69",
    marginBottom: 6,
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: "#F8F7F4",
    borderWidth: 1,
    borderColor: "#E6E2D8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#181C1B",
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
    backgroundColor: "#F5EDD8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: "#E6E2D8",
  },
  demoChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92610A",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F7F4",
    borderWidth: 1,
    borderColor: "#E6E2D8",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#181C1B",
  },
  resultsContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E2D8",
    borderRadius: 8,
    marginBottom: 12,
    maxHeight: 140,
  },
  userResultRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F7F4",
  },
  resultName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#181C1B",
  },
  resultEmail: {
    fontSize: 11,
    color: "#636B69",
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
  selectedWrapper: {
    marginBottom: 12,
    gap: 6,
  },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5EDD8",
    borderWidth: 1,
    borderColor: "#E6E2D8",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectedName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#181C1B",
  },
  selectedSub: {
    fontSize: 10,
    color: "#92610A",
  },
  noParticipantsText: {
    fontSize: 11,
    color: "#A0A8A6",
    fontStyle: "italic",
    marginBottom: 12,
  },
  submitMeetingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B2B26",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
  },
  submitMeetingText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: "#E6E2D8",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#636B69",
  },
});
