import { z } from "zod";

const numericCoerce = (fieldName: string, min = 0) =>
  z.preprocess((val) => {
    if (typeof val === "string") {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? val : parsed;
    }
    return val;
  }, z.number({ required_error: `${fieldName} is required`, invalid_type_error: `${fieldName} must be a number` }).min(min, `${fieldName} must be greater than or equal to ${min}`));

export const createListingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(150, "Title cannot exceed 150 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: numericCoerce("Price", 0.01),
  area_size: numericCoerce("Area size", 0.01),
  area_unit: z.enum(["sqft", "acre", "gunta", "ha"], {
    errorMap: () => ({ message: "Area unit must be one of: sqft, acre, gunta, ha" }),
  }),
  address_text: z.string().min(3, "Address text must be at least 3 characters").max(255),
  latitude: z.preprocess((val) => {
    if (typeof val === "string") {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? val : parsed;
    }
    return val;
  }, z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90")),
  longitude: z.preprocess((val) => {
    if (typeof val === "string") {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? val : parsed;
    }
    return val;
  }, z.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180")),
  status: z.enum(["available", "negotiation", "sold"]).optional().default("available"),
});

export const updateListingSchema = z.object({
  title: z.string().min(3).max(150).optional(),
  description: z.string().min(10).optional(),
  price: z.preprocess((val) => {
    if (typeof val === "string" && val !== "") {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? val : parsed;
    }
    return val;
  }, z.number().min(0.01).optional()),
  area_size: z.preprocess((val) => {
    if (typeof val === "string" && val !== "") {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? val : parsed;
    }
    return val;
  }, z.number().min(0.01).optional()),
  area_unit: z.enum(["sqft", "acre", "gunta", "ha"]).optional(),
  address_text: z.string().min(3).max(255).optional(),
  latitude: z.preprocess((val) => {
    if (typeof val === "string" && val !== "") {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? val : parsed;
    }
    return val;
  }, z.number().min(-90).max(90).optional()),
  longitude: z.preprocess((val) => {
    if (typeof val === "string" && val !== "") {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? val : parsed;
    }
    return val;
  }, z.number().min(-180).max(180).optional()),
  status: z.enum(["available", "negotiation", "sold"]).optional(),
});

export const listingQuerySchema = z.object({
  search: z.string().optional(),
  minPrice: z.preprocess((val) => (val ? parseFloat(val as string) : undefined), z.number().positive().optional()),
  maxPrice: z.preprocess((val) => (val ? parseFloat(val as string) : undefined), z.number().positive().optional()),
  areaUnit: z.enum(["sqft", "acre", "gunta", "ha"]).optional(),
  status: z.enum(["available", "negotiation", "sold"]).optional(),
  minLat: z.preprocess((val) => (val ? parseFloat(val as string) : undefined), z.number().min(-90).max(90).optional()),
  maxLat: z.preprocess((val) => (val ? parseFloat(val as string) : undefined), z.number().min(-90).max(90).optional()),
  minLng: z.preprocess((val) => (val ? parseFloat(val as string) : undefined), z.number().min(-180).max(180).optional()),
  maxLng: z.preprocess((val) => (val ? parseFloat(val as string) : undefined), z.number().min(-180).max(180).optional()),
  page: z.preprocess((val) => (val ? parseInt(val as string, 10) : 1), z.number().int().min(1).default(1)),
  limit: z.preprocess((val) => (val ? parseInt(val as string, 10) : 20), z.number().int().min(1).max(100).default(20)),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type ListingQueryInput = z.infer<typeof listingQuerySchema>;
