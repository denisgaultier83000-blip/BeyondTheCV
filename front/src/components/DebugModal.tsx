// c:\BeyondTheCV\front\src\components\DebugModal.tsx
import React from "react";
import { useTranslation } from "react-i18next";

interface DebugModalProps {
  data: any;
  onClose: () => void;
}

export default function DebugModal({ data, onClose }: DebugModalProps) {
  const { t } = useTranslation();
  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    alert(t('debug_json_copied', "JSON copié !"));
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.8)", zIndex: 1000,
      display: "flex", justifyContent: "center", alignItems: "center"
    }}>
      <div style={{
        background: "var(--bg-card)", padding: "20px", borderRadius: "12px",
        width: "90%", maxWidth: "800px", maxHeight: "90vh", display: "flex", flexDirection: "column"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
          <h3>{t('debug_title', "Données du Candidat (JSON)")}</h3>
          <button onClick={onClose} className="btn-secondary">{t('btn_close', "Fermer")}</button>
        </div>
        <textarea readOnly value={JSON.stringify(data, null, 2)} style={{ flex: 1, fontFamily: "monospace", fontSize: "12px", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)" }} />
        <button onClick={copyToClipboard} className="btn-primary" style={{ marginTop: "10px" }}>{t('debug_copy_json', "Copier le JSON")}</button>
      </div>
    </div>
  );
}
