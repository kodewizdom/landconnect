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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../../types/navigation";
import { useListingStore } from "../../store/useListingStore";
import { useAuthStore } from "../../store/useAuthStore";
import { roomApi } from "../../api/room.api";
import { Colors, formatAED } from "../../theme";
import { formatRoleBadge, formatRoleLabel } from "../../utils/roleLabel";

type Props = NativeStackScreenProps<RootStackParamList, "ListingDetail">;

const { width } = Dimensions.get("window");

export const ListingDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { listingId } = route.params;
  const insets = useSafeAreaInsets();
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
        <ActivityIndicator size="large" color={Colors.emerald} />
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

  const statusColor =
    selectedListing.status === "available"
      ? Colors.success
      : selectedListing.status === "negotiation"
      ? Colors.warning
      : Colors.error;

  const statusLabel =
    selectedListing.status === "available"
      ? "AVAILABLE"
      : selectedListing.status === "negotiation"
      ? "NEGOTIATION"
      : "SOLD";

  const bottomBarPaddingBottom = Math.max(insets.bottom, 16) + 12;
  const messageCtaLabel =
    formatRoleLabel(selectedListing.owner?.role) === "Broker"
      ? "Message Broker"
      : "Message Owner";

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomBarPaddingBottom + 96 },
        ]}
      >
        {/* Full-bleed Image Gallery */}
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
              <Image
                key={img.id || idx}
                source={{ uri: img.image_url }}
                style={styles.galleryImage}
              />
            ))}
          </ScrollView>

          {/* Pagination dots */}
          {images.length > 1 && (
            <View style={styles.dotsContainer}>
              {images.map((_, idx) => (
                <View
                  key={idx}
                  style={[styles.dot, activeImageIndex === idx && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Price Hero Block */}
        <View style={styles.priceHero}>
          <View style={[styles.heroStatusPill, { backgroundColor: statusColor }]}>
            <Text style={styles.heroStatusText}>{statusLabel}</Text>
          </View>
          <Text style={styles.heroPrice}>{formatAED(selectedListing.price)}</Text>
          <Text style={styles.heroTitle}>{selectedListing.title}</Text>
        </View>

        {/* Property Details Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardEyebrow}>PROPERTY DETAILS</Text>

          <View style={styles.specsGrid}>
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
              <Text style={[styles.specValue, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionEyebrow}>OVERVIEW</Text>
          <Text style={styles.description}>{selectedListing.description}</Text>
        </View>

        {/* Location Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardEyebrow}>LOCATION</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={16} color={Colors.gold} />
            <Text style={styles.locationText}>{selectedListing.address_text}</Text>
          </View>

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
                GPS: {selectedListing.latitude.toFixed(4)},{" "}
                {selectedListing.longitude.toFixed(4)}
              </Text>
            </View>
          </View>
        </View>

        {/* Owner Card — Zero PII */}
        <View style={styles.infoCard}>
          <Text style={styles.cardEyebrow}>LISTED BY</Text>
          <View style={styles.ownerRow}>
            <Ionicons name="person-circle" size={48} color={Colors.emerald} />
            <View style={styles.ownerDetails}>
              <Text style={styles.ownerName}>
                {selectedListing.owner?.full_name || "Verified Land Owner"}
              </Text>
              <View style={styles.ownerBadgeRow}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>
                    {formatRoleBadge(selectedListing.owner?.role)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.piiProtectedRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color={Colors.success} />
            <Text style={styles.piiProtectedText}>Contact details protected</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: bottomBarPaddingBottom }]}>
        <TouchableOpacity
          style={styles.callIconBtn}
          onPress={() => handleCall("audio")}
        >
          <Ionicons name="call-outline" size={20} color={Colors.gold} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.callIconBtn}
          onPress={() => handleCall("video")}
        >
          <Ionicons name="videocam-outline" size={20} color={Colors.gold} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.inquireBtn, isInquiring && styles.btnDisabled]}
          onPress={handleInquireChat}
          disabled={isInquiring}
        >
          {isInquiring ? (
            <ActivityIndicator color={Colors.ivory} size="small" />
          ) : (
            <>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color={Colors.ivory}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.inquireBtnText}>{messageCtaLabel}</Text>
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
    backgroundColor: Colors.alabaster,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.alabaster,
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
    backgroundColor: Colors.ivory,
  },
  priceHero: {
    backgroundColor: Colors.emerald,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  heroStatusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  heroStatusText: {
    color: Colors.ivory,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  heroPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.gold,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.ivory,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: Colors.ivory,
    borderRadius: 16,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: Colors.slate,
    marginBottom: 14,
  },
  specsGrid: {
    flexDirection: "row",
    alignItems: "center",
  },
  specItem: {
    flex: 1,
    alignItems: "center",
  },
  specDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.sand,
  },
  specLabel: {
    fontSize: 11,
    color: Colors.slate,
    marginBottom: 4,
  },
  specValue: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.charcoal,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.sand,
    marginVertical: 14,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: Colors.slate,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.slate,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: Colors.charcoal,
    marginLeft: 6,
    flex: 1,
  },
  miniMapContainer: {
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.sand,
  },
  miniMap: {
    width: "100%",
    height: "100%",
  },
  coordsOverlay: {
    position: "absolute",
    bottom: 6,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.90)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  coordsText: {
    fontSize: 11,
    color: Colors.charcoal,
    fontWeight: "600",
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ownerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.charcoal,
  },
  ownerBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  roleBadge: {
    backgroundColor: Colors.emerald,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    color: Colors.ivory,
    fontSize: 10,
    fontWeight: "700",
  },
  piiProtectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.sand,
  },
  piiProtectedText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: "500",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.ivory,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.sand,
    flexDirection: "row",
    alignItems: "center",
  },
  callIconBtn: {
    width: 46,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gold,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  inquireBtn: {
    flex: 1,
    backgroundColor: Colors.emerald,
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
    color: Colors.ivory,
    fontWeight: "700",
    fontSize: 15,
  },
});
