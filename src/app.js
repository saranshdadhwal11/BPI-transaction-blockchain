const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { createServer } = require("http");
const { Server } = require("socket.io");

const config = require("./config/env");
const connectDB = require("./config/database");
const { initializeBlockchain } = require("./config/blockchain");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");

const authRoutes = require("./routes/auth");
const paymentRoutes = require("./routes/payment");
const bankRoutes = require("./routes/bank");
const userRoutes = require("./routes/user");

const app = express();
const server = createServer(app);

/* =======================
   SOCKET.IO
======================= */
const allowedOrigins = [
  ...config.FRONTEND_URLS,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy does not allow access from ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

/* =======================
   DATABASE & SERVICES
======================= */
connectDB();

initializeBlockchain().catch((err) => {
  logger.warn(`Blockchain init skipped: ${err.message}`);
});

/* =======================
   SECURITY & CORS
======================= */
app.use(helmet());

app.use(cors(corsOptions));

// IMPORTANT: handle preflight requests
app.options("*", cors(corsOptions));

/* =======================
   RATE LIMITING
======================= */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);

/* =======================
   BODY PARSERS
======================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* =======================
   LOGGER
======================= */
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl} - ${req.ip}`);
  next();
});

/* =======================
   SOCKET.IO ACCESS IN REQ
======================= */
app.use((req, _res, next) => {
  req.io = io;
  next();
});

/* =======================
   ROUTES
======================= */
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/user", userRoutes);

/* =======================
   HEALTH CHECK
======================= */
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "BPI Backend",
  });
});

/* =======================
   404 HANDLER
======================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* =======================
   ERROR HANDLER
======================= */
app.use(errorHandler);

/* =======================
   SOCKET EVENTS
======================= */
io.on("connection", (socket) => {
  logger.info(`User connected: ${socket.id}`);

  socket.on("disconnect", () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

module.exports = server;
