import React, { useEffect, useRef, useState } from "react";
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
  Keyboard,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListingStore } from "../../store/useListingStore";
import { AreaUnit } from "../../types/listing";
import { Colors } from "../../theme";

type ListingField =
  | "title"
  | "description"
  | "price"
  | "areaSize"
  | "addressText"
  | "latitude"
  | "longitude";

const ALL_FIELDS: ListingField[] = [
  "title",
  "description",
  "price",
  "areaSize",
  "addressText",
  "latitude",
  "longitude",
];

function validateSingleField(
  field: ListingField,
  values: Record<ListingField, string>
): string | undefined {
  const raw = values[field] ?? "";
  const trimmed = raw.trim();

  switch (field) {
    case "title":
      if (trimmed.length < 3 || trimmed.length > 120) {
        return "Listing title must be between 3 and 120 characters.";
      }
      return undefined;
    case "description":
      if (trimmed.length < 10 || trimmed.length > 2000) {
        return "Description must be between 10 and 2000 characters.";
      }
      return undefined;
    case "price": {
      const cleaned = raw.replace(/,/g, "").trim();
      const num = Number(cleaned);
      if (!cleaned || Number.isNaN(num) || num <= 0) {
        return "Price must be a valid positive number in AED.";
      }
      return undefined;
    }
    case "areaSize": {
      const cleaned = raw.replace(/,/g, "").trim();
      const num = Number(cleaned);
      if (!cleaned || Number.isNaN(num) || num <= 0) {
        return "Area size must be a valid number greater than 0.";
      }
      return undefined;
    }
    case "addressText":
      if (trimmed.length < 3 || trimmed.length > 250) {
        return "Address label must be between 3 and 250 characters.";
      }
      return undefined;
    case "latitude": {
      const num = Number(trimmed);
      if (!trimmed || Number.isNaN(num) || num < -90 || num > 90) {
        return "Latitude must be between -90 and 90.";
      }
      return undefined;
    }
    case "longitude": {
      const num = Number(trimmed);
      if (!trimmed || Number.isNaN(num) || num < -180 || num > 180) {
        return "Longitude must be between -180 and 180.";
      }
      return undefined;
    }
  }
}

export const CreateListingScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { createListing } = useListingStore();

  const scrollViewRef = useRef<React.ComponentRef<typeof ScrollView> | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [areaSize, setAreaSize] = useState("");
  const [areaUnit, setAreaUnit] = useState<AreaUnit>("acre");
  const [addressText, setAddressText] = useState("");
  const [latitude, setLatitude] = useState("25.1972");
  const [longitude, setLongitude] = useState("55.2744");
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [touched, setTouched] = useState<Partial<Record<ListingField, boolean>>>({});
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ListingField, string>>>({});

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

  const getValuesSnapshot = (
    overrideField?: ListingField,
    overrideValue?: string
  ): Record<ListingField, string> => ({
    title: overrideField === "title" ? overrideValue ?? "" : title,
    description: overrideField === "description" ? overrideValue ?? "" : description,
    price: overrideField === "price" ? overrideValue ?? "" : price,
    areaSize: overrideField === "areaSize" ? overrideValue ?? "" : areaSize,
    addressText: overrideField === "addressText" ? overrideValue ?? "" : addressText,
    latitude: overrideField === "latitude" ? overrideValue ?? "" : latitude,
    longitude: overrideField === "longitude" ? overrideValue ?? "" : longitude,
  });

  const handleFieldChange = (
    field: ListingField,
    value: string,
    setter: (val: string) => void
  ) => {
    setter(value);
    if (touched[field]) {
      const err = validateSingleField(field, getValuesSnapshot(field, value));
      setFieldErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleFieldBlur = (field: ListingField) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateSingleField(field, getValuesSnapshot());
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
  };

  const scrollToLocationBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

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
        Alert.alert(
          "Permission Denied",
          "Location permission is required to detect GPS coordinates."
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const latStr = location.coords.latitude.toFixed(5);
      const lngStr = location.coords.longitude.toFixed(5);
      setLatitude(latStr);
      setLongitude(lngStr);
      setFieldErrors((prev) => ({ ...prev, latitude: undefined, longitude: undefined }));
      Alert.alert("Location Detected", "Coordinates updated from device GPS.");
    } catch {
      Alert.alert("GPS Error", "Could not fetch current device location.");
    } finally {
      setIsLocating(false);
    }
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();

    const snapshot = getValuesSnapshot();
    const allTouched: Partial<Record<ListingField, boolean>> = {};
    const errors: Partial<Record<ListingField, string>> = {};

    ALL_FIELDS.forEach((f) => {
      allTouched[f] = true;
      const err = validateSingleField(f, snapshot);
      if (err) errors[f] = err;
    });

    setTouched(allTouched);
    setFieldErrors(errors);

    const firstError = ALL_FIELDS.map((f) => errors[f]).find(Boolean);
    if (firstError) {
      Alert.alert("Check Listing Details", firstError);
      return;
    }

    const parsedPrice = Number(snapshot.price.replace(/,/g, "").trim());
    const parsedArea = Number(snapshot.areaSize.replace(/,/g, "").trim());
    const parsedLat = Number(snapshot.latitude.trim());
    const parsedLng = Number(snapshot.longitude.trim());

    setIsSubmitting(true);
    try {
      await createListing({
        title: snapshot.title.trim(),
        description: snapshot.description.trim(),
        price: parsedPrice,
        area_size: parsedArea,
        area_unit: areaUnit,
        address_text: snapshot.addressText.trim(),
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
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to create listing."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const descTrimLen = description.trim().length;
  const scrollPaddingBottom =
    keyboardHeight > 0 ? keyboardHeight + 48 : Math.max(insets.bottom, 24) + 32;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollPaddingBottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
            style={[
              styles.input,
              touched.title && fieldErrors.title ? styles.inputError : null,
            ]}
            placeholder="e.g. Palm Jebel Ali Waterfront Plot (min 3 chars)"
            placeholderTextColor={Colors.muted}
            value={title}
            onChangeText={(text) => handleFieldChange("title", text, setTitle)}
            onBlur={() => handleFieldBlur("title")}
          />
          {touched.title && fieldErrors.title ? (
            <Text style={styles.errorText}>{fieldErrors.title}</Text>
          ) : null}

          <View style={styles.labelCounterRow}>
            <Text style={styles.inputLabel}>Detailed Description *</Text>
            <Text
              style={[
                styles.counterText,
                descTrimLen < 10 ? styles.counterWarn : styles.counterOk,
              ]}
            >
              {descTrimLen} / 10 min
            </Text>
          </View>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              touched.description && fieldErrors.description ? styles.inputError : null,
            ]}
            placeholder="Describe plot zoning, road access, utilities, and title deed (min 10 chars)..."
            placeholderTextColor={Colors.muted}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={(text) => handleFieldChange("description", text, setDescription)}
            onBlur={() => handleFieldBlur("description")}
          />
          {touched.description && fieldErrors.description ? (
            <Text style={styles.errorText}>{fieldErrors.description}</Text>
          ) : null}
        </View>

        {/* PRICING Section */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>PRICING</Text>

          <Text style={styles.inputLabel}>Price in AED *</Text>
          <TextInput
            style={[
              styles.input,
              touched.price && fieldErrors.price ? styles.inputError : null,
            ]}
            placeholder="e.g. 14500000"
            placeholderTextColor={Colors.muted}
            keyboardType="numeric"
            value={price}
            onChangeText={(text) => handleFieldChange("price", text, setPrice)}
            onBlur={() => handleFieldBlur("price")}
          />
          {touched.price && fieldErrors.price ? (
            <Text style={styles.errorText}>{fieldErrors.price}</Text>
          ) : null}

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.inputLabel}>Area Size *</Text>
              <TextInput
                style={[
                  styles.input,
                  touched.areaSize && fieldErrors.areaSize ? styles.inputError : null,
                ]}
                placeholder="e.g. 2.5"
                placeholderTextColor={Colors.muted}
                keyboardType="numeric"
                value={areaSize}
                onChangeText={(text) => handleFieldChange("areaSize", text, setAreaSize)}
                onBlur={() => handleFieldBlur("areaSize")}
              />
              {touched.areaSize && fieldErrors.areaSize ? (
                <Text style={styles.errorText}>{fieldErrors.areaSize}</Text>
              ) : null}
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
            style={[
              styles.input,
              touched.addressText && fieldErrors.addressText ? styles.inputError : null,
            ]}
            placeholder="e.g. Palm Jebel Ali, Dubai, UAE"
            placeholderTextColor={Colors.muted}
            value={addressText}
            onChangeText={(text) => handleFieldChange("addressText", text, setAddressText)}
            onFocus={scrollToLocationBottom}
            onBlur={() => handleFieldBlur("addressText")}
          />
          {touched.addressText && fieldErrors.addressText ? (
            <Text style={styles.errorText}>{fieldErrors.addressText}</Text>
          ) : null}

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
                style={[
                  styles.input,
                  touched.latitude && fieldErrors.latitude ? styles.inputError : null,
                ]}
                placeholder="Latitude"
                placeholderTextColor={Colors.muted}
                keyboardType="numeric"
                value={latitude}
                onChangeText={(text) => handleFieldChange("latitude", text, setLatitude)}
                onFocus={scrollToLocationBottom}
                onBlur={() => handleFieldBlur("latitude")}
              />
              {touched.latitude && fieldErrors.latitude ? (
                <Text style={styles.errorText}>{fieldErrors.latitude}</Text>
              ) : null}
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                style={[
                  styles.input,
                  touched.longitude && fieldErrors.longitude ? styles.inputError : null,
                ]}
                placeholder="Longitude"
                placeholderTextColor={Colors.muted}
                keyboardType="numeric"
                value={longitude}
                onChangeText={(text) => handleFieldChange("longitude", text, setLongitude)}
                onFocus={scrollToLocationBottom}
                onBlur={() => handleFieldBlur("longitude")}
              />
              {touched.longitude && fieldErrors.longitude ? (
                <Text style={styles.errorText}>{fieldErrors.longitude}</Text>
              ) : null}
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.alabaster,
  },
  scrollContent: {
    padding: 16,
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
  labelCounterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  counterText: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
  },
  counterWarn: {
    color: Colors.warning,
  },
  counterOk: {
    color: Colors.success,
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
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: 11,
    color: Colors.error,
    marginTop: 4,
    fontWeight: "500",
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
