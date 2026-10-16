import path from "path";
import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  host: process.env.HOST || "0.0.0.0",
  authToken: process.env.AUTH_TOKEN || "change-this-secure-token-in-production",
  mcServerDir: path.resolve(process.env.MC_SERVER_DIR || "./mc-data"),
  mcMaxRam: process.env.MC_MAX_RAM || "2048M",
  mcInitRam: process.env.MC_INIT_RAM || "1024M"
};
