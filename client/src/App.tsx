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

export function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem("mc_token") || "change-this-secure-token-in-production");
  const [host, setHost] = useState<string>(() => localStorage.getItem("mc_host") || window.location.hostname || "localhost");
  const [serverStatus, setServerStatus] = useState<string>("stopped");
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState<string>("");
  const [connected, setConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  const apiBase = `http://${host}:3000`;
  const wsUrl = `ws://${host}:3000?token=${encodeURIComponent(token)}`;

  const saveSettings = () => {
    localStorage.setItem("mc_token", token);
    localStorage.setItem("mc_host", host);
    connectWs();
  };

  const connectWs = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "status") {
            setServerStatus(msg.data);
          } else if (msg.type === "log") {
            setLogs((prev) => [...prev.slice(-300), msg.data]);
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        setConnected(false);
      };

      ws.onerror = () => {
        setConnected(false);
      };
    } catch {
      setConnected(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${apiBase}/api/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data.serverStatus);
        setSystemStats(data.system);
      }
    } catch {
      // ignore
    }
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

  const handleStart = async () => {
    await fetch(`${apiBase}/api/server/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  const handleStop = async () => {
    await fetch(`${apiBase}/api/server/stop`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  const sendCmd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "command", command }));
    } else {
      fetch(`${apiBase}/api/server/command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ command })
      });
    }
    setCommand("");
  };

  const formatBytes = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(0) + " MB";
  };

  return (
    <div className="dashboard-container">
      <div className="header">
        <div>
          <div className="title">🎮 Minecraft Server Manager (Android/Termux)</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
            Status Koneksi: {connected ? "🟢 Terhubung" : "🔴 Terputus"}
          </div>
        </div>
        <div>
          <span className={`badge ${serverStatus}`}>{serverStatus}</span>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <label className="stat-label">IP / Host Server (HP Android)</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="192.168.x.x atau localhost"
              style={{ width: 220 }}
            />
          </div>
          <div>
            <label className="stat-label">Auth Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Token keamanan"
              style={{ width: 260 }}
            />
          </div>
          <div style={{ alignSelf: "flex-end" }}>
            <button className="btn" onClick={saveSettings}>Hubungkan</button>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-label">Status Server</div>
          <div className="stat-val">{serverStatus.toUpperCase()}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">RAM Sistem HP</div>
          <div className="stat-val">
            {systemStats ? `${formatBytes(systemStats.usedMemory)} / ${formatBytes(systemStats.totalMemory)}` : "-"}
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Arsitektur Host</div>
          <div className="stat-val">{systemStats ? `${systemStats.platform} (${systemStats.arch})` : "-"}</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <button
            className="btn btn-success"
            onClick={handleStart}
            disabled={serverStatus !== "stopped"}
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
            <div style={{ color: "#64748b" }}>Belum ada log dari server Minecraft...</div>
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
            placeholder="Ketik perintah (contoh: list, op player, say halo)..."
          />
          <button type="submit" className="btn">Kirim</button>
        </form>
      </div>
    </div>
  );
}

export default App;
