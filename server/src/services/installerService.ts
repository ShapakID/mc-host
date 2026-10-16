import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

export interface ServerSettings {
  maxRam: string;
  initRam: string;
  port: number;
  motd: string;
  viewDistance: number;
  onlineMode: boolean;
  version: string;
}

const SETTINGS_FILE = path.resolve(process.cwd(), "config.json");

const defaultSettings: ServerSettings = {
  maxRam: "2048M",
  initRam: "1024M",
  port: 25565,
  motd: "A Minecraft Server on Android",
  viewDistance: 6,
  onlineMode: false,
  version: "1.20.4"
};

export function getSettings(): ServerSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
      return { ...defaultSettings, ...data };
    }
  } catch (err) {
    // fallback
  }
  return defaultSettings;
}

export function saveSettings(settings: Partial<ServerSettings>): ServerSettings {
  const current = getSettings();
  const updated = { ...current, ...settings };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}

export function isInstalled(mcDir: string): boolean {
  return fs.existsSync(path.join(mcDir, "server.jar"));
}

export function downloadPaperJar(mcDir: string, version = "1.20.4"): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      if (!fs.existsSync(mcDir)) {
        fs.mkdirSync(mcDir, { recursive: true });
      }

      // 1. Get latest build for version from PaperMC API
      const buildsUrl = `https://api.papermc.io/v2/projects/paper/versions/${version}/builds`;
      const buildData: any = await fetchJson(buildsUrl);
      const builds = buildData.builds;
      if (!builds || builds.length === 0) {
        return reject(new Error(`No Paper builds found for version ${version}`));
      }

      const latestBuild = builds[builds.length - 1];
      const buildNum = latestBuild.build;
      const jarFileName = latestBuild.downloads.application.name;
      const downloadUrl = `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${buildNum}/downloads/${jarFileName}`;

      const targetPath = path.join(mcDir, "server.jar");
      const file = fs.createWriteStream(targetPath);

      https.get(downloadUrl, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed with status ${res.statusCode}`));
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          // Write EULA
          fs.writeFileSync(path.join(mcDir, "eula.txt"), "eula=true\n", "utf-8");
          resolve();
        });
      }).on("error", (err) => {
        fs.unlink(targetPath, () => {});
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

function fetchJson(url: string) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}
