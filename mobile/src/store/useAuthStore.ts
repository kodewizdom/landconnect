import { create } from "zustand";
import { User, Role, LoginCredentials, RegisterData } from "../types/auth";
import { authApi } from "../api/auth.api";
import { storage } from "../utils/storage";

interface AuthState {
  user: User | null;
  role: Role | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  hydrateAuth: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  googleLogin: (idToken: string, role?: Role) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  hydrateAuth: async () => {
    try {
      const storedToken = await storage.getItem("landconnect_access_token");
      const storedRefreshToken = await storage.getItem("landconnect_refresh_token");
      const storedUser = await storage.getItem("landconnect_user_profile");

      if (storedToken && storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        set({
          user: parsedUser,
          role: parsedUser.role,
          accessToken: storedToken,
          refreshToken: storedRefreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.login(credentials);
      await storage.setItem("landconnect_access_token", data.tokens.accessToken);
      await storage.setItem("landconnect_refresh_token", data.tokens.refreshToken);
      await storage.setItem("landconnect_user_profile", JSON.stringify(data.user));

      set({
        user: data.user,
        role: data.user.role,
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      const message =
        err.response?.data?.error || err.message || "Login failed. Please try again.";
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  register: async (registerData: RegisterData) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.register(registerData);
      await storage.setItem("landconnect_access_token", data.tokens.accessToken);
      await storage.setItem("landconnect_refresh_token", data.tokens.refreshToken);
      await storage.setItem("landconnect_user_profile", JSON.stringify(data.user));

      set({
        user: data.user,
        role: data.user.role,
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      const message =
        err.response?.data?.error || err.message || "Registration failed. Please check your data.";
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  googleLogin: async (idToken: string, role?: Role) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.googleAuth(idToken, role);
      await storage.setItem("landconnect_access_token", data.tokens.accessToken);
      await storage.setItem("landconnect_refresh_token", data.tokens.refreshToken);
      await storage.setItem("landconnect_user_profile", JSON.stringify(data.user));

      set({
        user: data.user,
        role: data.user.role,
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      const message =
        err.response?.data?.error || err.message || "Google sign-in failed.";
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  logout: async () => {
    await storage.deleteItem("landconnect_access_token");
    await storage.deleteItem("landconnect_refresh_token");
    await storage.deleteItem("landconnect_user_profile");

    set({
      user: null,
      role: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),

  setUser: (user: User) => {
    storage.setItem("landconnect_user_profile", JSON.stringify(user));
    set({ user, role: user.role });
  },
}));
