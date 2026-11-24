import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { useAuthStore } from "../store/useAuthStore";
import { AuthNavigator } from "./AuthNavigator";
import { MainTabNavigator } from "./MainTabNavigator";
import { ListingDetailScreen } from "../screens/modals/ListingDetailScreen";
import { CreateListingScreen } from "../screens/modals/CreateListingScreen";
import { MyListingsScreen } from "../screens/main/MyListingsScreen";
import { ChatRoomScreen } from "../screens/modals/ChatRoomScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, hydrateAuth } = useAuthStore();

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1b5e20" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen
            name="ListingDetail"
            component={ListingDetailScreen}
            options={{
              headerShown: true,
              title: "Property Details",
              headerStyle: { backgroundColor: "#1b5e20" },
              headerTintColor: "#fff",
              headerTitleStyle: { fontWeight: "bold" },
            }}
          />
          <Stack.Screen
            name="CreateListing"
            component={CreateListingScreen}
            options={{
              headerShown: true,
              title: "Post Land Plot",
              headerStyle: { backgroundColor: "#1b5e20" },
              headerTintColor: "#fff",
              headerTitleStyle: { fontWeight: "bold" },
            }}
          />
          <Stack.Screen
            name="MyListings"
            component={MyListingsScreen}
            options={{
              headerShown: true,
              title: "My Listings",
              headerStyle: { backgroundColor: "#1b5e20" },
              headerTintColor: "#fff",
              headerTitleStyle: { fontWeight: "bold" },
            }}
          />
          <Stack.Screen
            name="ChatRoom"
            component={ChatRoomScreen}
            options={({ route }) => ({
              headerShown: true,
              title: route.params.title || "Inquiry Room",
              headerStyle: { backgroundColor: "#1b5e20" },
              headerTintColor: "#fff",
              headerTitleStyle: { fontWeight: "bold" },
            })}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f6f8",
  },
});
