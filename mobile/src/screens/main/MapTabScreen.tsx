import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { useListingStore } from "../../store/useListingStore";
import { Listing } from "../../types/listing";

export const MapTabScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { listings } = useListingStore();
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const initialRegion = {
    latitude: listings.length > 0 ? listings[0].latitude : 12.9716,
    longitude: listings.length > 0 ? listings[0].longitude : 77.5946,
    latitudeDelta: 0.35,
    longitudeDelta: 0.35,
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} Lakh`;
    return `₹${price.toLocaleString("en-IN")}`;
  };

  return (
    <View style={styles.container}>
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
            onPress={() => setSelectedListing(item)}
          >
            <View style={styles.markerBadge}>
              <Text style={styles.markerText}>{formatPrice(item.price)}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Floating Bottom Card Preview */}
      {selectedListing && (
        <View style={styles.previewContainer}>
          <TouchableOpacity
            style={styles.previewCard}
            activeOpacity={0.9}
            onPress={() =>
              navigation.navigate("ListingDetail", { listingId: selectedListing.id })
            }
          >
            <Image
              source={{
                uri:
                  selectedListing.images?.[0]?.image_url ||
                  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80",
              }}
              style={styles.previewThumb}
            />

            <View style={styles.previewInfo}>
              <Text style={styles.previewPrice}>{formatPrice(selectedListing.price)}</Text>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {selectedListing.title}
              </Text>
              <Text style={styles.previewSpecs}>
                {selectedListing.area_size} {selectedListing.area_unit} • {selectedListing.address_text}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSelectedListing(null)}
            >
              <Ionicons name="close" size={18} color="#666" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  markerBadge: {
    backgroundColor: "#1b5e20",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  markerText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  previewContainer: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
  },
  previewCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  previewThumb: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  previewInfo: {
    flex: 1,
    marginLeft: 12,
  },
  previewPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1b5e20",
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
    marginTop: 2,
  },
  previewSpecs: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    alignSelf: "flex-start",
  },
});
