import { Request, Response, NextFunction } from "express";
import { listingService } from "../services/listing.service";
import { listingQuerySchema } from "../validators/listing.validator";

export class ListingController {
  async getListings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedQuery = listingQuerySchema.parse(req.query);
      const result = await listingService.getListings(parsedQuery);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getMyListings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const result = await listingService.getMyListings(req.user.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getListingById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await listingService.getListingById(req.params.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async createListing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const files = req.files as Express.Multer.File[] | undefined;
      const result = await listingService.createListing(req.user.id, req.body, files);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateListing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const result = await listingService.updateListing(req.params.id, req.user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async deleteListing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const result = await listingService.deleteListing(req.params.id, req.user.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const listingController = new ListingController();
