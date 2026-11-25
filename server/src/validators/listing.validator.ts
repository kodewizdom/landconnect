import { z } from "zod";

const numericCoerceGreaterThanZero = (fieldName: string) =>
  z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const cleaned = val.replace(/,/g, "").trim();
        if (cleaned === "") return undefined;
        const parsed = Number(cleaned);
        return Number.isNaN(parsed) ? val : parsed;
      }
      return val;
    },
    z
      .number({
        required_error: `${fieldName} is required`,
        invalid_type_error: `${fieldName} must be a valid number`,
      })
      .gt(0, `${fieldName} must be greater than 0`)
  );

const coordinateCoerce = (fieldName: string, min: number, max: number) =>
  z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const cleaned = val.trim();
        if (cleaned === "") return undefined;
        const parsed = Number(cleaned);
        return Number.isNaN(parsed) ? val : parsed;
      }
      return val;
    },
    z
      .number({
        required_error: `${fieldName} is required`,
        invalid_type_error: `${fieldName} must be a valid number`,
      })
      .min(min, `${fieldName} must be between ${min} and ${max}`)
      .max(max, `${fieldName} must be between ${min} and ${max}`)
  );

const optionalNumericCoerceGreaterThanZero = (fieldName: string) =>
  z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const cleaned = val.replace(/,/g, "").trim();
        if (cleaned === "") return undefined;
        const parsed = Number(cleaned);
        return Number.isNaN(parsed) ? val : parsed;
      }
      return val;
    },
    z
      .number({
        invalid_type_error: `${fieldName} must be a valid number`,
      })
      .gt(0, `${fieldName} must be greater than 0`)
      .optional()
  );

const optionalCoordinateCoerce = (fieldName: string, min: number, max: number) =>
  z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const cleaned = val.trim();
        if (cleaned === "") return undefined;
        const parsed = Number(cleaned);
        return Number.isNaN(parsed) ? val : parsed;
      }
      return val;
    },
    z
      .number({
        invalid_type_error: `${fieldName} must be a valid number`,
      })
      .min(min, `${fieldName} must be between ${min} and ${max}`)
      .max(max, `${fieldName} must be between ${min} and ${max}`)
      .optional()
  );

export const createListingSchema = z.object({
  title: z
    .string({ required_error: "Title is required" })
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title cannot exceed 120 characters"),
  description: z
    .string({ required_error: "Description is required" })
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description cannot exceed 2000 characters"),
  price: numericCoerceGreaterThanZero("Price"),
  area_size: numericCoerceGreaterThanZero("Area size"),
  area_unit: z.enum(["acre", "sqft", "gunta", "ha"], {
    errorMap: () => ({ message: "Area unit must be one of: acre, sqft, gunta, ha" }),
  }),
  address_text: z
    .string({ required_error: "Address is required" })
    .trim()
    .min(3, "Address must be at least 3 characters")
    .max(250, "Address cannot exceed 250 characters"),
  latitude: coordinateCoerce("Latitude", -90, 90),
  longitude: coordinateCoerce("Longitude", -180, 180),
  status: z.enum(["available", "negotiation", "sold"]).optional().default("available"),
});

export const updateListingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title cannot exceed 120 characters")
    .optional(),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description cannot exceed 2000 characters")
    .optional(),
  price: optionalNumericCoerceGreaterThanZero("Price"),
  area_size: optionalNumericCoerceGreaterThanZero("Area size"),
  area_unit: z
    .enum(["acre", "sqft", "gunta", "ha"], {
      errorMap: () => ({ message: "Area unit must be one of: acre, sqft, gunta, ha" }),
    })
    .optional(),
  address_text: z
    .string()
    .trim()
    .min(3, "Address must be at least 3 characters")
    .max(250, "Address cannot exceed 250 characters")
    .optional(),
  latitude: optionalCoordinateCoerce("Latitude", -90, 90),
  longitude: optionalCoordinateCoerce("Longitude", -180, 180),
  status: z.enum(["available", "negotiation", "sold"]).optional(),
});

export const listingQuerySchema = z.object({
  search: z.string().optional(),
  minPrice: z.preprocess((val) => (val ? parseFloat(val as string) : undefined), z.number().positive().optional()),
  maxPrice: z.preprocess((val) => (val ? parseFloat(val as string) : undefined), z.number().positive().optional()),
  areaUnit: z.enum(["acre", "sqft", "gunta", "ha"]).optional(),
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
