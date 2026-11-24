module.exports = {
  expo: {
    name: "LandConnect",
    slug: "landconnect",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.landconnect.app"
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#0B2B26"
      },
      package: "com.landconnect.app",
      permissions: [
        "CAMERA",
        "RECORD_AUDIO",
        "MODIFY_AUDIO_SETTINGS",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ""
        }
      }
    },
    plugins: [
      "expo-asset",
      "expo-font",
      [
        "expo-build-properties",
        {
          android: {
            enableMinifyInReleaseBuilds: false,
            enableShrinkResourcesInReleaseBuilds: false,
            extraProguardRules: [
              "-keep class * extends androidx.room.RoomDatabase { *; }",
              "-keep class androidx.work.** { *; }",
              "-keep class androidx.startup.** { *; }",
            ].join("\n"),
          },
        },
      ],
    ],
    extra: {
      eas: {
        projectId: "b6f11207-5382-4ce7-9a84-52c569a24477"
      }
    },
    owner: "kooder"
  }
};
