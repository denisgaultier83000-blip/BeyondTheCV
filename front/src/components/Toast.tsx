import React, { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      backgroundColor: type === 'info' ? '#6DBEF7' : (type === "success" ? "var(--success)" : "var(--danger-bg)"),
      color: type === 'info' ? '#0F2650' : (type === "success" ? "white" : "var(--danger-text)"),
      padding: "15px 25px",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      zIndex: 2000,
      display: "flex",
      alignItems: "center",
      gap: "10px",
      animation: "slideIn 0.3s ease-out",
      border: type === 'info' ? '1px solid #446285' : (type === "error" ? "1px solid var(--danger-text)" : "none")
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <span style={{ fontSize: "1.2em" }}>{type === 'info' ? 'ℹ️' : (type === "success" ? "✅" : "⚠️")}</span>
      <span style={{ fontWeight: 600 }}>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", marginLeft: "10px", fontSize: "18px", opacity: 0.7 }}>×</button>
    </div>
  );
}