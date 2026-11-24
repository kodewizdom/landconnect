import { apiClient } from "./client";
import {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
  Role,
} from "../types/auth";

export const authApi = {
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/register", data);
    return response.data;
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/login", credentials);
    return response.data;
  },

  async googleAuth(idToken: string, role?: Role): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/google", {
      idToken,
      role,
    });
    return response.data;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>("/auth/forgot-password", {
      email,
    });
    return response.data;
  },

  async resetPassword(data: {
    email: string;
    otp: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>("/auth/reset-password", data);
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<User>("/auth/me");
    return response.data;
  },
};
