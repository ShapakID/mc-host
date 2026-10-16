import os from "os";

export interface SystemStats {
  platform: string;
  arch: string;
  uptime: number;
  totalMemory: number;
  freeMemory: number;
  usedMemory: number;
  cpuLoad: number[];
}

export function getSystemStats(): SystemStats {
  const total = os.totalmem();
  const free = os.freemem();
  return {
    platform: os.platform(),
    arch: os.arch(),
    uptime: os.uptime(),
    totalMemory: total,
    freeMemory: free,
    usedMemory: total - free,
    cpuLoad: os.loadavg()
  };
}
