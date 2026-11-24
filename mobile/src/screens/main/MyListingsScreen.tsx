import React, { useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { useListingStore } from "../../store/useListingStore";
import { Listing, ListingStatus } from "../../types/listing";

export const MyListingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { myListings, fetchMyListings, updateStatus, deleteListing, isLoading } =
    useListingStore();

  useEffect(() => {
    fetchMyListings();
  }, []);

  const handleUpdateStatus = (listing: Listing) => {
    Alert.alert("Update Listing Status", "Change property visibility:", [
      {
        text: "🟢 Available",
        onPress: () => updateStatus(listing.id, "available"),
      },
      {
        text: "🟡 Under Negotiation",
        onPress: () => updateStatus(listing.id, "negotiation"),
      },
      {
        text: "🔴 Sold",
        onPress: () => updateStatus(listing.id, "sold"),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleDeleteListing = (id: string, title: string) => {
    Alert.alert("Delete Listing", `Are you sure you want to delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteListing(id);
          } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to delete listing");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Listing }) => {
    const coverUrl =
      item.images?.[0]?.image_url ||
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80";

    return (
      <View style={styles.card}>
        <Image source={{ uri: coverUrl }} style={styles.cardThumb} />

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardPrice}>₹{item.price.toLocaleString("en-IN")}</Text>
          <Text style={styles.cardMeta}>
            {item.area_size} {item.area_unit.toUpperCase()} • {item.address_text}
          </Text>

          <View style={styles.actionRow}>
            {/* Status button */}
            <TouchableOpacity
              style={[
                styles.statusBtn,
                item.status === "available"
                  ? styles.statusAvailable
                  : item.status === "negotiation"
                  ? styles.statusNegotiation
                  : styles.statusSold,
              ]}
              onPress={() => handleUpdateStatus(item)}
            >
              <Text style={styles.statusBtnText}>
                {item.status.toUpperCase()} ▾
              </Text>
            </TouchableOpacity>

            {/* View Detail */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate("ListingDetail", { listingId: item.id })}
            >
              <Ionicons name="eye-outline" size={18} color="#1b5e20" />
            </TouchableOpacity>

            {/* Delete button */}
            <TouchableOpacity
              style={[styles.iconBtn, { borderColor: "#fee2e2" }]}
              onPress={() => handleDeleteListing(item.id, item.title)}
            >
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Banner with Post Land shortcut */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Managed Listings</Text>
          <Text style={styles.headerSubtitle}>
            {myListings.length} {myListings.length === 1 ? "plot" : "plots"} published
          </Text>
        </View>

        <TouchableOpacity
          style={styles.postBtn}
          onPress={() => navigation.navigate("CreateListing")}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.postBtnText}>Post Land</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#1b5e20" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={myListings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onRefresh={fetchMyListings}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#ccc" />
              <Text style={styles.emptyTitle}>No listings posted yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap "+ Post Land" above to create your first property listing.
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
    backgroundColor: "#f4f6f8",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1b5e20",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1b5e20",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  postBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
    marginLeft: 4,
  },
  listContent: {
    padding: 16,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardThumb: {
    width: 85,
    height: 85,
    borderRadius: 8,
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#222",
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1b5e20",
    marginTop: 2,
  },
  cardMeta: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  statusBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  statusAvailable: {
    backgroundColor: "#e8f5e9",
  },
  statusNegotiation: {
    backgroundColor: "#fff3e0",
  },
  statusSold: {
    backgroundColor: "#fee2e2",
  },
  statusBtnText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#333",
  },
  iconBtn: {
    padding: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    marginRight: 6,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 30,
  },
});
