import { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email?: string };
};

export type MainTabParamList = {
  Community: undefined;
  Map: undefined;
  Chats: undefined;
  Calls: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  ListingDetail: { listingId: string };
  CreateListing: undefined;
  MyListings: undefined;
  ChatRoom: { roomId: string; title?: string };
};
