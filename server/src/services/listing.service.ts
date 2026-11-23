import { Prisma, ListingStatus } from "@prisma/client";
import prisma from "../config/prisma";
import { cloudinaryService } from "./cloudinary.service";
import { formatListing, FormattedListing } from "../utils/piiMask";
import {
  CreateListingInput,
  UpdateListingInput,
  ListingQueryInput,
} from "../validators/listing.validator";

export interface PaginatedListings {
  data: FormattedListing[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class ListingService {
  /**
   * Get paginated listings with search, price, unit, status, and bounding box filters
   */
  async getListings(query: ListingQueryInput): Promise<PaginatedListings> {
    const {
      search,
      minPrice,
      maxPrice,
      areaUnit,
      status,
      minLat,
      maxLat,
      minLng,
      maxLng,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.ListingWhereInput = {};

    if (search && search.trim() !== "") {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { description: { contains: search.trim(), mode: "insensitive" } },
        { address_text: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = new Prisma.Decimal(minPrice);
      if (maxPrice !== undefined) where.price.lte = new Prisma.Decimal(maxPrice);
    }

    if (areaUnit) {
      where.area_unit = areaUnit;
    }

    if (status) {
      where.status = status as ListingStatus;
    }

    // Bounding-box geolocation filtering
    if (minLat !== undefined || maxLat !== undefined) {
      where.latitude = {};
      if (minLat !== undefined) where.latitude.gte = minLat;
      if (maxLat !== undefined) where.latitude.lte = maxLat;
    }

    if (minLng !== undefined || maxLng !== undefined) {
      where.longitude = {};
      if (minLng !== undefined) where.longitude.gte = minLng;
      if (maxLng !== undefined) where.longitude.lte = maxLng;
    }

    const skip = (page - 1) * limit;

    const [total, listings] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          images: {
            orderBy: { sort_order: "asc" },
          },
          owner: true,
        },
      }),
    ]);

    return {
      data: listings.map(formatListing),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get all listings owned by the logged-in user
   */
  async getMyListings(userId: string): Promise<FormattedListing[]> {
    const listings = await prisma.listing.findMany({
      where: { owner_id: userId },
      orderBy: { created_at: "desc" },
      include: {
        images: {
          orderBy: { sort_order: "asc" },
        },
        owner: true,
      },
    });

    return listings.map(formatListing);
  }

  /**
   * Get single listing detail by ID
   */
  async getListingById(id: string): Promise<FormattedListing> {
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { sort_order: "asc" },
        },
        owner: true,
      },
    });

    if (!listing) {
      const error = new Error("Listing not found");
      (error as unknown as { statusCode: number }).statusCode = 404;
      throw error;
    }

    return formatListing(listing);
  }

  /**
   * Create a new listing with uploaded images
   */
  async createListing(
    userId: string,
    data: CreateListingInput,
    files?: Express.Multer.File[]
  ): Promise<FormattedListing> {
    // 1. Upload images to Cloudinary in parallel if files exist
    const uploadedImages: Array<{ image_url: string; sort_order: number }> = [];

    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file, index) => {
        const uploadResult = await cloudinaryService.uploadImageBuffer(file.buffer);
        return {
          image_url: uploadResult.secure_url,
          sort_order: index,
        };
      });

      const results = await Promise.all(uploadPromises);
      uploadedImages.push(...results);
    }

    // 2. Persist listing and images in database
    const created = await prisma.listing.create({
      data: {
        owner_id: userId,
        title: data.title.trim(),
        description: data.description.trim(),
        price: new Prisma.Decimal(data.price),
        area_size: new Prisma.Decimal(data.area_size),
        area_unit: data.area_unit,
        address_text: data.address_text.trim(),
        latitude: data.latitude,
        longitude: data.longitude,
        status: (data.status as ListingStatus) || ListingStatus.available,
        images: {
          create: uploadedImages,
        },
      },
      include: {
        images: {
          orderBy: { sort_order: "asc" },
        },
        owner: true,
      },
    });

    return formatListing(created);
  }

  /**
   * Update listing details or status (Restricted to owner)
   */
  async updateListing(
    id: string,
    userId: string,
    data: UpdateListingInput
  ): Promise<FormattedListing> {
    const existing = await prisma.listing.findUnique({
      where: { id },
    });

    if (!existing) {
      const error = new Error("Listing not found");
      (error as unknown as { statusCode: number }).statusCode = 404;
      throw error;
    }

    if (existing.owner_id !== userId) {
      const error = new Error("Forbidden: You do not have permission to modify this listing");
      (error as unknown as { statusCode: number }).statusCode = 403;
      throw error;
    }

    const updateData: Prisma.ListingUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.price !== undefined) updateData.price = new Prisma.Decimal(data.price);
    if (data.area_size !== undefined) updateData.area_size = new Prisma.Decimal(data.area_size);
    if (data.area_unit !== undefined) updateData.area_unit = data.area_unit;
    if (data.address_text !== undefined) updateData.address_text = data.address_text.trim();
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.status !== undefined) updateData.status = data.status as ListingStatus;

    const updated = await prisma.listing.update({
      where: { id },
      data: updateData,
      include: {
        images: {
          orderBy: { sort_order: "asc" },
        },
        owner: true,
      },
    });

    return formatListing(updated);
  }

  /**
   * Delete listing and associated Cloudinary images (Restricted to owner)
   */
  async deleteListing(id: string, userId: string): Promise<{ message: string }> {
    const existing = await prisma.listing.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!existing) {
      const error = new Error("Listing not found");
      (error as unknown as { statusCode: number }).statusCode = 404;
      throw error;
    }

    if (existing.owner_id !== userId) {
      const error = new Error("Forbidden: You do not have permission to delete this listing");
      (error as unknown as { statusCode: number }).statusCode = 403;
      throw error;
    }

    // Clean up images from Cloudinary
    if (existing.images && existing.images.length > 0) {
      const deletePromises = existing.images.map((img) => {
        const publicId = cloudinaryService.extractPublicIdFromUrl(img.image_url);
        if (publicId) {
          return cloudinaryService.deleteImage(publicId);
        }
        return Promise.resolve();
      });
      await Promise.all(deletePromises);
    }

    // Delete listing record (cascade removes listing_images in PostgreSQL)
    await prisma.listing.delete({
      where: { id },
    });

    return { message: "Listing deleted successfully" };
  }
}

export const listingService = new ListingService();
