import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "ChatRoom">;

export const ChatRoomScreen: React.FC<Props> = ({ route }) => {
  const { title } = route.params;

  return (
    <View style={styles.container}>
      <Ionicons name="chatbubbles" size={48} color="#1b5e20" />
      <Text style={styles.title}>{title || "Inquiry Room"}</Text>
      <Text style={styles.subtitle}>
        Real-time negotiation chat connected via Socket.IO.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f9fafb",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1b5e20",
    marginTop: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 6,
    textAlign: "center",
  },
});
