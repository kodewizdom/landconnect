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
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { useListingStore } from "../../store/useListingStore";
import { Listing, AreaUnit, ListingStatus } from "../../types/listing";
import { Colors, formatINR, Shadows, Radii } from "../../theme";

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

  const renderStatusPill = (status: ListingStatus) => {
    const bg =
      status === "available"
        ? Colors.success
        : status === "negotiation"
        ? Colors.warning
        : Colors.error;
    const label =
      status === "available"
        ? "AVAILABLE"
        : status === "negotiation"
        ? "NEGOTIATION"
        : "SOLD";
    return (
      <View style={[styles.statusPill, { backgroundColor: bg }]}>
        <Text style={styles.statusPillText}>{label}</Text>
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
          {/* Status pill top-left */}
          <View style={styles.badgeTopLeft}>{renderStatusPill(item.status)}</View>
          {/* Price tag bottom-right */}
          <View style={styles.priceTag}>
            <Text style={styles.priceTagText}>{formatINR(item.price)}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="expand-outline" size={15} color={Colors.gold} />
              <Text style={styles.metaText}>
                {item.area_size} {item.area_unit.toUpperCase()}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={15} color={Colors.slate} />
              <Text style={styles.metaLocationText} numberOfLines={1}>
                {item.address_text}
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.ownerInfo}>
              <Ionicons name="person-circle-outline" size={18} color={Colors.slate} />
              <Text style={styles.ownerName}>
                {item.owner?.full_name || "Verified Member"}
              </Text>
              <View style={styles.roleChip}>
                <Text style={styles.roleChipText}>
                  {item.owner?.role?.toUpperCase() || "OWNER"}
                </Text>
              </View>
            </View>

            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={12} color={Colors.muted} />
              <Text style={styles.timeText}>
                {item.created_at
                  ? new Date(item.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })
                  : "Recent"}
              </Text>
            </View>
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

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={Colors.slate} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by location, keyword..."
          placeholderTextColor={Colors.muted}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <Ionicons name="close-circle-outline" size={18} color={Colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* View mode toggle + filter row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.toggleRow}
        contentContainerStyle={styles.toggleRowContent}
      >
        <TouchableOpacity
          style={[styles.togglePill, viewMode === "list" && styles.togglePillActive]}
          onPress={() => setViewMode("list")}
        >
          <Ionicons
            name="list-outline"
            size={14}
            color={viewMode === "list" ? Colors.ivory : Colors.slate}
            style={{ marginRight: 5 }}
          />
          <Text
            style={[
              styles.togglePillText,
              viewMode === "list" && styles.togglePillTextActive,
            ]}
          >
            List
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.togglePill, viewMode === "map" && styles.togglePillActive]}
          onPress={() => setViewMode("map")}
        >
          <Ionicons
            name="map-outline"
            size={14}
            color={viewMode === "map" ? Colors.ivory : Colors.slate}
            style={{ marginRight: 5 }}
          />
          <Text
            style={[
              styles.togglePillText,
              viewMode === "map" && styles.togglePillTextActive,
            ]}
          >
            Map
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, hasActiveFilters && { borderColor: Colors.gold }]}
          onPress={() => setIsFilterModalVisible(true)}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={hasActiveFilters ? Colors.gold : Colors.slate}
          />
        </TouchableOpacity>
      </ScrollView>

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
                <Ionicons name="business-outline" size={56} color={Colors.sand} />
                <Text style={styles.emptyEyebrow}>NO LISTINGS FOUND</Text>
                <Text style={styles.emptyBody}>
                  Try adjusting your search or filters
                </Text>
              </View>
            ) : undefined
          }
          ListFooterComponent={
            isLoading ? (
              <ActivityIndicator
                size="small"
                color={Colors.emerald}
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
                  <Text style={styles.mapPinText}>{formatINR(item.price)}</Text>
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
                  <Text style={styles.bottomCardPrice}>
                    {formatINR(selectedMapListing.price)}
                  </Text>
                  <Text style={styles.bottomCardTitle} numberOfLines={1}>
                    {selectedMapListing.title}
                  </Text>
                  <Text style={styles.bottomCardMeta} numberOfLines={1}>
                    {selectedMapListing.area_size} {selectedMapListing.area_unit} •{" "}
                    {selectedMapListing.address_text}
                  </Text>
                </View>
                <View style={styles.bottomCardCTA}>
                  <Ionicons name="arrow-forward-circle" size={28} color={Colors.gold} />
                </View>

                <TouchableOpacity
                  style={styles.closePreviewBtn}
                  onPress={() => setSelectedMapListing(null)}
                >
                  <Ionicons name="close" size={16} color={Colors.slate} />
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
            {/* Handle */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalEyebrow}>REFINE SEARCH</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.charcoal} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalTitle}>Filter Listings</Text>

            {/* Price Range */}
            <Text style={styles.filterSectionLabel}>PRICE RANGE (₹)</Text>
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.filterInput, { flex: 1, marginRight: 8 }]}
                placeholder="Min Price"
                placeholderTextColor={Colors.muted}
                keyboardType="numeric"
                value={filterMinPrice}
                onChangeText={setFilterMinPrice}
              />
              <TextInput
                style={[styles.filterInput, { flex: 1 }]}
                placeholder="Max Price"
                placeholderTextColor={Colors.muted}
                keyboardType="numeric"
                value={filterMaxPrice}
                onChangeText={setFilterMaxPrice}
              />
            </View>

            {/* Area Unit */}
            <Text style={styles.filterSectionLabel}>AREA UNIT</Text>
            <View style={styles.chipGroup}>
              {(["acre", "sqft", "gunta", "ha"] as AreaUnit[]).map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[styles.chip, filterUnit === unit && styles.chipActive]}
                  onPress={() => setFilterUnit(filterUnit === unit ? undefined : unit)}
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
            <Text style={styles.filterSectionLabel}>AVAILABILITY</Text>
            <View style={styles.chipGroup}>
              {(["available", "negotiation", "sold"] as ListingStatus[]).map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.chip, filterStatus === st && styles.chipActive]}
                  onPress={() => setFilterStatus(filterStatus === st ? undefined : st)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filterStatus === st && styles.chipTextActive,
                    ]}
                  >
                    {st === "available"
                      ? "AVAILABLE"
                      : st === "negotiation"
                      ? "NEGOTIATION"
                      : "SOLD"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Action buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.resetBtn} onPress={handleResetFilters}>
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.applyBtn} onPress={handleApplyFilters}>
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
    backgroundColor: Colors.alabaster,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.ivory,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.sand,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.charcoal,
  },
  toggleRow: {
    paddingBottom: 8,
  },
  toggleRowContent: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  togglePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.alabaster,
    borderWidth: 1,
    borderColor: Colors.sand,
  },
  togglePillActive: {
    backgroundColor: Colors.emerald,
    borderColor: Colors.emerald,
  },
  togglePillText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.slate,
  },
  togglePillTextActive: {
    color: Colors.ivory,
  },
  filterBtn: {
    borderWidth: 1,
    borderColor: Colors.sand,
    borderRadius: 8,
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 16,
    backgroundColor: Colors.ivory,
    marginHorizontal: 16,
    marginBottom: 14,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  cardImageContainer: {
    height: 200,
    width: "100%",
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  badgeTopLeft: {
    position: "absolute",
    top: 10,
    left: 10,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    color: Colors.ivory,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  priceTag: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(11,43,38,0.88)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priceTagText: {
    color: Colors.gold,
    fontWeight: "700",
    fontSize: 15,
  },
  cardBody: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.charcoal,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.charcoal,
    marginLeft: 4,
  },
  metaLocationText: {
    fontSize: 13,
    color: Colors.slate,
    marginLeft: 4,
    maxWidth: 160,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.sand,
    paddingTop: 10,
  },
  ownerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  ownerName: {
    fontSize: 13,
    color: Colors.charcoal,
    marginLeft: 6,
    fontWeight: "500",
  },
  roleChip: {
    backgroundColor: Colors.goldLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  roleChipText: {
    fontSize: 9,
    color: Colors.warning,
    fontWeight: "700",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  timeText: {
    fontSize: 11,
    color: Colors.muted,
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
    marginTop: 12,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: "center",
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapPin: {
    backgroundColor: Colors.emerald,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderColor: Colors.gold,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  mapPinText: {
    color: Colors.ivory,
    fontSize: 11,
    fontWeight: "700",
  },
  bottomCardWrapper: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
  },
  bottomCard: {
    flexDirection: "row",
    backgroundColor: Colors.ivory,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    alignItems: "center",
  },
  bottomCardThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  bottomCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bottomCardPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.gold,
  },
  bottomCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.charcoal,
    marginTop: 2,
  },
  bottomCardMeta: {
    fontSize: 12,
    color: Colors.slate,
    marginTop: 2,
  },
  bottomCardCTA: {
    marginLeft: 8,
  },
  closePreviewBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlayLight,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.ivory,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.sand,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modalEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: Colors.slate,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.charcoal,
    marginBottom: 16,
  },
  filterSectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: Colors.slate,
    marginTop: 16,
    marginBottom: 10,
  },
  rowInputs: {
    flexDirection: "row",
  },
  filterInput: {
    borderWidth: 1,
    borderColor: Colors.sand,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.charcoal,
    backgroundColor: Colors.alabaster,
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Colors.alabaster,
    borderWidth: 1,
    borderColor: Colors.sand,
  },
  chipActive: {
    backgroundColor: Colors.goldLight,
    borderColor: Colors.gold,
  },
  chipText: {
    fontSize: 12,
    color: Colors.slate,
    fontWeight: "600",
  },
  chipTextActive: {
    color: Colors.warning,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  resetBtn: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 13,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.sand,
    alignItems: "center",
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.slate,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 8,
    backgroundColor: Colors.emerald,
    alignItems: "center",
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.ivory,
  },
});
