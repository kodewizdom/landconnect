import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { useAuthStore } from "../../store/useAuthStore";
import { useSocket } from "../../context/SocketContext";
import { roomApi } from "../../api/room.api";
import { callApi } from "../../api/call.api";
import { Message, Room, UserSearchResult } from "../../types/chat";
import {
  formatTime12Hour,
  formatDateSeparator,
  getLocalDateKey,
} from "../../utils/dateFormat";

type Props = NativeStackScreenProps<RootStackParamList, "ChatRoom">;

export const ChatRoomScreen: React.FC<Props> = ({ route, navigation }) => {
  const { roomId, title } = route.params;
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuthStore();
  const { socket } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [roomDetails, setRoomDetails] = useState<Room | null>(null);

  // Exact Keyboard Height Offset on Android
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Add Participant Modal for Brokers / Groups
  const [isAddUserModalVisible, setIsAddUserModalVisible] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<UserSearchResult | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Header height for iOS keyboard offset
  const headerHeight = 56 + insets.top;

  const flatListRef = useRef<FlatList<Message>>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load message history & room details
  const loadRoomData = useCallback(async () => {
    try {
      const [msgRes, roomsList] = await Promise.all([
        roomApi.getRoomMessages(roomId, 1, 50),
        roomApi.getRooms(),
      ]);

      // Server messages are ordered descending by created_at, reverse to display chronologically
      const raw = msgRes.messages || [];
      const chronological = raw.slice().reverse();
      setMessages(chronological);

      const found = roomsList.find((r) => r.id === roomId);
      if (found) setRoomDetails(found);
    } catch (err: any) {
      console.warn("Failed to load room data:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadRoomData();
  }, [loadRoomData]);

  // Track exact keyboard height on Android and scroll to bottom
  useEffect(() => {
    if (Platform.OS === "android") {
      const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });

      const hideSub = Keyboard.addListener("keyboardDidHide", () => {
        setKeyboardHeight(0);
      });

      return () => {
        showSub.remove();
        hideSub.remove();
      };
    } else {
      const showSub = Keyboard.addListener("keyboardWillShow", () => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });

      return () => {
        showSub.remove();
      };
    }
  }, []);

  // Join room and attach socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.emit("room:join", roomId);

    const handleNewMessage = (newMsg: Message) => {
      if (newMsg.room_id === roomId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;

          // Replace matching optimistic message if exists
          const optIdx = prev.findIndex(
            (m) =>
              m.id.startsWith("temp_") &&
              m.content === newMsg.content &&
              (m.sender_id === newMsg.sender_id || m.sender?.id === newMsg.sender?.id)
          );

          if (optIdx !== -1) {
            const updated = [...prev];
            updated[optIdx] = newMsg;
            return updated;
          }

          return [...prev, newMsg];
        });

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    const handleTypingStart = (data: { roomId: string; user: { full_name: string } }) => {
      if (data.roomId === roomId) {
        setTypingUser(data.user?.full_name || "User");
      }
    };

    const handleTypingStop = (data: { roomId: string }) => {
      if (data.roomId === roomId) {
        setTypingUser(null);
      }
    };

    const handleRoomUpdated = (updatedRoom: Room) => {
      if (updatedRoom.id === roomId) {
        setRoomDetails(updatedRoom);
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    socket.on("room:updated", handleRoomUpdated);

    return () => {
      socket.emit("room:leave", roomId);
      socket.off("message:new", handleNewMessage);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      socket.off("room:updated", handleRoomUpdated);
    };
  }, [socket, roomId]);

  // Header options & buttons
  useEffect(() => {
    const isBrokerOrGroup =
      roomDetails?.type === "group" ||
      roomDetails?.type === "meeting_room" ||
      currentUser?.role === "broker";

    navigation.setOptions({
      headerTitle: title || roomDetails?.name || "Negotiation Room",
      headerRight: () => (
        <View style={styles.headerRightActions}>
          {isBrokerOrGroup && (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setIsAddUserModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="person-add" size={20} color="#ffffff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => handleInitiateCall("audio")}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={20} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => handleInitiateCall("video")}
            activeOpacity={0.7}
          >
            <Ionicons name="videocam" size={21} color="#ffffff" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, title, roomDetails, currentUser]);

  const handleInputChange = (text: string) => {
    setInputText(text);

    if (!socket) return;

    if (text.trim().length > 0) {
      socket.emit("typing:start", roomId);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing:stop", roomId);
      }, 2500);
    } else {
      socket.emit("typing:stop", roomId);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const content = inputText.trim();
    setInputText("");

    // 1. Optimistic Local UI Update
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      room_id: roomId,
      sender_id: currentUser?.id,
      content,
      created_at: new Date().toISOString(),
      sender: {
        id: currentUser?.id || "",
        full_name: currentUser?.full_name || "Me",
        role: (currentUser?.role || "buyer") as any,
        avatar_url: currentUser?.avatar_url || null,
      },
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    // 2. Transmit via Socket.IO with REST Fallback
    try {
      if (socket && socket.connected) {
        socket.emit("message:send", {
          roomId,
          content,
        });
        socket.emit("typing:stop", roomId);
      } else {
        const saved = await roomApi.sendMessage(roomId, content);
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? saved : m))
        );
      }
    } catch (err: any) {
      console.warn("Socket send error, invoking REST fallback:", err.message);
      try {
        const saved = await roomApi.sendMessage(roomId, content);
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? saved : m))
        );
      } catch (restErr: any) {
        Alert.alert(
          "Message Not Sent",
          restErr.response?.data?.error || restErr.message || "Failed to persist message."
        );
      }
    }
  };

  const handleInitiateCall = async (callType: "audio" | "video") => {
    const otherParticipant = (roomDetails?.participants || []).find(
      (p) => p.user_id !== currentUser?.id
    );

    if (!otherParticipant) {
      Alert.alert(
        "No Callee Available",
        "Wait for a participant to join or invite someone to start a call."
      );
      return;
    }

    try {
      // 1. Validate participant token with backend
      await callApi.getToken(roomId);

      // 2. Emit call initiation
      if (socket) {
        socket.emit("call:initiate", {
          receiverId: otherParticipant.user_id,
          roomId,
          callType,
        });
      }

      // 3. Navigate to CallScreen
      navigation.navigate("CallScreen", {
        roomId,
        callType,
        receiverName: otherParticipant.user?.full_name || "Contact",
        receiverId: otherParticipant.user_id,
        isIncoming: false,
      });
    } catch (err: any) {
      Alert.alert(
        "Call Failed",
        err.response?.data?.error || err.message || "Failed to start call."
      );
    }
  };

  // Search users for Add Participant modal
  const handleSearchUsers = async (query: string) => {
    setSearchUserQuery(query);
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const results = await roomApi.searchUsers(query.trim());
      setUserSearchResults(results);
    } catch (err: any) {
      console.warn("User search failed:", err.message);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleSelectDemoUser = async (email: string) => {
    try {
      const results = await roomApi.searchUsers(email);
      const found = results.find((u) => u.email.toLowerCase() === email.toLowerCase()) || results[0];
      if (found) {
        setSelectedUserToAdd(found);
      } else {
        setSelectedUserToAdd({
          id: email,
          email,
          full_name: email.includes("buyer") ? "Demo Buyer" : "Demo Seller",
          role: email.includes("buyer") ? "buyer" : "seller",
          avatar_url: null,
        });
      }
    } catch {
      setSelectedUserToAdd({
        id: email,
        email,
        full_name: email.includes("buyer") ? "Demo Buyer" : "Demo Seller",
        role: email.includes("buyer") ? "buyer" : "seller",
        avatar_url: null,
      });
    }
  };

  const handleAddParticipant = async () => {
    if (!selectedUserToAdd) {
      Alert.alert("Missing Selection", "Please select a user to add.");
      return;
    }

    setIsAddingUser(true);
    try {
      await roomApi.addParticipant(roomId, selectedUserToAdd.id);
      setIsAddUserModalVisible(false);
      setSelectedUserToAdd(null);
      setSearchUserQuery("");
      setUserSearchResults([]);
      Alert.alert("Success", "Participant successfully added to negotiation room.");
      loadRoomData();
    } catch (err: any) {
      Alert.alert(
        "Failed to Add",
        err.response?.data?.error || err.message || "Could not add participant."
      );
    } finally {
      setIsAddingUser(false);
    }
  };

  const renderMessageItem = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.sender_id === currentUser?.id || item.sender?.id === currentUser?.id;
    const uniqueKey = item.id || `msg-${index}`;

    // Compute dynamic date separator
    const currentDateKey = getLocalDateKey(item.created_at);
    const prevDateKey = index > 0 ? getLocalDateKey(messages[index - 1]?.created_at) : null;
    const showDateSeparator = index === 0 || currentDateKey !== prevDateKey;

    return (
      <View key={`msg-block-${uniqueKey}`}>
        {/* Dynamic WhatsApp-Style Centered Date Separator Pill */}
        {showDateSeparator && (
          <View style={styles.dateSeparatorContainer}>
            <View style={styles.dateSeparatorPill}>
              <Text style={styles.dateSeparatorText}>
                {formatDateSeparator(item.created_at)}
              </Text>
            </View>
          </View>
        )}

        <View
          style={[
            styles.messageRow,
            isMe ? styles.messageRowMe : styles.messageRowOther,
          ]}
        >
          {!isMe && (
            <View style={styles.senderAvatar}>
              <Ionicons name="person" size={14} color="#ffffff" />
            </View>
          )}

          <View
            style={[
              styles.messageBubble,
              isMe ? styles.bubbleMe : styles.bubbleOther,
            ]}
          >
            {!isMe && (
              <View style={styles.senderHeader}>
                <Text style={styles.senderName}>
                  {item.sender?.full_name || "User"}
                </Text>
                <View style={styles.senderRoleTag}>
                  <Text style={styles.senderRoleText}>
                    {(item.sender?.role || "USER").toUpperCase()}
                  </Text>
                </View>
              </View>
            )}

            <Text
              style={[
                styles.messageText,
                isMe ? styles.textMe : styles.textOther,
              ]}
            >
              {item.content}
            </Text>

            <Text
              style={[
                styles.messageTimestamp,
                isMe ? styles.timestampMe : styles.timestampOther,
              ]}
            >
              {formatTime12Hour(item.created_at)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
    >
      {/* Property Context Banner */}
      {roomDetails?.listing && (
        <View style={styles.listingContextBar}>
          <Ionicons name="business" size={16} color="#1b5e20" />
          <Text style={styles.listingContextTitle} numberOfLines={1}>
            {roomDetails.listing.title} • ₹{roomDetails.listing.price.toLocaleString("en-IN")}
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1b5e20" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id || `msg-${index}`}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="lock-closed" size={32} color="#94a3b8" />
              <Text style={styles.emptyChatTitle}>End-to-End Secure Negotiation</Text>
              <Text style={styles.emptyChatSub}>
                Zero phone numbers or personal emails are shared. Negotiate prices,
                terms, and conduct audio/video calls safely within LandConnect.
              </Text>
            </View>
          }
        />
      )}

      {/* Typing Indicator */}
      {typingUser && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>{typingUser} is typing...</Text>
        </View>
      )}

      {/* Input Bar with exact Android keyboard offset */}
      <View
        style={[
          styles.inputBar,
          {
            paddingBottom:
              Platform.OS === "android"
                ? keyboardHeight > 0
                  ? keyboardHeight + insets.bottom + 12
                  : Math.max(insets.bottom, 12)
                : Math.max(insets.bottom, 12),
          },
        ]}
      >
        <TextInput
          style={styles.textInput}
          placeholder="Type an inquiry or offer..."
          placeholderTextColor="#94a3b8"
          value={inputText}
          onChangeText={handleInputChange}
          multiline
        />

        <TouchableOpacity
          style={[
            styles.sendBtn,
            !inputText.trim() && styles.sendBtnDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!inputText.trim()}
          activeOpacity={0.8}
        >
          <Ionicons name="send" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Add Participant Modal for Brokers */}
      <Modal
        visible={isAddUserModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddUserModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTitle}>Add to Negotiation</Text>
              <TouchableOpacity onPress={() => setIsAddUserModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSub}>
                Bring an additional registered buyer or seller into this secure 3-way negotiation room.
              </Text>

              {/* Quick Select Demo Buttons */}
              <Text style={styles.inputLabel}>Quick Select Demo Accounts</Text>
              <View style={styles.chipsRow}>
                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => handleSelectDemoUser("buyer@landconnect.com")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-add" size={14} color="#0284c7" />
                  <Text style={styles.demoChipText}>+ Demo Buyer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => handleSelectDemoUser("seller@landconnect.com")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-add" size={14} color="#059669" />
                  <Text style={styles.demoChipText}>+ Demo Seller</Text>
                </TouchableOpacity>
              </View>

              {/* Search by Email or Name */}
              <Text style={styles.inputLabel}>Search Users by Email / Name</Text>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Type email or name to search..."
                  placeholderTextColor="#94a3b8"
                  value={searchUserQuery}
                  onChangeText={handleSearchUsers}
                />
                {isSearchingUsers && <ActivityIndicator size="small" color="#1b5e20" />}
              </View>

              {/* Search Results */}
              {userSearchResults.length > 0 && (
                <View style={styles.resultsContainer}>
                  {userSearchResults.map((u, idx) => (
                    <TouchableOpacity
                      key={u.id || `search-u-${idx}`}
                      style={styles.userResultRow}
                      onPress={() => setSelectedUserToAdd(u)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultName}>{u.full_name}</Text>
                        <Text style={styles.resultEmail}>{u.email}</Text>
                      </View>
                      <View style={styles.roleTag}>
                        <Text style={styles.roleTagText}>{u.role.toUpperCase()}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Selected User */}
              {selectedUserToAdd && (
                <View style={styles.selectedContainer}>
                  <Text style={styles.selectedLabel}>Selected to Add:</Text>
                  <View style={styles.selectedBadge}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selectedName}>{selectedUserToAdd.full_name}</Text>
                      <Text style={styles.selectedSub}>{selectedUserToAdd.email} • {selectedUserToAdd.role.toUpperCase()}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedUserToAdd(null)}>
                      <Ionicons name="close-circle" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  (!selectedUserToAdd || isAddingUser) && { opacity: 0.6 },
                ]}
                onPress={handleAddParticipant}
                disabled={!selectedUserToAdd || isAddingUser}
                activeOpacity={0.8}
              >
                {isAddingUser ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={16} color="#ffffff" />
                    <Text style={styles.modalSubmitText}>Add to Negotiation</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconBtn: {
    padding: 6,
  },
  listingContextBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#d1fae5",
  },
  listingContextTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065f46",
    marginLeft: 6,
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  dateSeparatorContainer: {
    alignItems: "center",
    marginVertical: 14,
  },
  dateSeparatorPill: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  dateSeparatorText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.4,
  },
  emptyChat: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyChatTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    marginTop: 12,
  },
  emptyChatSub: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "flex-end",
  },
  messageRowMe: {
    justifyContent: "flex-end",
  },
  messageRowOther: {
    justifyContent: "flex-start",
  },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1b5e20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: "80%",
    minWidth: 80,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: "#1b5e20",
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  senderHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  senderRoleTag: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  senderRoleText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#475569",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  textMe: {
    color: "#ffffff",
  },
  textOther: {
    color: "#1e293b",
  },
  messageTimestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
    flexShrink: 0,
    minWidth: 64,
    textAlign: "right",
    includeFontPadding: false,
  },
  timestampMe: {
    color: "rgba(255,255,255,0.75)",
  },
  timestampOther: {
    color: "#94a3b8",
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  typingText: {
    fontSize: 11,
    fontStyle: "italic",
    color: "#64748b",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: "#0f172a",
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1b5e20",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: "#94a3b8",
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    maxHeight: "85%",
    elevation: 6,
  },
  modalTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalSub: {
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
  selectedContainer: {
    marginVertical: 10,
  },
  selectedLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 4,
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
  modalSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1b5e20",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 12,
    gap: 6,
  },
  modalSubmitText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
});
