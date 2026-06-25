--- /dev/null
+++ b/home/pimpampoum/BeyondTheCV/front/src/components/PitchMatrix.tsx
@@ -0,0 +1,154 @@
+import React, { useState } from 'react';
+import { useDashboard } from '../hooks/DashboardContext';
+import { BrainCircuit, Bot, Loader2, AlertTriangle, Mic, FileText } from 'lucide-react';
+
+const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
+
+// --- Types pour la structure des données ---
+interface Pitch {
+  written: string;
+  oral: string;
+}
+
+interface AntiFlawPitch extends Pitch {
+  identified_flaw: string;
+}
+
+interface PitchMatrixData {
+  recruiter_pitch: Pitch;
+  executive_pitch: Pitch;
+  hr_pitch: Pitch;
+  networking_pitch: Pitch;
+  anti_flaw_pitch: AntiFlawPitch;
+}
+
+// --- Sous-composant pour afficher un pitch ---
+const PitchCard: React.FC<{ title: string; pitch: Pitch; icon: React.ReactNode; identifiedFlaw?: string }> = ({ title, pitch, icon, identifiedFlaw }) => (
+  <div className="pitch-card">
+    <div className="pitch-card-header">
+      {icon}
+      <h3>{title}</h3>
+    </div>
+    {identifiedFlaw && (
+      <div className="flaw-banner">
+        <AlertTriangle size={16} />
+        <div>
+          <strong>Faille identifiée :</strong>
+          <p>{identifiedFlaw}</p>
+        </div>
+      </div>
+    )}
+    <div className="pitch-content">
+      <div className="pitch-version">
+        <h4><FileText size={16} /> Version Écrite</h4>
+        <p>{pitch.written}</p>
+      </div>
+      <div className="pitch-version">
+        <h4><Mic size={16} /> Version Orale</h4>
+        <p>{pitch.oral}</p>
+      </div>
+    </div>
+  </div>
+);
+
+export function PitchMatrix() {
+  const { cvData, targetLanguage } = useDashboard();
+  const [pitchMatrix, setPitchMatrix] = useState<PitchMatrixData | null>(null);
+  const [isLoading, setIsLoading] = useState(false);
+  const [error, setError] = useState<string | null>(null);
+
+  const handleGeneratePitch = async () => {
+    setIsLoading(true);
+    setError(null);
+    setPitchMatrix(null);
+
+    const token = localStorage.getItem('token');
+    if (!token) {
+      setError("Authentification requise pour cette action.");
+      setIsLoading(false);
+      return;
+    }
+
+    try {
+      const response = await fetch(`${API_URL}/api/pitch`, {
+        method: 'POST',
+        headers: {
+          'Content-Type': 'application/json',
+          'Authorization': `Bearer ${token}`,
+        },
+        body: JSON.stringify({
+          candidate_data: cvData,
+          target_language: targetLanguage || 'fr',
+        }),
+      });
+
+      if (!response.ok) {
+        const errorData = await response.json();
+        throw new Error(errorData.detail || `Erreur HTTP ${response.status}`);
+      }
+
+      const data: PitchMatrixData = await response.json();
+      setPitchMatrix(data);
+    } catch (err: any) {
+      setError(err.message);
+    } finally {
+      setIsLoading(false);
+    }
+  };
+
+  return (
+    <div className="pitch-matrix-container">
+      <div className="pitch-matrix-header">
+        <BrainCircuit size={32} />
+        <div>
+          <h2>Matrice de Pitchs Stratégiques</h2>
+          <p>Générez des versions de votre pitch adaptées à chaque interlocuteur.</p>
+        </div>
+      </div>
+
+      {!pitchMatrix && (
+        <div className="pitch-cta-container">
+          <button onClick={handleGeneratePitch} disabled={isLoading} className="btn-primary-pitch">
+            {isLoading ? (
+              <>
+                <Loader2 className="spinner" size={20} />
+                Génération en cours...
+              </>
+            ) : (
+              <>
+                <Bot size={20} />
+                Générer ma matrice de pitchs
+              </>
+            )}
+          </button>
+        </div>
+      )}
+
+      {error && (
+        <div className="error-box">
+          <AlertTriangle size={16} /> {error}
+        </div>
+      )}
+
+      {pitchMatrix && (
+        <div className="pitch-grid">
+          <PitchCard title="Pitch Recruteur" pitch={pitchMatrix.recruiter_pitch} icon={<span className="icon-bg">🎯</span>} />
+          <PitchCard title="Pitch Dirigeant" pitch={pitchMatrix.executive_pitch} icon={<span className="icon-bg">📈</span>} />
+          <PitchCard title="Pitch RH" pitch={pitchMatrix.hr_pitch} icon={<span className="icon-bg">🤝</span>} />
+          <PitchCard title="Pitch Réseau" pitch={pitchMatrix.networking_pitch} icon={<span className="icon-bg">🌐</span>} />
+          <PitchCard 
+            title="Pitch Anti-Faille" 
+            pitch={pitchMatrix.anti_flaw_pitch} 
+            icon={<span className="icon-bg">🛡️</span>} 
+            identifiedFlaw={pitchMatrix.anti_flaw_pitch.identified_flaw}
+          />
+        </div>
+      )}
+    </div>
+  );
+}
+
+```

### 2. Intégration et Style

Pour que ce composant s'affiche correctement, vous devrez l'appeler depuis une page de votre application (par exemple, dans `CandidateLayout.tsx` ou une nouvelle route que vous créerez).

De plus, voici quelques styles CSS à ajouter à votre fichier `index.css` pour un rendu optimal :

```css
/* /home/pimpampoum/BeyondTheCV/front/src/index.css */

/* ... (vos styles existants) ... */

.pitch-matrix-container {
  background-color: var(--bg-main);
  padding: 2rem;
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
}

.pitch-matrix-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--text-main);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}

.pitch-matrix-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.pitch-matrix-header p {
  margin: 0;
  color: var(--text-secondary);
}

.pitch-cta-container {
  text-align: center;
  padding: 2rem 0;
}

.btn-primary-pitch {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary-pitch:hover {
  background-color: #1d4ed8; /* Un bleu un peu plus foncé */
}

.btn-primary-pitch:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.pitch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.pitch-card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  overflow: hidden;
}

.pitch-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background-color: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
}

.pitch-card-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-main);
}

.icon-bg {
  font-size: 1.25rem;
}

.flaw-banner {
  display: flex;
  gap: 0.75rem;
  background-color: #fffbeb;
  color: #b45309;
  padding: 0.75rem 1.25rem;
  font-size: 0.9rem;
  border-bottom: 1px solid #fef3c7;
}

.flaw-banner p {
  margin: 0;
  font-style: italic;
}

.pitch-content {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pitch-version h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: var(--text-main);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.pitch-version p {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text-secondary);
  white-space: pre-wrap; /* Conserve les sauts de ligne du pitch */
}