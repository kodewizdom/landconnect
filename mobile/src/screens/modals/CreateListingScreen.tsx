import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useNavigation } from "@react-navigation/native";
import { useListingStore } from "../../store/useListingStore";
import { AreaUnit } from "../../types/listing";
import { Colors, formatINR } from "../../theme";

export const CreateListingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { createListing } = useListingStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [areaSize, setAreaSize] = useState("");
  const [areaUnit, setAreaUnit] = useState<AreaUnit>("acre");
  const [addressText, setAddressText] = useState("");
  const [latitude, setLatitude] = useState("12.9716");
  const [longitude, setLongitude] = useState("77.5946");
  const [selectedImages, setSelectedImages] = useState<
    Array<{
      uri: string;
      name?: string;
      type?: string;
      fileName?: string | null;
      mimeType?: string | null;
    }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const handleAddPhotoOptions = () => {
    if (selectedImages.length >= 5) {
      Alert.alert("Limit Reached", "You can upload a maximum of 5 images.");
      return;
    }

    Alert.alert("Add Property Photo", "Select photo source:", [
      { text: "Take Camera Photo", onPress: handleTakePhoto },
      { text: "Choose from Gallery", onPress: handlePickImages },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Camera permission is required to capture photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const newImage = {
        uri:
          Platform.OS === "android" &&
          !asset.uri.startsWith("file://") &&
          !asset.uri.startsWith("content://")
            ? `file://${asset.uri}`
            : asset.uri,
        name: asset.fileName || `listing_${Date.now()}_${selectedImages.length}.jpg`,
        type: asset.mimeType || "image/jpeg",
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      };
      setSelectedImages((prev) => [...prev, newImage].slice(0, 5));
    }
  };

  const handlePickImages = async () => {
    if (selectedImages.length >= 5) {
      Alert.alert("Limit Reached", "You can upload a maximum of 5 images.");
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "We need media library permissions to upload listing photos."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 5 - selectedImages.length,
      quality: 0.7,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map((asset, index) => ({
        uri:
          Platform.OS === "android" &&
          !asset.uri.startsWith("file://") &&
          !asset.uri.startsWith("content://")
            ? `file://${asset.uri}`
            : asset.uri,
        name: asset.fileName || `listing_${Date.now()}_${selectedImages.length + index}.jpg`,
        type: asset.mimeType || "image/jpeg",
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      }));

      setSelectedImages((prev) => [...prev, ...newImages].slice(0, 5));
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required to detect GPS coordinates.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLatitude(location.coords.latitude.toFixed(5));
      setLongitude(location.coords.longitude.toFixed(5));
      Alert.alert("Location Detected", "Coordinates updated from device GPS.");
    } catch {
      Alert.alert("GPS Error", "Could not fetch current device location.");
    } finally {
      setIsLocating(false);
    }
  };

  const handleSubmit = async () => {
    // Sanitize numeric inputs: strip commas, currency symbols, and spaces
    const cleanedPrice = price.replace(/,/g, "").trim();
    const cleanedAreaSize = areaSize.replace(/,/g, "").trim();

    if (!title.trim() || !description.trim() || !cleanedPrice || !cleanedAreaSize || !addressText.trim()) {
      Alert.alert("Required Fields", "Please complete all mandatory property fields.");
      return;
    }

    const parsedPrice = Number(cleanedPrice);
    const parsedArea = Number(cleanedAreaSize);
    const parsedLat = Number(latitude);
    const parsedLng = Number(longitude);

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert("Invalid Price", "Price must be a valid positive number without letters.");
      return;
    }

    if (isNaN(parsedArea) || parsedArea <= 0) {
      Alert.alert("Invalid Area Size", "Area size must be a valid positive number.");
      return;
    }

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      Alert.alert("Invalid Coordinates", "Latitude and Longitude must be valid numbers.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createListing({
        title: title.trim(),
        description: description.trim(),
        price: parsedPrice,
        area_size: parsedArea,
        area_unit: areaUnit,
        address_text: addressText.trim(),
        latitude: parsedLat,
        longitude: parsedLng,
        images: selectedImages,
      });

      Alert.alert("Success", "Your land listing has been published!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Creation Failed",
        err.message || err.response?.data?.error || "Failed to create listing."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* PHOTOS Section */}
      <View style={styles.section}>
        <Text style={styles.sectionEyebrow}>PHOTOS</Text>
        <Text style={styles.sectionHint}>Property photos · max 5 images</Text>
        <View style={styles.photoGrid}>
          {selectedImages.map((img, idx) => (
            <View key={idx} style={styles.photoCell}>
              <Image source={{ uri: img.uri }} style={styles.photoThumb} />
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={() => handleRemoveImage(idx)}
              >
                <Ionicons name="close-circle" size={22} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ))}

          {selectedImages.length < 5 && (
            <TouchableOpacity style={styles.addPhotoCell} onPress={handleAddPhotoOptions}>
              <Ionicons name="add-circle" size={32} color={Colors.gold} />
              <Text style={styles.addPhotoLabel}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* PROPERTY DETAILS Section */}
      <View style={styles.section}>
        <Text style={styles.sectionEyebrow}>PROPERTY DETAILS</Text>

        <Text style={styles.inputLabel}>Listing Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 2 Acres Farmland near Highway"
          placeholderTextColor={Colors.muted}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.inputLabel}>Detailed Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Provide details on soil, road access, water availability, and title deeds..."
          placeholderTextColor={Colors.muted}
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />
      </View>

      {/* PRICING Section */}
      <View style={styles.section}>
        <Text style={styles.sectionEyebrow}>PRICING</Text>

        <Text style={styles.inputLabel}>Price in INR (₹) *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 4500000"
          placeholderTextColor={Colors.muted}
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.inputLabel}>Area Size *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2.5"
              placeholderTextColor={Colors.muted}
              keyboardType="numeric"
              value={areaSize}
              onChangeText={setAreaSize}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Unit</Text>
            <View style={styles.unitPillRow}>
              {(["acre", "sqft", "gunta", "ha"] as AreaUnit[]).map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[styles.unitPill, areaUnit === unit && styles.unitPillActive]}
                  onPress={() => setAreaUnit(unit)}
                >
                  <Text
                    style={[
                      styles.unitPillText,
                      areaUnit === unit && styles.unitPillTextActive,
                    ]}
                  >
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* LOCATION Section */}
      <View style={styles.section}>
        <Text style={styles.sectionEyebrow}>LOCATION</Text>

        <Text style={styles.inputLabel}>Address Label *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Devanahalli, Bengaluru Rural, Karnataka"
          placeholderTextColor={Colors.muted}
          value={addressText}
          onChangeText={setAddressText}
        />

        <View style={styles.gpsHeader}>
          <Text style={styles.inputLabel}>GPS Coordinates</Text>
          <TouchableOpacity
            style={styles.gpsBtn}
            onPress={handleGetCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={Colors.emerald} />
            ) : (
              <>
                <Ionicons name="locate-outline" size={14} color={Colors.emerald} />
                <Text style={styles.gpsBtnText}>Use My GPS</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <TextInput
              style={styles.input}
              placeholder="Latitude"
              placeholderTextColor={Colors.muted}
              keyboardType="numeric"
              value={latitude}
              onChangeText={setLatitude}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              placeholder="Longitude"
              placeholderTextColor={Colors.muted}
              keyboardType="numeric"
              value={longitude}
              onChangeText={setLongitude}
            />
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, isSubmitting && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color={Colors.ivory} />
        ) : (
          <Text style={styles.submitBtnText}>Publish Land Listing</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.alabaster,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  section: {
    backgroundColor: Colors.ivory,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: Colors.slate,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: Colors.muted,
    marginBottom: 14,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  photoCell: {
    position: "relative",
    width: 100,
    height: 100,
  },
  photoThumb: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  removePhotoBtn: {
    position: "absolute",
    top: -6,
    right: -6,
  },
  addPhotoCell: {
    width: 100,
    height: 100,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.goldLight,
  },
  addPhotoLabel: {
    fontSize: 10,
    color: Colors.warning,
    fontWeight: "700",
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.slate,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.sand,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.charcoal,
    backgroundColor: Colors.ivory,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
  },
  unitPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  unitPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.alabaster,
    borderWidth: 1,
    borderColor: Colors.sand,
  },
  unitPillActive: {
    backgroundColor: Colors.goldLight,
    borderColor: Colors.gold,
  },
  unitPillText: {
    fontSize: 11,
    color: Colors.slate,
    fontWeight: "600",
  },
  unitPillTextActive: {
    color: Colors.warning,
    fontWeight: "700",
  },
  gpsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.gold,
    gap: 5,
  },
  gpsBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.emerald,
  },
  submitBtn: {
    backgroundColor: Colors.emerald,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: Colors.ivory,
    fontSize: 16,
    fontWeight: "700",
  },
});
