import { EventEmitter } from "events";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { config } from "../config";

import { getSettings } from "./installerService";

export type ServerStatus = "stopped" | "starting" | "running" | "stopping";

class MinecraftService extends EventEmitter {
  private process: ChildProcessWithoutNullStreams | null = null;
  private status: ServerStatus = "stopped";
  private logHistory: string[] = [];
  private readonly maxLogLines = 200;

  constructor() {
    super();
  }

  public getStatus(): ServerStatus {
    return this.status;
  }

  public getLogs(): string[] {
    return [...this.logHistory];
  }

  public start(jarName = "server.jar"): { success: boolean; message: string } {
    if (this.status !== "stopped") {
      return { success: false, message: `Server already ${this.status}` };
    }

    if (!fs.existsSync(config.mcServerDir)) {
      fs.mkdirSync(config.mcServerDir, { recursive: true });
    }

    const jarPath = path.join(config.mcServerDir, jarName);
    if (!fs.existsSync(jarPath)) {
      return {
        success: false,
        message: `File server jar not found: ${jarPath}. Download/place server.jar first via Setup.`
      };
    }

    // Auto accept eula.txt if missing
    const eulaPath = path.join(config.mcServerDir, "eula.txt");
    if (!fs.existsSync(eulaPath)) {
      fs.writeFileSync(eulaPath, "eula=true\n", "utf8");
    }

    const settings = getSettings();
    const args = [
      `-Xms${settings.initRam}`,
      `-Xmx${settings.maxRam}`,
      "-XX:+UseG1GC",
      "-jar",
      jarName,
      "nogui"
    ];

    try {
      this.status = "starting";
      this.emitStatus();
      this.appendLog(`[Manager] Starting Minecraft server: java ${args.join(" ")}`);

      this.process = spawn("java", args, {
        cwd: config.mcServerDir,
        env: process.env
      });

      this.process.stdout.on("data", (data: Buffer) => {
        const text = data.toString("utf8");
        this.appendLog(text);
        if (this.status === "starting" && text.includes("Done (") || text.includes("! For help, type \"help\"")) {
          this.status = "running";
          this.emitStatus();
        }
      });

      this.process.stderr.on("data", (data: Buffer) => {
        this.appendLog(data.toString("utf8"));
      });

      this.process.on("close", (code) => {
        this.appendLog(`[Manager] Process exited with code ${code}`);
        this.status = "stopped";
        this.process = null;
        this.emitStatus();
      });

      this.process.on("error", (err) => {
        this.appendLog(`[Manager] Process error: ${err.message}`);
        this.status = "stopped";
        this.process = null;
        this.emitStatus();
      });

      return { success: true, message: "Server starting" };
    } catch (err: any) {
      this.status = "stopped";
      this.emitStatus();
      return { success: false, message: err.message };
    }
  }

  public stop(): { success: boolean; message: string } {
    if (!this.process || this.status === "stopped") {
      return { success: false, message: "Server is not running" };
    }

    this.status = "stopping";
    this.emitStatus();
    this.appendLog("[Manager] Stopping server via command 'stop'...");
    this.sendCommand("stop");

    // Graceful fallback kill after 25s
    setTimeout(() => {
      if (this.process && this.status === "stopping") {
        this.appendLog("[Manager] Server did not stop in time, terminating process...");
        this.process.kill("SIGTERM");
      }
    }, 25000);

    return { success: true, message: "Stop command sent" };
  }

  public sendCommand(cmd: string): boolean {
    if (!this.process || !this.process.stdin.writable) {
      return false;
    }
    const cleanCmd = cmd.trim().replace(/[\r\n]/g, "");
    this.process.stdin.write(cleanCmd + "\n");
    this.appendLog(`> ${cleanCmd}`);
    return true;
  }

  private appendLog(text: string): void {
    const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
    for (const line of lines) {
      this.logHistory.push(line);
      if (this.logHistory.length > this.maxLogLines) {
        this.logHistory.shift();
      }
      this.emit("log", line);
    }
  }

  private emitStatus(): void {
    this.emit("status", this.status);
  }
}

export const minecraftService = new MinecraftService();
