import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";

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

// API Routes
app.use("/api/v1/auth", authRoutes);

// Global Error Handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const errorObj = err as { statusCode?: number; message?: string; stack?: string };
  const statusCode = errorObj.statusCode || 500;
  const message = errorObj.message || "Internal server error";

  if (statusCode === 500) {
    console.error("[ServerError]", err);
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: errorObj.stack }),
  });
});

const PORT = env.PORT;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`LandConnect server is running on http://localhost:${PORT}`);
  });
}

export default app;
