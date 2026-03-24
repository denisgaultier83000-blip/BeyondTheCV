import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';

interface CompanySearchProps {
    candidateData: any;
    onAnalysisStarted: (data: any) => void;
}

/**
 * Composant de recherche et validation d'entreprise cible.
 * @param {Object} candidateData - Les données du candidat (nécessaires pour lancer l'analyse).
 * @param {Function} onAnalysisStarted - Callback appelé avec l'objet tasks_map (research, salary) une fois l'analyse lancée.
 */
const CompanySearch: React.FC<CompanySearchProps> = ({ candidateData, onAnalysisStarted }) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState("");
    const [candidates, setCandidates] = useState<any[]>([]);
    const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 1. Recherche et Désambiguïsation
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);
        setError(null);
        setCandidates([]);
        setSelectedCandidate(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/research/disambiguate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ company_name: query }),
            });

            if (!response.ok) throw new Error(t('company_search_error'));

            const data = await response.json();
            const results = data.candidates || [];
            setCandidates(results);

            // --- LOGIQUE "NO DOUBT" (Pas de doute) ---
            // Si on a un seul résultat pertinent (hors option manuelle) avec une forte confiance (> 0.85)
            // On lance automatiquement l'analyse pour fluidifier l'UX.
            const validCandidates = results.filter((c: any) => c.id !== "manual_entry");
            if (validCandidates.length === 1 && validCandidates[0].confidence > 0.85) {
                const bestMatch = validCandidates[0];
                console.log(`[Auto-Select] Confiance élevée (${bestMatch.confidence}) pour ${bestMatch.name}`);
                setSelectedCandidate(bestMatch);
                // On déclenche l'analyse immédiatement
                // Note: On passe bestMatch directement car le state selectedCandidate n'est pas encore à jour dans ce cycle
                handleStartAnalysis(bestMatch); 
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSearching(false);
        }
    };

    // 2. Lancement de l'analyse asynchrone
    const handleStartAnalysis = async (candidateOverride: any = null) => {
        const candidate = candidateOverride || selectedCandidate;
        if (!candidate) return;

        setIsAnalyzing(true);
        setError(null);

        try {
            // Préparation du payload selon que c'est une entrée manuelle ou une entreprise identifiée
            const isManual = candidate.id === "manual_entry";
            
            const payload = {
                target_company: isManual ? query : candidate.name,
                target_industry: candidate.industry || "Unknown",
                force_search: isManual,
                candidate_data: candidateData
            };

            // Appel de l'endpoint pour lancer la recherche et le salaire
            const response = await fetch(`${API_BASE_URL}/api/research/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Impossible de démarrer l'analyse.");

            const data = await response.json();
            
            // Transmission de la map des tâches (research, salary) au parent
            if (onAnalysisStarted) {
                onAnalysisStarted(data);
            }
        } catch (err: any) {
            setError(err.message);
            setIsAnalyzing(false); // On ne reset que si échec
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-800">{t('company_search_title')}</h2>
            
            {/* Formulaire de recherche */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('company_search_placeholder')}
                    className="flex-1 p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    disabled={isSearching || isAnalyzing}
                />
                <button 
                    type="submit" 
                    disabled={isSearching || !query.trim() || isAnalyzing}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50 transition"
                >
                    {isSearching ? t('company_search_searching') : t('company_search_identify')}
                </button>
            </form>

            {/* Gestion des erreurs */}
            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200">{error}</div>}

            {/* Liste des résultats (Désambiguïsation) */}
            {candidates.length > 0 && (
                <div className="mb-6">
                    <p className="text-sm text-gray-500 mb-2">{t('company_search_confirm')}</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded p-2 bg-gray-50">
                        {candidates.map((cand) => (
                            <div 
                                key={cand.id}
                                onClick={() => !isAnalyzing && setSelectedCandidate(cand)}
                                className={`p-3 rounded cursor-pointer border transition flex justify-between items-center
                                    ${selectedCandidate?.id === cand.id 
                                        ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500" 
                                        : "bg-white border-gray-200 hover:border-blue-300"}`}
                            >
                                <div>
                                    <div className="font-semibold text-gray-800">{cand.name}</div>
                                    <div className="text-xs text-gray-500">{cand.industry} • {cand.description}</div>
                                </div>
                                {cand.confidence > 0 && (
                                    <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded text-gray-600">
                                        {Math.round(cand.confidence * 100)}%
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Bouton de validation finale */}
                    <button
                        onClick={() => handleStartAnalysis(selectedCandidate)}
                        disabled={!selectedCandidate || isAnalyzing}
                        className="w-full mt-4 py-3 bg-green-600 text-white font-bold rounded hover:bg-green-700 disabled:opacity-50 shadow-lg transition transform active:scale-95"
                    >
                        {isAnalyzing ? t('company_search_analyzing') : t('company_search_validate_and_analyze', { company_name: selectedCandidate?.name })}
                    </button>
                </div>
            )}
        </div>
    );
};

export default CompanySearch;