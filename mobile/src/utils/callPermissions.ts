import {
  Alert,
  Linking,
  Permission,
  PermissionsAndroid,
  Platform,
} from "react-native";

/**
 * Show a modal explaining why permissions are required and link directly
 * to the device App Settings screen so the user isn't stuck in silent calls.
 */
function showPermissionDeniedAlert(featureName: string) {
  Alert.alert(
    `${featureName} Permission Required`,
    `LandConnect needs ${featureName.toLowerCase()} permission to transmit audio/video during calls. Please enable it in App Settings.`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Open Settings",
        onPress: () => {
          Linking.openSettings().catch(() => {});
        },
      },
    ]
  );
}

/**
 * Requests Android runtime microphone & camera permissions before initiating
 * or accepting a call. Returns true only when all mandatory permissions succeed.
 */
export async function requestCallPermissions(
  callType: "audio" | "video"
): Promise<boolean> {
  if (Platform.OS !== "android") {
    return true;
  }

  try {
    const required: Permission[] = [
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ];

    if (callType === "video") {
      required.push(PermissionsAndroid.PERMISSIONS.CAMERA);
    }

    const toRequest: Permission[] = [...required];

    // Android 12+ (API 31+): request Bluetooth audio routing permission opportunistically
    const apiLevel = typeof Platform.Version === "number" ? Platform.Version : parseInt(String(Platform.Version), 10) || 0;
    const btConnect = PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT as Permission | undefined;
    if (apiLevel >= 31 && btConnect) {
      toRequest.push(btConnect);
    }

    const results = await PermissionsAndroid.requestMultiple(toRequest);

    const micGranted =
      results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
      PermissionsAndroid.RESULTS.GRANTED;

    const camGranted =
      callType === "audio" ||
      results[PermissionsAndroid.PERMISSIONS.CAMERA] ===
        PermissionsAndroid.RESULTS.GRANTED;

    if (!micGranted && !camGranted) {
      showPermissionDeniedAlert("Microphone and Camera");
      return false;
    }

    if (!micGranted) {
      showPermissionDeniedAlert("Microphone");
      return false;
    }

    if (!camGranted) {
      showPermissionDeniedAlert("Camera");
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[CallPermissions] Error requesting call permissions:", err);
    return false;
  }
}

/**
 * Requests Camera permission specifically when toggling video on mid-call.
 */
export async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      showPermissionDeniedAlert("Camera");
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Requests Android 13+ (API 33+) runtime notification permission upon login
 * so incoming call heads-up notifications can ring when backgrounded.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return true;
  }

  const apiLevel =
    typeof Platform.Version === "number"
      ? Platform.Version
      : parseInt(String(Platform.Version), 10) || 0;

  if (apiLevel < 33) {
    return true;
  }

  try {
    const postNotif =
      (PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS as Permission | undefined) ||
      ("android.permission.POST_NOTIFICATIONS" as Permission);

    const status = await PermissionsAndroid.request(postNotif);
    return status === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn("[CallPermissions] Error requesting POST_NOTIFICATIONS:", err);
    return false;
  }
}
