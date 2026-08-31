export type PostureMode = 'manual' | 'voice' | 'video';

export interface PostureTrainingEntry {
  id: string;
  mode: PostureMode;
  title: string;
  summary: string;
  date: string;
  fileName?: string;
}

export function savePostureSession(mode: PostureMode, title: string, summary: string, fileName?: string) {
  try {
    const raw = localStorage.getItem('btcv_posture_sessions');
    const sessions = raw ? JSON.parse(raw) : [];
    const next = [
      {
        id: `${Date.now()}`,
        mode,
        title: title || 'Session d’entraînement',
        summary: summary || 'Réponse enregistrée',
        fileName,
        date: new Date().toISOString(),
      },
      ...(Array.isArray(sessions) ? sessions : []),
    ].slice(0, 10);
    localStorage.setItem('btcv_posture_sessions', JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('btcv-posture-updated'));
  } catch (e) {
    console.error("Erreur lors de la sauvegarde de la session de posture :", e);
  }
}
