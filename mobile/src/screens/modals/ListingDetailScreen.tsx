import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { useListingStore } from "../../store/useListingStore";
import { useAuthStore } from "../../store/useAuthStore";
import { roomApi } from "../../api/room.api";

type Props = NativeStackScreenProps<RootStackParamList, "ListingDetail">;

const { width } = Dimensions.get("window");

export const ListingDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { listingId } = route.params;
  const { selectedListing, fetchListingById, isLoading } = useListingStore();
  const { user: currentUser } = useAuthStore();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isInquiring, setIsInquiring] = useState(false);

  useEffect(() => {
    fetchListingById(listingId);
  }, [listingId]);

  const handleInquireChat = async () => {
    if (!selectedListing || !selectedListing.owner) return;

    if (currentUser?.id === selectedListing.owner_id) {
      Alert.alert("Your Listing", "You are the creator of this land listing.");
      return;
    }

    setIsInquiring(true);
    try {
      const room = await roomApi.createOrGetRoom({
        listingId: selectedListing.id,
        participantIds: [selectedListing.owner_id],
        type: "direct",
      });

      navigation.navigate("ChatRoom", {
        roomId: room.id,
        title: selectedListing.title,
      });
    } catch (err: any) {
      Alert.alert(
        "Chat Room Error",
        err.response?.data?.error || err.message || "Could not open inquiry room."
      );
    } finally {
      setIsInquiring(false);
    }
  };

  const handleCall = (callType: "audio" | "video") => {
    if (currentUser?.id === selectedListing?.owner_id) {
      Alert.alert("Your Listing", "You cannot call yourself.");
      return;
    }
    Alert.alert(
      `${callType === "audio" ? "Audio" : "Video"} Call`,
      `Starting in-app ${callType} call with ${selectedListing?.owner?.full_name}...`,
      [
        {
          text: "Open Room Chat First",
          onPress: handleInquireChat,
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  if (isLoading || !selectedListing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1b5e20" />
      </View>
    );
  }

  const images =
    selectedListing.images && selectedListing.images.length > 0
      ? selectedListing.images
      : [
          {
            id: "fallback",
            image_url:
              "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
            sort_order: 0,
          },
        ];

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} Lakh`;
    return `₹${price.toLocaleString("en-IN")}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Swipeable Photo Gallery */}
        <View style={styles.galleryContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const slide = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveImageIndex(slide);
            }}
            scrollEventThrottle={16}
          >
            {images.map((img, idx) => (
              <Image key={img.id || idx} source={{ uri: img.image_url }} style={styles.galleryImage} />
            ))}
          </ScrollView>

          {/* Pagination dots */}
          {images.length > 1 && (
            <View style={styles.dotsContainer}>
              {images.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    activeImageIndex === idx && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          )}

          {/* Status Badge Over Image */}
          <View style={styles.floatingStatus}>
            <Text style={styles.floatingStatusText}>
              {selectedListing.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Content Body */}
        <View style={styles.body}>
          <Text style={styles.price}>{formatPrice(selectedListing.price)}</Text>
          <Text style={styles.title}>{selectedListing.title}</Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={16} color="#1b5e20" />
            <Text style={styles.locationText}>{selectedListing.address_text}</Text>
          </View>

          {/* Specs Grid */}
          <View style={styles.specsCard}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Area Size</Text>
              <Text style={styles.specValue}>{selectedListing.area_size}</Text>
            </View>

            <View style={styles.specDivider} />

            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Unit</Text>
              <Text style={styles.specValue}>{selectedListing.area_unit.toUpperCase()}</Text>
            </View>

            <View style={styles.specDivider} />

            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Status</Text>
              <Text style={styles.specValue}>
                {selectedListing.status === "available"
                  ? "Available"
                  : selectedListing.status === "negotiation"
                  ? "Negotiating"
                  : "Sold"}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.sectionHeading}>Property Overview</Text>
          <Text style={styles.description}>{selectedListing.description}</Text>

          {/* Embedded Mini Map Preview */}
          <Text style={styles.sectionHeading}>Location on Map</Text>
          <View style={styles.miniMapContainer}>
            <MapView
              provider={PROVIDER_DEFAULT}
              style={styles.miniMap}
              initialRegion={{
                latitude: selectedListing.latitude,
                longitude: selectedListing.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: selectedListing.latitude,
                  longitude: selectedListing.longitude,
                }}
              />
            </MapView>
            <View style={styles.coordsOverlay}>
              <Text style={styles.coordsText}>
                GPS: {selectedListing.latitude.toFixed(4)}, {selectedListing.longitude.toFixed(4)}
              </Text>
            </View>
          </View>

          {/* Owner Card (Strictly Zero PII) */}
          <Text style={styles.sectionHeading}>Listed By</Text>
          <View style={styles.ownerCard}>
            <Ionicons name="person-circle" size={48} color="#1b5e20" />
            <View style={styles.ownerDetails}>
              <Text style={styles.ownerName}>
                {selectedListing.owner?.full_name || "Verified Land Seller"}
              </Text>
              <View style={styles.ownerBadgeRow}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>
                    {selectedListing.owner?.role?.toUpperCase() || "SELLER"}
                  </Text>
                </View>
                <View style={styles.onlineBadge}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>In-App Available</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.callIconBtn}
          onPress={() => handleCall("audio")}
        >
          <Ionicons name="call-outline" size={20} color="#1b5e20" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.callIconBtn}
          onPress={() => handleCall("video")}
        >
          <Ionicons name="videocam-outline" size={20} color="#1b5e20" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.inquireBtn, isInquiring && styles.btnDisabled]}
          onPress={handleInquireChat}
          disabled={isInquiring}
        >
          {isInquiring ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.inquireBtnText}>Inquire / Chat</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  galleryContainer: {
    width: "100%",
    height: 280,
    position: "relative",
  },
  galleryImage: {
    width,
    height: 280,
    resizeMode: "cover",
  },
  dotsContainer: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    marginHorizontal: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: "#fff",
  },
  floatingStatus: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  floatingStatusText: {
    color: "#a5d6a7",
    fontWeight: "bold",
    fontSize: 12,
  },
  body: {
    padding: 20,
  },
  price: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1b5e20",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#222",
    marginTop: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  locationText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
    flex: 1,
  },
  specsCard: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 14,
    marginTop: 18,
    alignItems: "center",
  },
  specItem: {
    flex: 1,
    alignItems: "center",
  },
  specDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#e5e7eb",
  },
  specLabel: {
    fontSize: 12,
    color: "#777",
  },
  specValue: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#222",
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginTop: 22,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: "#4b5563",
  },
  miniMapContainer: {
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 6,
  },
  miniMap: {
    width: "100%",
    height: "100%",
  },
  coordsOverlay: {
    position: "absolute",
    bottom: 6,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  coordsText: {
    fontSize: 11,
    color: "#333",
    fontWeight: "600",
  },
  ownerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    marginTop: 6,
  },
  ownerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#166534",
  },
  ownerBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: "#166534",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  roleBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
    marginRight: 4,
  },
  onlineText: {
    fontSize: 11,
    color: "#15803d",
    fontWeight: "500",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
  },
  callIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  inquireBtn: {
    flex: 1,
    backgroundColor: "#1b5e20",
    height: 46,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.7,
  },
  inquireBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});
