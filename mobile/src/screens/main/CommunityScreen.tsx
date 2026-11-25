import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Keyboard,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../../types/navigation";
import { useListingStore } from "../../store/useListingStore";
import { useAuthStore } from "../../store/useAuthStore";
import { Listing, AreaUnit, ListingStatus, ListingFilters } from "../../types/listing";
import { Colors, formatAED, Shadows, Radii } from "../../theme";
import { formatRoleBadge } from "../../utils/roleLabel";

const { width } = Dimensions.get("window");

type FilterChipKey = keyof Pick<
  ListingFilters,
  "search" | "minPrice" | "maxPrice" | "areaUnit" | "status"
>;

export const CommunityScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  const {
    listings,
    hasMore,
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const isFetchingRef = useRef(false);
  const prevUserIdRef = useRef<string | null>(currentUserId);

  // Filter Modal Draft State
  const [filterMinPrice, setFilterMinPrice] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");
  const [filterUnit, setFilterUnit] = useState<AreaUnit | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<ListingStatus | undefined>(undefined);

  useEffect(() => {
    fetchListings(true);
  }, [fetchListings]);

  // Reset all filters & reload clean feed when user logs out or switches accounts
  useEffect(() => {
    if (prevUserIdRef.current !== currentUserId) {
      prevUserIdRef.current = currentUserId;
      isFetchingRef.current = false;
      setLoadingMore(false);
      setSearchText("");
      setFilterMinPrice("");
      setFilterMaxPrice("");
      setFilterUnit(undefined);
      setFilterStatus(undefined);
      setSelectedMapListing(null);
      clearFilters();
    }
  }, [currentUserId, clearFilters]);

  // Keep draft inputs aligned with currently active filters when opening the Filter modal
  useEffect(() => {
    if (!isFilterModalVisible) return;
    setFilterMinPrice(
      filters.minPrice !== undefined && !isNaN(filters.minPrice)
        ? String(filters.minPrice)
        : ""
    );
    setFilterMaxPrice(
      filters.maxPrice !== undefined && !isNaN(filters.maxPrice)
        ? String(filters.maxPrice)
        : ""
    );
    setFilterUnit(filters.areaUnit);
    setFilterStatus(filters.status);
  }, [isFilterModalVisible, filters]);

  // Track Android keyboard height so Filter modal inputs stay clear of Gboard & 3-button nav
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: FilterChipKey; label: string }> = [];
    if (filters.search?.trim()) {
      chips.push({ key: "search", label: `"${filters.search.trim()}"` });
    }
    if (filters.minPrice !== undefined && !isNaN(filters.minPrice)) {
      chips.push({ key: "minPrice", label: `Min ${formatAED(filters.minPrice)}` });
    }
    if (filters.maxPrice !== undefined && !isNaN(filters.maxPrice)) {
      chips.push({ key: "maxPrice", label: `Max ${formatAED(filters.maxPrice)}` });
    }
    if (filters.areaUnit) {
      chips.push({ key: "areaUnit", label: filters.areaUnit.toUpperCase() });
    }
    if (filters.status) {
      chips.push({ key: "status", label: filters.status.toUpperCase() });
    }
    return chips;
  }, [filters]);

  const hasActiveFilters = activeFilterChips.length > 0;
  const effectiveHasMore = hasMore && listings.length > 0;

  const handleClearAllFilters = useCallback(() => {
    isFetchingRef.current = false;
    setLoadingMore(false);
    setSearchText("");
    setFilterMinPrice("");
    setFilterMaxPrice("");
    setFilterUnit(undefined);
    setFilterStatus(undefined);
    clearFilters();
  }, [clearFilters]);

  const handleRemoveSingleFilter = useCallback(
    (key: FilterChipKey) => {
      const remaining = activeFilterChips.filter((chip) => chip.key !== key);
      if (remaining.length === 0) {
        handleClearAllFilters();
        return;
      }

      isFetchingRef.current = false;
      setLoadingMore(false);
      if (key === "search") setSearchText("");
      if (key === "minPrice") setFilterMinPrice("");
      if (key === "maxPrice") setFilterMaxPrice("");
      if (key === "areaUnit") setFilterUnit(undefined);
      if (key === "status") setFilterStatus(undefined);

      setFilters({ [key]: undefined });
    },
    [activeFilterChips, handleClearAllFilters, setFilters]
  );

  const handleSearchSubmit = () => {
    isFetchingRef.current = false;
    setLoadingMore(false);
    setFilters({ search: searchText.trim() || undefined });
  };

  const handleClearSearchInput = () => {
    setSearchText("");
    if (filters.search?.trim()) {
      handleRemoveSingleFilter("search");
    }
  };

  const handleApplyFilters = () => {
    Keyboard.dismiss();
    const cleanedMin = filterMinPrice.replace(/,/g, "").trim();
    const cleanedMax = filterMaxPrice.replace(/,/g, "").trim();
    const parsedMin = cleanedMin ? parseFloat(cleanedMin) : undefined;
    const parsedMax = cleanedMax ? parseFloat(cleanedMax) : undefined;
    const validMin = parsedMin !== undefined && !isNaN(parsedMin) && parsedMin > 0 ? parsedMin : undefined;
    const validMax = parsedMax !== undefined && !isNaN(parsedMax) && parsedMax > 0 ? parsedMax : undefined;

    isFetchingRef.current = false;
    setLoadingMore(false);

    if (
      !searchText.trim() &&
      validMin === undefined &&
      validMax === undefined &&
      !filterUnit &&
      !filterStatus
    ) {
      clearFilters();
    } else {
      setFilters({
        search: searchText.trim() || undefined,
        minPrice: validMin,
        maxPrice: validMax,
        areaUnit: filterUnit,
        status: filterStatus,
      });
    }
    setIsFilterModalVisible(false);
  };

  const handleResetFilters = () => {
    Keyboard.dismiss();
    handleClearAllFilters();
    setIsFilterModalVisible(false);
  };

  const handleRefresh = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      await fetchListings(true);
    } finally {
      isFetchingRef.current = false;
      setLoadingMore(false);
    }
  }, [fetchListings]);

  const handleLoadMore = useCallback(async () => {
    if (
      !effectiveHasMore ||
      isLoading ||
      isRefreshing ||
      loadingMore ||
      isFetchingRef.current
    ) {
      return;
    }
    isFetchingRef.current = true;
    setLoadingMore(true);
    try {
      await fetchListings(false);
    } finally {
      isFetchingRef.current = false;
      setLoadingMore(false);
    }
  }, [effectiveHasMore, isLoading, isRefreshing, loadingMore, fetchListings]);

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
            <Text style={styles.priceTagText}>{formatAED(item.price)}</Text>
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
                  {formatRoleBadge(item.owner?.role)}
                </Text>
              </View>
            </View>

            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={12} color={Colors.muted} />
              <Text style={styles.timeText}>
                {item.created_at
                  ? new Date(item.created_at).toLocaleDateString("en-US", {
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

  // Center map viewport across the UAE
  const initialRegion = {
    latitude: 24.95,
    longitude: 55.15,
    latitudeDelta: 1.8,
    longitudeDelta: 1.8,
  };

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
          <TouchableOpacity onPress={handleClearSearchInput}>
            <Ionicons name="close-circle-outline" size={18} color={Colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* View mode toggle + filter row (fixed natural height) */}
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
          style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}
          onPress={() => setIsFilterModalVisible(true)}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={hasActiveFilters ? Colors.gold : Colors.slate}
          />
          {hasActiveFilters && <View style={styles.filterActiveDot} />}
        </TouchableOpacity>
      </ScrollView>

      {/* Compact Active Filters Strip + 1-Tap Clear All */}
      {hasActiveFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activeFiltersRow}
          contentContainerStyle={styles.activeFiltersContent}
        >
          {activeFilterChips.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              style={styles.activeChip}
              onPress={() => handleRemoveSingleFilter(chip.key)}
              activeOpacity={0.75}
            >
              <Text style={styles.activeChipText}>{chip.label}</Text>
              <Ionicons name="close" size={13} color={Colors.warning} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.clearAllChip}
            onPress={handleClearAllFilters}
            activeOpacity={0.8}
          >
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Main View: List or Map */}
      {viewMode === "list" ? (
        isLoading && listings.length === 0 ? (
          <View style={styles.initialLoaderContainer}>
            <ActivityIndicator size="large" color={Colors.emerald} />
          </View>
        ) : (
          <FlatList
            data={listings}
            keyExtractor={(item) => item.id}
            renderItem={renderListingCard}
            contentContainerStyle={styles.listContent}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="business-outline" size={56} color={Colors.sand} />
                <Text style={styles.emptyEyebrow}>NO LISTINGS FOUND</Text>
                <Text style={styles.emptyBody}>
                  Try adjusting your search or filters
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity
                    style={styles.emptyResetBtn}
                    onPress={handleClearAllFilters}
                  >
                    <Text style={styles.emptyResetText}>Clear Filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            ListFooterComponent={
              loadingMore && effectiveHasMore ? (
                <ActivityIndicator
                  size="small"
                  color={Colors.emerald}
                  style={{ marginVertical: 20 }}
                />
              ) : undefined
            }
          />
        )
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
                  <Text style={styles.mapPinText}>{formatAED(item.price)}</Text>
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
                    {formatAED(selectedMapListing.price)}
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
          <View
            style={[
              styles.modalCard,
              {
                marginBottom: Platform.OS === "android" ? keyboardHeight : 0,
                paddingBottom: keyboardHeight > 0 ? 16 : Math.max(insets.bottom, 20),
              },
            ]}
          >
            {/* Handle */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalEyebrow}>REFINE SEARCH</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.charcoal} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalTitle}>Filter Listings</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Price Range */}
              <Text style={styles.filterSectionLabel}>PRICE RANGE (AED)</Text>
              <View style={styles.rowInputs}>
                <TextInput
                  style={[styles.filterInput, { flex: 1, marginRight: 8 }]}
                  placeholder="Min Price (AED)"
                  placeholderTextColor={Colors.muted}
                  keyboardType="numeric"
                  value={filterMinPrice}
                  onChangeText={setFilterMinPrice}
                />
                <TextInput
                  style={[styles.filterInput, { flex: 1 }]}
                  placeholder="Max Price (AED)"
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
    flexGrow: 0,
    flexShrink: 0,
    paddingBottom: 8,
  },
  toggleRowContent: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activeFiltersRow: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 8,
  },
  activeFiltersContent: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.goldLight,
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.warning,
  },
  clearAllChip: {
    backgroundColor: Colors.emerald,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  clearAllText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.ivory,
  },
  initialLoaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyResetBtn: {
    marginTop: 14,
    backgroundColor: Colors.emerald,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  emptyResetText: {
    color: Colors.ivory,
    fontSize: 13,
    fontWeight: "700",
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
    position: "relative",
    borderWidth: 1,
    borderColor: Colors.sand,
    borderRadius: 8,
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBtnActive: {
    borderColor: Colors.gold,
    backgroundColor: Colors.goldLight,
  },
  filterActiveDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.gold,
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
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: "85%",
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
