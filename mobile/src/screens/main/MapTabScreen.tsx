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
import { Colors, formatAED } from "../../theme";

export const MapTabScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { listings } = useListingStore();
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const initialRegion = {
    latitude: 24.95,
    longitude: 55.15,
    latitudeDelta: 1.8,
    longitudeDelta: 1.8,
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
              <Text style={styles.markerText}>{formatAED(item.price)}</Text>
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
              <Text style={styles.previewPrice}>{formatAED(selectedListing.price)}</Text>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {selectedListing.title}
              </Text>
              <Text style={styles.previewSpecs} numberOfLines={1}>
                {selectedListing.area_size} {selectedListing.area_unit} •{" "}
                {selectedListing.address_text}
              </Text>
            </View>

            <View style={styles.previewCTA}>
              <Ionicons name="arrow-forward-circle" size={28} color={Colors.gold} />
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSelectedListing(null)}
            >
              <Ionicons name="close" size={16} color={Colors.slate} />
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
    backgroundColor: Colors.emerald,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  markerText: {
    color: Colors.ivory,
    fontSize: 11,
    fontWeight: "700",
  },
  previewContainer: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
  },
  previewCard: {
    flexDirection: "row",
    backgroundColor: Colors.ivory,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  previewThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  previewInfo: {
    flex: 1,
    marginLeft: 12,
  },
  previewPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.gold,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.charcoal,
    marginTop: 2,
  },
  previewSpecs: {
    fontSize: 12,
    color: Colors.slate,
    marginTop: 2,
  },
  previewCTA: {
    marginLeft: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    padding: 4,
  },
});
