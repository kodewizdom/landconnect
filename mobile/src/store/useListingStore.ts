import { create } from "zustand";
import {
  Listing,
  ListingFilters,
  CreateListingPayload,
  ListingStatus,
} from "../types/listing";
import { listingApi } from "../api/listing.api";

interface ListingState {
  listings: Listing[];
  myListings: Listing[];
  selectedListing: Listing | null;
  filters: ListingFilters;
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  fetchListings: (refresh?: boolean) => Promise<void>;
  fetchMyListings: () => Promise<void>;
  fetchListingById: (id: string) => Promise<Listing | null>;
  setFilters: (newFilters: Partial<ListingFilters>) => void;
  clearFilters: () => void;
  createListing: (payload: CreateListingPayload) => Promise<Listing>;
  updateStatus: (id: string, status: ListingStatus) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
}

export const useListingStore = create<ListingState>((set, get) => ({
  listings: [],
  myListings: [],
  selectedListing: null,
  filters: {},
  page: 1,
  hasMore: true,
  isLoading: false,
  isRefreshing: false,
  error: null,

  fetchListings: async (refresh = false) => {
    const { filters, page, listings, isLoading } = get();
    if (isLoading && !refresh) return;

    const targetPage = refresh ? 1 : page;
    set({ isLoading: !refresh, isRefreshing: refresh, error: null });

    try {
      const response = await listingApi.getListings(filters, targetPage, 20);
      set({
        listings: refresh ? response.data : [...listings, ...response.data],
        page: targetPage + 1,
        hasMore: targetPage < response.pagination.totalPages,
        isLoading: false,
        isRefreshing: false,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        isRefreshing: false,
        error: err.response?.data?.error || err.message || "Failed to load listings",
      });
    }
  },

  fetchMyListings: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await listingApi.getMyListings();
      set({ myListings: data, isLoading: false });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.error || err.message || "Failed to load my listings",
      });
    }
  },

  fetchListingById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await listingApi.getListingById(id);
      set({ selectedListing: data, isLoading: false });
      return data;
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.error || err.message || "Failed to load listing details",
      });
      return null;
    }
  },

  setFilters: (newFilters: Partial<ListingFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      page: 1,
    }));
    get().fetchListings(true);
  },

  clearFilters: () => {
    set({ filters: {}, page: 1 });
    get().fetchListings(true);
  },

  createListing: async (payload: CreateListingPayload) => {
    set({ isLoading: true, error: null });
    try {
      const created = await listingApi.createListing(payload);
      set((state) => ({
        listings: [created, ...state.listings],
        myListings: [created, ...state.myListings],
        isLoading: false,
      }));
      return created;
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.error || err.message || "Failed to create listing",
      });
      throw err;
    }
  },

  updateStatus: async (id: string, status: ListingStatus) => {
    try {
      const updated = await listingApi.updateListingStatus(id, status);
      set((state) => ({
        listings: state.listings.map((l) => (l.id === id ? updated : l)),
        myListings: state.myListings.map((l) => (l.id === id ? updated : l)),
        selectedListing: state.selectedListing?.id === id ? updated : state.selectedListing,
      }));
    } catch (err: any) {
      throw new Error(err.response?.data?.error || "Failed to update status");
    }
  },

  deleteListing: async (id: string) => {
    try {
      await listingApi.deleteListing(id);
      set((state) => ({
        listings: state.listings.filter((l) => l.id !== id),
        myListings: state.myListings.filter((l) => l.id !== id),
        selectedListing: state.selectedListing?.id === id ? null : state.selectedListing,
      }));
    } catch (err: any) {
      throw new Error(err.response?.data?.error || "Failed to delete listing");
    }
  },
}));
