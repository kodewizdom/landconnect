import { MaskedUser } from "./auth";

export type ListingStatus = "available" | "negotiation" | "sold";
export type AreaUnit = "sqft" | "acre" | "gunta" | "ha";

export interface ListingImage {
  id: string;
  image_url: string;
  sort_order: number;
}

export interface Listing {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  price: number;
  area_size: number;
  area_unit: AreaUnit;
  address_text: string;
  latitude: number;
  longitude: number;
  status: ListingStatus;
  created_at: string;
  images: ListingImage[];
  owner?: MaskedUser;
}

export interface ListingFilters {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  areaUnit?: AreaUnit;
  status?: ListingStatus;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}

export interface CreateListingPayload {
  title: string;
  description: string;
  price: number;
  area_size: number;
  area_unit: AreaUnit;
  address_text: string;
  latitude: number;
  longitude: number;
  status?: ListingStatus;
  images?: Array<{
    uri: string;
    name?: string;
    type?: string;
    fileName?: string | null;
    mimeType?: string | null;
  }>;
}

export interface PaginatedListingsResponse {
  data: Listing[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
