import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";

const app = express();

// Security and utility middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "landconnect-backend",
  });
});

const PORT = env.PORT;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`LandConnect server is running on http://localhost:${PORT}`);
  });
}

export default app;
