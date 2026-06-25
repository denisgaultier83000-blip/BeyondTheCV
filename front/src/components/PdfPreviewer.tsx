import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../utils/auth';
import { AsyncBoundary } from './AsyncBoundary';

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

  if (isLoading || error) {
    return (
      <AsyncBoundary 
        loading={isLoading} 
        error={error || undefined} 
        loadingText="Génération de l'aperçu en cours..." 
        className="pdf-placeholder"
        style={{ flex: 1, minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRadius: '0.5rem', border: '1px dashed var(--border-color)', margin: 0 }}
      >
        <></>
      </AsyncBoundary>
    );
  }
  if (!pdfUrl) return <div className="pdf-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '400px' }}>Aperçu non disponible.</div>;

  // Reprise du style exact de CVTab
  return <iframe src={pdfUrl} title="Aperçu du CV" style={{ width: '100%', height: '100%', flex: 1, minHeight: '800px', border: 'none', borderRadius: '0 0 1rem 1rem', background: '#525659' }} />;
};

export default PdfPreviewer;