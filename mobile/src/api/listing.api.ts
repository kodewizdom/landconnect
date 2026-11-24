import { Platform } from "react-native";
import { apiClient } from "./client";
import { storage } from "../utils/storage";
import {
  Listing,
  ListingFilters,
  CreateListingPayload,
  PaginatedListingsResponse,
  ListingStatus,
} from "../types/listing";

export const listingApi = {
  async getListings(
    filters: ListingFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedListingsResponse> {
    const params: Record<string, any> = { page, limit };

    if (filters.search) params.search = filters.search;
    if (filters.minPrice !== undefined) params.minPrice = filters.minPrice;
    if (filters.maxPrice !== undefined) params.maxPrice = filters.maxPrice;
    if (filters.areaUnit) params.areaUnit = filters.areaUnit;
    if (filters.status) params.status = filters.status;
    if (filters.minLat !== undefined) params.minLat = filters.minLat;
    if (filters.maxLat !== undefined) params.maxLat = filters.maxLat;
    if (filters.minLng !== undefined) params.minLng = filters.minLng;
    if (filters.maxLng !== undefined) params.maxLng = filters.maxLng;

    const response = await apiClient.get<PaginatedListingsResponse>("/listings", {
      params,
    });
    return response.data;
  },

  async getMyListings(): Promise<Listing[]> {
    const response = await apiClient.get<Listing[]>("/listings/my/listings");
    return response.data;
  },

  async getListingById(id: string): Promise<Listing> {
    const response = await apiClient.get<Listing>(`/listings/${id}`);
    return response.data;
  },

  async createListing(payload: CreateListingPayload): Promise<Listing> {
    const formData = new FormData();

    // Construct fresh FormData with only primitive strings for text/number fields
    formData.append("title", String(payload.title ?? "").trim());
    formData.append("description", String(payload.description ?? "").trim());
    formData.append("price", String(payload.price).replace(/,/g, "").trim());
    formData.append("area_size", String(payload.area_size).replace(/,/g, "").trim());
    formData.append("area_unit", String(payload.area_unit));
    formData.append("address_text", String(payload.address_text ?? "").trim());
    formData.append("latitude", String(payload.latitude).trim());
    formData.append("longitude", String(payload.longitude).trim());

    if (payload.status) {
      formData.append("status", String(payload.status));
    }

    if (payload.images && payload.images.length > 0) {
      payload.images.forEach((asset, index) => {
        formData.append("images", {
          uri:
            Platform.OS === "android" &&
            !asset.uri.startsWith("file://") &&
            !asset.uri.startsWith("content://")
              ? `file://${asset.uri}`
              : asset.uri,
          name: asset.fileName ?? asset.name ?? `listing_${Date.now()}_${index}.jpg`,
          type: asset.mimeType ?? asset.type ?? "image/jpeg",
        } as any);
      });
    }

    const token = await storage.getItem("landconnect_access_token");
    const API_BASE_URL =
      process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api/v1";

    return new Promise<Listing>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE_URL}/listings`);

      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }
      // Do NOT set Content-Type header manually so React Native's native NetworkingModule sets the multipart boundary

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data as Listing);
          } else {
            const errorMsg =
              data.error || data.message || "Failed to create listing";
            reject(new Error(errorMsg));
          }
        } catch {
          reject(new Error("Invalid response from server"));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network connection failed"));
      };

      xhr.send(formData);
    });
  },

  async updateListing(
    id: string,
    data: Partial<CreateListingPayload>
  ): Promise<Listing> {
    const response = await apiClient.patch<Listing>(`/listings/${id}`, data);
    return response.data;
  },

  async updateListingStatus(id: string, status: ListingStatus): Promise<Listing> {
    const response = await apiClient.patch<Listing>(`/listings/${id}`, { status });
    return response.data;
  },

  async deleteListing(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/listings/${id}`);
    return response.data;
  },
};
