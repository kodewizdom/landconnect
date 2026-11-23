import { Router } from "express";
import { Role } from "@prisma/client";
import { listingController } from "../controllers/listing.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { uploadListingImages } from "../services/cloudinary.service";
import {
  createListingSchema,
  updateListingSchema,
} from "../validators/listing.validator";

const router = Router();

// Public / Authenticated listings feed with filters & map coordinates
router.get("/", (req, res, next) =>
  listingController.getListings(req, res, next)
);

// Protected: Get listings owned by the logged-in seller/broker
// CRITICAL: Registered BEFORE GET /:id so "my" is not captured as an ID parameter
router.get("/my/listings", authMiddleware, (req, res, next) =>
  listingController.getMyListings(req, res, next)
);

// Get single listing detail by ID
router.get("/:id", (req, res, next) =>
  listingController.getListingById(req, res, next)
);

// Protected: Create a listing (Restricted to seller and broker roles)
router.post(
  "/",
  authMiddleware,
  requireRole(Role.seller, Role.broker),
  uploadListingImages,
  validateBody(createListingSchema),
  (req, res, next) => listingController.createListing(req, res, next)
);

// Protected: Edit listing (Owner only enforced in service/controller)
router.patch(
  "/:id",
  authMiddleware,
  validateBody(updateListingSchema),
  (req, res, next) => listingController.updateListing(req, res, next)
);

// Protected: Delete listing (Owner only enforced in service/controller)
router.delete("/:id", authMiddleware, (req, res, next) =>
  listingController.deleteListing(req, res, next)
);

export default router;
