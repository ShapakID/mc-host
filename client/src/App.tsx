import React, { useState, useEffect, useRef } from "react";

interface SystemStats {
  platform: string;
  arch: string;
  uptime: number;
  totalMemory: number;
  freeMemory: number;
  usedMemory: number;
  cpuLoad: number[];
}

interface ServerSettings {
  maxRam: string;
  initRam: string;
  port: number;
  motd: string;
  viewDistance: number;
  onlineMode: boolean;
  version: string;
}

export function App() {
  const [token] = useState<string>(() => localStorage.getItem("mc_token") || "change-this-secure-token-in-production");
  const [host] = useState<string>(() => localStorage.getItem("mc_host") || window.location.hostname || "localhost");
  const [serverStatus, setServerStatus] = useState<string>("stopped");
  const [installed, setInstalled] = useState<boolean>(false);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState<string>("");
  const [connected, setConnected] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  const [settings, setSettings] = useState<ServerSettings>({
    maxRam: "2048M",
    initRam: "1024M",
    port: 25565,
    motd: "A Minecraft Server on Android",
    viewDistance: 6,
    onlineMode: false,
    version: "1.20.4"
  });

  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  const apiBase = "http://" + host + ":3000";
  const wsUrl = "ws://" + host + ":3000?token=" + encodeURIComponent(token);

  const connectWs = () => {
    if (wsRef.current) wsRef.current.close();
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "status") setServerStatus(msg.data);
          else if (msg.type === "log") setLogs((prev) => [...prev.slice(-300), msg.data]);
        } catch {}
      };
      ws.onclose = () => setConnected(false);
      ws.onerror = () => setConnected(false);
    } catch {
      setConnected(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch(apiBase + "/api/status", {
        headers: { Authorization: "Bearer " + token }
      });
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data.serverStatus);
        setInstalled(data.installed);
        if (data.settings) setSettings(data.settings);
        setSystemStats(data.system);
      }
    } catch {}
  };

  useEffect(() => {
    connectWs();
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => {
      clearInterval(interval);
      if (wsRef.current) wsRef.current.close();
    };
  }, [host, token]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleDownloadPaper = async () => {
    setDownloading(true);
    try {
      const res = await fetch(apiBase + "/api/setup/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify({ version: settings.version })
      });
      const data = await res.json();
      if (data.success) {
        alert("Paper MC Berhasil didownload dan diinstall!");
        fetchStatus();
      } else {
        alert("Gagal: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const res = await fetch(apiBase + "/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        alert("Pengaturan RAM dan Server berhasil disimpan!");
      }
    } catch (err: any) {
      alert("Gagal menyimpan: " + err.message);
    }
  };

  const handleStart = async () => {
    await fetch(apiBase + "/api/server/start", {
      method: "POST",
      headers: { Authorization: "Bearer " + token }
    });
  };

  const handleStop = async () => {
    await fetch(apiBase + "/api/server/stop", {
      method: "POST",
      headers: { Authorization: "Bearer " + token }
    });
  };

  const sendCmd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "command", command }));
    } else {
      fetch(apiBase + "/api/server/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify({ command })
      });
    }
    setCommand("");
  };

  const formatBytes = (bytes: number) => (bytes / 1024 / 1024).toFixed(0) + " MB";

  return (
    <div className="dashboard-container">
      <div className="header">
        <div>
          <div className="title">🎮 Minecraft Server Manager (Android/Termux)</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
            Status Web: {connected ? "🟢 Terhubung ke HP" : "🔴 Terputus"} | Server File: {installed ? "✅ Terpasang" : "❌ Belum Terpasang"}
          </div>
        </div>
        <div>
          <span className={"badge " + serverStatus}>{serverStatus}</span>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>⚙️ Setup Server & Alokasi RAM (TECNO LK6)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <div>
            <label className="stat-label">Versi PaperMC</label>
            <select
              value={settings.version}
              onChange={(e) => setSettings({ ...settings, version: e.target.value })}
              style={{ width: "100%", background: "#1f2937", color: "#fff", padding: "8px", borderRadius: 6, border: "1px solid var(--card-border)" }}
            >
              <option value="1.20.4">1.20.4 (Stabil)</option>
              <option value="1.20.2">1.20.2</option>
              <option value="1.19.4">1.19.4 (Ringan)</option>
              <option value="1.16.5">1.16.5 (Paling Ringan untuk HP)</option>
            </select>
          </div>

          <div>
            <label className="stat-label">Max RAM Heap (-Xmx)</label>
            <select
              value={settings.maxRam}
              onChange={(e) => setSettings({ ...settings, maxRam: e.target.value })}
              style={{ width: "100%", background: "#1f2937", color: "#fff", padding: "8px", borderRadius: 6, border: "1px solid var(--card-border)" }}
            >
              <option value="1024M">1024 MB (Hemat baterai)</option>
              <option value="1536M">1536 MB (Normal)</option>
              <option value="2048M">2048 MB (Rekomendasi HP 6GB)</option>
              <option value="2560M">2560 MB (Maksimum aman)</option>
            </select>
          </div>

          <div>
            <label className="stat-label">Initial RAM (-Xms)</label>
            <select
              value={settings.initRam}
              onChange={(e) => setSettings({ ...settings, initRam: e.target.value })}
              style={{ width: "100%", background: "#1f2937", color: "#fff", padding: "8px", borderRadius: 6, border: "1px solid var(--card-border)" }}
            >
              <option value="512M">512 MB</option>
              <option value="1024M">1024 MB (Standar)</option>
              <option value="1536M">1536 MB</option>
            </select>
          </div>

          <div>
            <label className="stat-label">Port Server</label>
            <input
              type="number"
              value={settings.port}
              onChange={(e) => setSettings({ ...settings, port: parseInt(e.target.value, 10) || 25565 })}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button className="btn" onClick={handleSaveSettings}>
            Simpan Konfigurasi
          </button>
          {!installed && (
            <button
              className="btn btn-success"
              onClick={handleDownloadPaper}
              disabled={downloading}
            >
              {downloading ? "Sedang Download Paper..." : "Download & Setup Paper Server Otomatis"}
            </button>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-label">Status Server MC</div>
          <div className="stat-val">{serverStatus.toUpperCase()}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">RAM Sistem Android</div>
          <div className="stat-val">
            {systemStats ? formatBytes(systemStats.usedMemory) + " / " + formatBytes(systemStats.totalMemory) : "-"}
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Arsitektur Host</div>
          <div className="stat-val">{systemStats ? systemStats.platform + " (" + systemStats.arch + ")" : "-"}</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <button
            className="btn btn-success"
            onClick={handleStart}
            disabled={serverStatus !== "stopped" || !installed}
          >
            Start Server
          </button>
          <button
            className="btn btn-danger"
            onClick={handleStop}
            disabled={serverStatus === "stopped" || serverStatus === "stopping"}
          >
            Stop Server
          </button>
        </div>

        <div className="console-terminal">
          {logs.length === 0 ? (
            <div style={{ color: "#64748b" }}>
              {installed
                ? "Server siap. Klik Start Server untuk menjalankan."
                : "Server belum dipasang. Klik tombol Download & Setup Paper Server Otomatis di atas."}
            </div>
          ) : (
            logs.map((log, i) => <div key={i}>{log}</div>)
          )}
          <div ref={logsEndRef} />
        </div>

        <form onSubmit={sendCmd} className="cmd-bar">
          <input
            type="text"
            className="cmd-input"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Ketik command Minecraft (contoh: list, op player, say halo)..."
            disabled={serverStatus !== "running"}
          />
          <button type="submit" className="btn" disabled={serverStatus !== "running"}>
            Kirim
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
