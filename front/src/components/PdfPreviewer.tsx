import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { authenticatedFetch } from '../utils/auth';

interface PdfPreviewerProps {
  /** L'URL de l'API à appeler pour générer le PDF */
  fetchUrl: string;
  /** Le corps de la requête (contenant les données du CV) */
  requestBody: any;
  /** Une valeur qui change pour forcer le rafraîchissement (ex: un compteur) */
  refreshTrigger: any;
  /** Callbacks pour communiquer avec le parent */
  onSuccess?: (url: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

/**
 * Un composant React robuste pour afficher un aperçu de PDF généré par une API.
 * Il gère le cycle de vie complet : chargement, erreur, affichage et nettoyage mémoire.
 */
const PdfPreviewer: React.FC<PdfPreviewerProps> = ({ fetchUrl, requestBody, refreshTrigger, onSuccess, onLoadingChange }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ne rien faire si les données ne sont pas prêtes
    if (!requestBody || !requestBody.data) {
      return;
    }

    const generateAndLoadPdf = async () => {
      setIsLoading(true);
      if (onLoadingChange) onLoadingChange(true);
      setError(null);
      
      // Nettoyage de l'URL précédente pour éviter les fuites de mémoire
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }

      try {
        const response = await authenticatedFetch(fetchUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`La génération du PDF a échoué: ${errorText}`);
        }

        const blob = await response.blob();
        const newPdfUrl = URL.createObjectURL(blob);
        setPdfUrl(newPdfUrl);
        if (onSuccess) onSuccess(newPdfUrl);

      } catch (e: any) {
        console.error("Erreur de prévisualisation PDF:", e);
        setError(e.message);
      } finally {
        setIsLoading(false);
        if (onLoadingChange) onLoadingChange(false);
      }
    };

    generateAndLoadPdf();

    // Fonction de nettoyage appelée quand le composant est démonté ou quand le trigger change
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, fetchUrl]); // On ne met PAS `requestBody` ici pour éviter les boucles infinies

  if (isLoading) return (
    <div className="pdf-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '400px' }}>
      <Loader2 size={32} className="spin" />
      <p style={{ marginTop: '1rem' }}>Génération de l'aperçu...</p>
    </div>
  );
  if (error) return (
    <div className="pdf-placeholder" style={{ borderColor: 'var(--danger-text)', color: 'var(--danger-text)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '400px' }}>
      <AlertTriangle size={32} />
      <p style={{ marginTop: '1rem', maxWidth: '80%', textAlign: 'center' }}>{error}</p>
    </div>
  );
  if (!pdfUrl) return <div className="pdf-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '400px' }}>Aperçu non disponible.</div>;

  // Reprise du style exact de CVTab
  return <iframe src={pdfUrl} title="Aperçu du CV" style={{ width: '100%', height: '100%', flex: 1, minHeight: '800px', border: 'none', borderRadius: '0 0 1rem 1rem', background: '#525659' }} />;
};

export default PdfPreviewer;