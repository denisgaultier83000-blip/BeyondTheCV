// src/pages/App.tsx
import { useState } from "react";
import { createCvPdf } from "../api/pdf";
import { downloadBlob } from "../utils/download";
import { useEffect } from "react";
import { me } from "../api/auth";
import { useNavigate } from "react-router-dom";

const nav = useNavigate();

useEffect(() => {
  me().catch(() => {
    nav("/login");
  });
}, []);

export default function App() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    title: "",
    summary: "",
    experience: "",
    skills: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onGenerate() {
    try {
      setLoading(true);
      setError(null);

      const pdfBlob = await createCvPdf(form);
      downloadBlob(pdfBlob, "mon-cv.pdf");

    } catch (e: any) {
      setError(e.message ?? "Erreur lors de la génération du PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>Créer mon CV (PDF)</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {Object.entries(form).map(([k, v]) => (
        <div key={k} style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontWeight: 600 }}>{k}</label>
          <textarea
            value={v}
            onChange={(e) =>
              setForm((s) => ({ ...s, [k]: e.target.value }))
            }
            rows={k === "summary" || k === "experience" ? 4 : 2}
            style={{ width: "100%" }}
          />
        </div>
      ))}

      <button onClick={onGenerate} disabled={loading}>
        {loading ? "Génération..." : "Générer le PDF"}
      </button>
    </div>
  );
}
