export type Role = "buyer" | "seller" | "broker";

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  avatar_url: string | null;
  allow_calls_from: string;
  show_online: boolean;
  created_at: string;
}

export interface MaskedUser {
  id: string;
  full_name: string;
  role: Role;
  avatar_url: string | null;
  show_online: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  tokens: AuthTokens;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
}
