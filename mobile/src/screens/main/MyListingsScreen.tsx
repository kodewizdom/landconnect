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
import { Colors, formatINR } from "../../theme";

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
        text: "Available",
        onPress: () => updateStatus(listing.id, "available"),
      },
      {
        text: "Under Negotiation",
        onPress: () => updateStatus(listing.id, "negotiation"),
      },
      {
        text: "Sold",
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

  const getStatusStyle = (status: ListingStatus) => {
    if (status === "available") {
      return { bg: Colors.success, text: Colors.ivory };
    }
    if (status === "negotiation") {
      return { bg: Colors.warning, text: Colors.ivory };
    }
    return { bg: Colors.error, text: Colors.ivory };
  };

  const getStatusLabel = (status: ListingStatus) => {
    if (status === "available") return "AVAILABLE";
    if (status === "negotiation") return "NEGOTIATION";
    return "SOLD";
  };

  const renderItem = ({ item }: { item: Listing }) => {
    const coverUrl =
      item.images?.[0]?.image_url ||
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80";

    const statusStyle = getStatusStyle(item.status);

    return (
      <View style={styles.card}>
        <Image source={{ uri: coverUrl }} style={styles.cardThumb} />

        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <TouchableOpacity
              style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}
              onPress={() => handleUpdateStatus(item)}
            >
              <Text style={[styles.statusPillText, { color: statusStyle.text }]}>
                {getStatusLabel(item.status)}
              </Text>
              <Ionicons name="chevron-down" size={10} color={statusStyle.text} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>

          <Text style={styles.cardPrice}>{formatINR(item.price)}</Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {item.area_size} {item.area_unit.toUpperCase()} · {item.address_text}
          </Text>

          <View style={styles.actionRow}>
            {/* View Detail */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate("ListingDetail", { listingId: item.id })}
            >
              <Ionicons name="eye-outline" size={18} color={Colors.emerald} />
            </TouchableOpacity>

            {/* Edit placeholder */}
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="create-outline" size={18} color={Colors.emerald} />
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity
              style={[styles.iconBtn, { borderColor: Colors.errorBg }]}
              onPress={() => handleDeleteListing(item.id, item.title)}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Listings</Text>
          <Text style={styles.headerSubtitle}>
            {myListings.length} {myListings.length === 1 ? "plot" : "plots"} published
          </Text>
        </View>

        <TouchableOpacity
          style={styles.postBtn}
          onPress={() => navigation.navigate("CreateListing")}
        >
          <Ionicons name="add" size={18} color={Colors.ivory} />
          <Text style={styles.postBtnText}>Post Land</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.emerald} style={{ marginTop: 40 }} />
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
              <Ionicons name="home-outline" size={56} color={Colors.sand} />
              <Text style={styles.emptyEyebrow}>NO LISTINGS YET</Text>
              <Text style={styles.emptyBody}>
                Tap "Post Land" above to create your first property listing.
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
    backgroundColor: Colors.alabaster,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.ivory,
    borderBottomWidth: 1,
    borderBottomColor: Colors.sand,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.charcoal,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.slate,
    marginTop: 2,
  },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.emerald,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 5,
  },
  postBtnText: {
    color: Colors.ivory,
    fontWeight: "700",
    fontSize: 13,
  },
  listContent: {
    padding: 16,
  },
  card: {
    flexDirection: "row",
    backgroundColor: Colors.ivory,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardThumb: {
    width: 85,
    height: 85,
    borderRadius: 10,
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.charcoal,
    flex: 1,
    marginRight: 8,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.gold,
    marginTop: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: Colors.slate,
    marginTop: 3,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  iconBtn: {
    padding: 7,
    borderWidth: 1,
    borderColor: Colors.sand,
    borderRadius: 7,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 30,
  },
  emptyEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.slate,
    letterSpacing: 1.2,
    marginTop: 16,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: "center",
  },
});
