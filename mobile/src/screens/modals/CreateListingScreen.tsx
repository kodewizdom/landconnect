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
      <Text style={styles.headerTitle}>Post New Land Plot</Text>
      <Text style={styles.headerSubtitle}>
        Share verified land details, GPS coordinates, and photos.
      </Text>

      {/* Image Picker Section */}
      <Text style={styles.sectionLabel}>Property Photos (Max 5)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
        {selectedImages.map((img, idx) => (
          <View key={idx} style={styles.imageThumbContainer}>
            <Image source={{ uri: img.uri }} style={styles.imageThumb} />
            <TouchableOpacity
              style={styles.removeImageBtn}
              onPress={() => handleRemoveImage(idx)}
            >
              <Ionicons name="close" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}

        {selectedImages.length < 5 && (
          <TouchableOpacity style={styles.addPhotoCard} onPress={handleAddPhotoOptions}>
            <Ionicons name="camera-outline" size={28} color="#1b5e20" />
            <Text style={styles.addPhotoText}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Basic Info */}
      <Text style={styles.inputLabel}>Listing Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 2 Acres Farmland near Highway"
        placeholderTextColor="#888"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.inputLabel}>Price in INR (₹) *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 4500000"
        placeholderTextColor="#888"
        keyboardType="numeric"
        value={price}
        onChangeText={setPrice}
      />

      {/* Area & Unit */}
      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.inputLabel}>Area Size *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2.5"
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={areaSize}
            onChangeText={setAreaSize}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.inputLabel}>Unit</Text>
          <View style={styles.unitPickerRow}>
            {(["acre", "sqft", "gunta", "ha"] as AreaUnit[]).map((unit) => (
              <TouchableOpacity
                key={unit}
                style={[
                  styles.unitBtn,
                  areaUnit === unit && styles.unitBtnActive,
                ]}
                onPress={() => setAreaUnit(unit)}
              >
                <Text
                  style={[
                    styles.unitBtnText,
                    areaUnit === unit && styles.unitBtnTextActive,
                  ]}
                >
                  {unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <Text style={styles.inputLabel}>Location / Address Label *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Devanahalli, Bengaluru Rural, Karnataka"
        placeholderTextColor="#888"
        value={addressText}
        onChangeText={setAddressText}
      />

      {/* Geolocation Section */}
      <View style={styles.gpsHeader}>
        <Text style={styles.inputLabel}>GPS Coordinates</Text>
        <TouchableOpacity
          style={styles.gpsBtn}
          onPress={handleGetCurrentLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#1b5e20" />
          ) : (
            <>
              <Ionicons name="navigate-outline" size={14} color="#1b5e20" />
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
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={latitude}
            onChangeText={setLatitude}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextInput
            style={styles.input}
            placeholder="Longitude"
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={longitude}
            onChangeText={setLongitude}
          />
        </View>
      </View>

      <Text style={styles.inputLabel}>Detailed Description *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Provide details on soil, road access, water availability, and title deeds..."
        placeholderTextColor="#888"
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity
        style={[styles.submitBtn, isSubmitting && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
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
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1b5e20",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  imageScroll: {
    flexDirection: "row",
    marginBottom: 16,
  },
  imageThumbContainer: {
    position: "relative",
    marginRight: 10,
  },
  imageThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#c62828",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  addPhotoCard: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#1b5e20",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
  },
  addPhotoText: {
    fontSize: 10,
    color: "#1b5e20",
    fontWeight: "bold",
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d0d7de",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#222",
    backgroundColor: "#fafbfc",
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
  },
  unitPickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  unitBtn: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
    marginRight: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  unitBtnActive: {
    backgroundColor: "#e8f5e9",
    borderColor: "#1b5e20",
  },
  unitBtnText: {
    fontSize: 11,
    color: "#555",
    fontWeight: "600",
  },
  unitBtnTextActive: {
    color: "#1b5e20",
    fontWeight: "bold",
  },
  gpsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#e8f5e9",
  },
  gpsBtnText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1b5e20",
    marginLeft: 4,
  },
  submitBtn: {
    backgroundColor: "#1b5e20",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
