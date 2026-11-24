import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { useListingStore } from "../../store/useListingStore";
import { Listing, AreaUnit, ListingStatus } from "../../types/listing";

const { width } = Dimensions.get("window");

export const CommunityScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    listings,
    isLoading,
    isRefreshing,
    filters,
    fetchListings,
    setFilters,
    clearFilters,
  } = useListingStore();

  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [searchText, setSearchText] = useState("");
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [selectedMapListing, setSelectedMapListing] = useState<Listing | null>(null);

  // Filter Modal State
  const [filterMinPrice, setFilterMinPrice] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");
  const [filterUnit, setFilterUnit] = useState<AreaUnit | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<ListingStatus | undefined>(undefined);

  useEffect(() => {
    fetchListings(true);
  }, []);

  const handleSearchSubmit = () => {
    setFilters({ search: searchText.trim() || undefined });
  };

  const handleApplyFilters = () => {
    setFilters({
      minPrice: filterMinPrice ? parseFloat(filterMinPrice) : undefined,
      maxPrice: filterMaxPrice ? parseFloat(filterMaxPrice) : undefined,
      areaUnit: filterUnit,
      status: filterStatus,
    });
    setIsFilterModalVisible(false);
  };

  const handleResetFilters = () => {
    setFilterMinPrice("");
    setFilterMaxPrice("");
    setFilterUnit(undefined);
    setFilterStatus(undefined);
    setSearchText("");
    clearFilters();
    setIsFilterModalVisible(false);
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    if (price >= 100000) {
      return `₹${(price / 100000).toFixed(2)} Lakh`;
    }
    return `₹${price.toLocaleString("en-IN")}`;
  };

  const renderStatusBadge = (status: ListingStatus) => {
    const bg =
      status === "available"
        ? "#e8f5e9"
        : status === "negotiation"
        ? "#fff3e0"
        : "#ffebee";
    const color =
      status === "available"
        ? "#2e7d32"
        : status === "negotiation"
        ? "#e65100"
        : "#c62828";
    const label =
      status === "available"
        ? "Available"
        : status === "negotiation"
        ? "In Negotiation"
        : "Sold";

    return (
      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
        <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
      </View>
    );
  };

  const renderListingCard = ({ item }: { item: Listing }) => {
    const coverImage =
      item.images && item.images.length > 0
        ? item.images[0].image_url
        : "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => navigation.navigate("ListingDetail", { listingId: item.id })}
      >
        <View style={styles.cardImageContainer}>
          <Image source={{ uri: coverImage }} style={styles.cardImage} />
          <View style={styles.badgeTopLeft}>{renderStatusBadge(item.status)}</View>
          <View style={styles.priceTag}>
            <Text style={styles.priceTagText}>{formatPrice(item.price)}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="expand-outline" size={15} color="#1b5e20" />
              <Text style={styles.metaText}>
                {item.area_size} {item.area_unit.toUpperCase()}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={15} color="#666" />
              <Text style={styles.metaLocationText} numberOfLines={1}>
                {item.address_text}
              </Text>
            </View>
          </View>

          {/* Owner info */}
          <View style={styles.cardFooter}>
            <View style={styles.ownerInfo}>
              <Ionicons name="person-circle-outline" size={20} color="#1b5e20" />
              <Text style={styles.ownerName}>
                {item.owner?.full_name || "Verified Member"}
              </Text>
              <View style={styles.roleChip}>
                <Text style={styles.roleChipText}>
                  {item.owner?.role?.toUpperCase() || "OWNER"}
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={18} color="#999" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Compute map center
  const initialRegion = {
    latitude: listings.length > 0 ? listings[0].latitude : 12.9716,
    longitude: listings.length > 0 ? listings[0].longitude : 77.5946,
    latitudeDelta: 0.25,
    longitudeDelta: 0.25,
  };

  return (
    <View style={styles.container}>
      {/* Search & Filter Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#666" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by location, keyword..."
            placeholderTextColor="#888"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setIsFilterModalVisible(true)}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={Object.keys(filters).length > 0 ? "#1b5e20" : "#333"}
          />
        </TouchableOpacity>
      </View>

      {/* Segmented View Switcher */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          style={[styles.segmentedBtn, viewMode === "list" && styles.segmentedBtnActive]}
          onPress={() => setViewMode("list")}
        >
          <Ionicons
            name="list-outline"
            size={16}
            color={viewMode === "list" ? "#fff" : "#555"}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.segmentedText,
              viewMode === "list" && styles.segmentedTextActive,
            ]}
          >
            Listings Feed
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentedBtn, viewMode === "map" && styles.segmentedBtnActive]}
          onPress={() => setViewMode("map")}
        >
          <Ionicons
            name="map-outline"
            size={16}
            color={viewMode === "map" ? "#fff" : "#555"}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.segmentedText,
              viewMode === "map" && styles.segmentedTextActive,
            ]}
          >
            Map Pins
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main View: List or Map */}
      {viewMode === "list" ? (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={renderListingCard}
          contentContainerStyle={styles.listContent}
          refreshing={isRefreshing}
          onRefresh={() => fetchListings(true)}
          onEndReached={() => fetchListings(false)}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="leaf-outline" size={54} color="#a5d6a7" />
                <Text style={styles.emptyTitle}>No land listings found</Text>
                <Text style={styles.emptySubtitle}>
                  Try clearing your search keyword or adjust the price & area filters.
                </Text>
              </View>
            ) : undefined
          }
          ListFooterComponent={
            isLoading ? (
              <ActivityIndicator
                size="small"
                color="#1b5e20"
                style={{ marginVertical: 20 }}
              />
            ) : undefined
          }
        />
      ) : (
        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={initialRegion}
            showsUserLocation
            showsMyLocationButton
          >

            {listings.map((item) => (
              <Marker
                key={item.id}
                coordinate={{ latitude: item.latitude, longitude: item.longitude }}
                onPress={() => setSelectedMapListing(item)}
              >
                <View style={styles.mapPin}>
                  <Text style={styles.mapPinText}>{formatPrice(item.price)}</Text>
                </View>
              </Marker>
            ))}
          </MapView>

          {/* Bottom Card Preview for Map Pin */}
          {selectedMapListing && (
            <View style={styles.bottomCardWrapper}>
              <TouchableOpacity
                style={styles.bottomCard}
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate("ListingDetail", {
                    listingId: selectedMapListing.id,
                  })
                }
              >
                <Image
                  source={{
                    uri:
                      selectedMapListing.images?.[0]?.image_url ||
                      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80",
                  }}
                  style={styles.bottomCardThumb}
                />
                <View style={styles.bottomCardInfo}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.bottomCardPrice}>
                      {formatPrice(selectedMapListing.price)}
                    </Text>
                    {renderStatusBadge(selectedMapListing.status)}
                  </View>
                  <Text style={styles.bottomCardTitle} numberOfLines={1}>
                    {selectedMapListing.title}
                  </Text>
                  <Text style={styles.bottomCardLocation} numberOfLines={1}>
                    {selectedMapListing.area_size} {selectedMapListing.area_unit} •{" "}
                    {selectedMapListing.address_text}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.closePreviewBtn}
                  onPress={() => setSelectedMapListing(null)}
                >
                  <Ionicons name="close" size={16} color="#666" />
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Filter Modal */}
      <Modal
        visible={isFilterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Listings</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Price Range */}
            <Text style={styles.filterSectionTitle}>Price Range (₹)</Text>
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="Min Price (₹)"
                keyboardType="numeric"
                value={filterMinPrice}
                onChangeText={setFilterMinPrice}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Max Price (₹)"
                keyboardType="numeric"
                value={filterMaxPrice}
                onChangeText={setFilterMaxPrice}
              />
            </View>

            {/* Area Unit */}
            <Text style={styles.filterSectionTitle}>Area Unit</Text>
            <View style={styles.chipGroup}>
              {(["acre", "sqft", "gunta", "ha"] as AreaUnit[]).map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.chip,
                    filterUnit === unit && styles.chipActive,
                  ]}
                  onPress={() =>
                    setFilterUnit(filterUnit === unit ? undefined : unit)
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      filterUnit === unit && styles.chipTextActive,
                    ]}
                  >
                    {unit.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Status */}
            <Text style={styles.filterSectionTitle}>Availability Status</Text>
            <View style={styles.chipGroup}>
              {(["available", "negotiation", "sold"] as ListingStatus[]).map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.chip,
                    filterStatus === st && styles.chipActive,
                  ]}
                  onPress={() =>
                    setFilterStatus(filterStatus === st ? undefined : st)
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      filterStatus === st && styles.chipTextActive,
                    ]}
                  >
                    {st.charAt(0).toUpperCase() + st.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Action buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={handleResetFilters}
              >
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.applyBtn}
                onPress={handleApplyFilters}
              >
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },
  searchHeader: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    alignItems: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#222",
  },
  filterBtn: {
    marginLeft: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
  },
  segmentedContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  segmentedBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    marginHorizontal: 4,
  },
  segmentedBtnActive: {
    backgroundColor: "#1b5e20",
  },
  segmentedText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
  },
  segmentedTextActive: {
    color: "#fff",
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImageContainer: {
    height: 180,
    width: "100%",
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  badgeTopLeft: {
    position: "absolute",
    top: 10,
    left: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  priceTag: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  priceTagText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  cardBody: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1b5e20",
    marginLeft: 4,
  },
  metaLocationText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 4,
    maxWidth: 160,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 10,
  },
  ownerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  ownerName: {
    fontSize: 13,
    color: "#444",
    marginLeft: 6,
    fontWeight: "500",
  },
  roleChip: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  roleChipText: {
    fontSize: 9,
    color: "#1b5e20",
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    marginTop: 6,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapPin: {
    backgroundColor: "#1b5e20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderColor: "#fff",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  mapPinText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  bottomCardWrapper: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
  },
  bottomCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    alignItems: "center",
  },
  bottomCardThumb: {
    width: 75,
    height: 75,
    borderRadius: 10,
  },
  bottomCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomCardPrice: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1b5e20",
  },
  bottomCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
    marginTop: 2,
  },
  bottomCardLocation: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  closePreviewBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444",
    marginTop: 12,
    marginBottom: 8,
  },
  rowInputs: {
    flexDirection: "row",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d0d7de",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: "#fafbfc",
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipActive: {
    backgroundColor: "#e8f5e9",
    borderColor: "#1b5e20",
  },
  chipText: {
    fontSize: 12,
    color: "#555",
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#1b5e20",
    fontWeight: "bold",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 10,
  },
  resetBtn: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#1b5e20",
    alignItems: "center",
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
});
