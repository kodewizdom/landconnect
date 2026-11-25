module.exports = {
  expo: {
    name: "LandConnect",
    slug: "landconnect",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    backgroundColor: "#071F19",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#071F19",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.landconnect.app",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#071F19",
      },
      package: "com.landconnect.app",
      permissions: [
        "CAMERA",
        "RECORD_AUDIO",
        "MODIFY_AUDIO_SETTINGS",
        "BLUETOOTH",
        "BLUETOOTH_CONNECT",
        "WAKE_LOCK",
        "VIBRATE",
        "POST_NOTIFICATIONS",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
      ],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        },
      },
    },
    plugins: [
      "expo-asset",
      "expo-font",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#071F19",
          image: "./assets/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          dark: {
            backgroundColor: "#071F19",
            image: "./assets/splash-icon.png",
          },
        },
      ],
      [
        "expo-audio",
        {
          microphonePermission:
            "Allow LandConnect to access your microphone for encrypted in-app calls.",
          enableBackgroundPlayback: true,
        },
      ],
      [
        "expo-notifications",
        {
          color: "#0B2B26",
          sounds: ["./assets/sounds/ringtone.wav"],
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            enableMinifyInReleaseBuilds: false,
            enableShrinkResourcesInReleaseBuilds: false,
            extraMavenRepos: ["https://storage.zego.im/maven"],
            extraProguardRules: [
              "-keep class * extends androidx.room.RoomDatabase { *; }",
              "-keep class androidx.work.** { *; }",
              "-keep class androidx.startup.** { *; }",
              "-keep class **.zego.** { *; }",
              "-keep class im.zego.** { *; }",
            ].join("\n"),
          },
        },
      ],
      "./plugins/withAndroidBuildConfig",
    ],
    extra: {
      eas: {
        projectId: "b6f11207-5382-4ce7-9a84-52c569a24477",
      },
    },
    owner: "kooder",
  },
};
