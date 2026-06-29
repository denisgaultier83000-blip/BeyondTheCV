import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

// --- MOCK API ---

// On suppose une fonction qui appelle votre API backend pour la recherche
const searchCompaniesAPI = async (searchTerm: string): Promise<any[]> => {
  // Simule une latence réseau
  await new Promise(resolve => setTimeout(resolve, 500));

  if (!searchTerm) {
    return [];
  }

  // Pour la démo, on retourne des données factices
  console.log(`Searching for: ${searchTerm}`);
  return [
    { id: '1', name: `${searchTerm} Inc.` },
    { id: '2', name: `The ${searchTerm} Company` },
    { id: '3', name: `Global ${searchTerm} Solutions` },
  ];
};

// Nouvelle fonction pour la "validation" (mutation)
const validateCompanyAPI = async (company: { id: string; name: string }): Promise<{ status: string; validatedCompany: any }> => {
  console.log(`Validating company: ${company.name}`);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simule une latence de validation

  // Simule un échec pour une entreprise spécifique pour la démo
  if (company.name.includes('Global')) {
    throw new Error("Cette entreprise est bloquée pour des raisons de démo.");
  }

  return { status: 'ok', validatedCompany: { ...company, validatedAt: new Date().toISOString() } };
};


// --- COMPOSANT ---

export const CompanySearch = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient(); // Pour interagir avec le cache
  const [searchTerm, setSearchTerm] = useState('');

  // Le hook useQuery prend en charge le chargement, les erreurs et le caching.
  const { data: companies, isLoading, isError, error } = useQuery({
    queryKey: ['companies', searchTerm], // Clé unique pour cette requête. Le 2e élément est la dépendance.
    queryFn: () => searchCompaniesAPI(searchTerm), // La fonction qui retourne une promesse
    enabled: !!searchTerm, // La requête ne se lance que si searchTerm n'est pas vide
  });

  // Le hook useMutation pour l'action de validation
  const validateCompanyMutation = useMutation({
    mutationFn: validateCompanyAPI, // La fonction qui effectue la modification
    onSuccess: (data) => {
      // La mutation a réussi !
      console.log('Validation réussie:', data.validatedCompany);

      // On peut invalider des requêtes en cache pour forcer leur rafraîchissement.
      // Par exemple, si on a une liste de "dossiers de candidature" quelque part :
      queryClient.invalidateQueries({ queryKey: ['application_dossiers'] });

      // On peut aussi mettre à jour manuellement une query avec la nouvelle donnée,
      // pour une mise à jour instantanée sans re-fetch (Optimistic Update).
      // queryClient.setQueryData(['dossier', data.validatedCompany.id], data.validatedCompany);
    },
    onError: (error) => {
      // La mutation a échoué. L'erreur est capturée ici.
      console.error('Erreur de validation:', error.message);
    },
  });

  return (
    <div>
      <h2>{t('company_search_title')}</h2>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={t('company_search_placeholder')}
        style={{ padding: '0.5rem', minWidth: '300px' }}
      />

      {/* États de la recherche (useQuery) */}
      {isLoading && <p>{t('company_search_searching')}</p>}
      {isError && <p>{t('company_search_error')} {error instanceof Error && ` : ${error.message}`}</p>}

      {/* États de la validation (useMutation) */}
      {validateCompanyMutation.isPending && <p style={{ color: 'blue' }}>Validation en cours...</p>}
      {validateCompanyMutation.isSuccess && <p style={{ color: 'green' }}>Entreprise validée avec succès ! L'analyse complète est lancée.</p>}
      {validateCompanyMutation.isError && <p style={{ color: 'red' }}>Erreur : {validateCompanyMutation.error.message}</p>}

      {/* Liste des résultats */}
      {companies && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {companies.map(company => (
            <li key={company.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #eee' }}>
              <span>{company.name}</span>
              <button onClick={() => validateCompanyMutation.mutate(company)} disabled={validateCompanyMutation.isPending}>
                {validateCompanyMutation.isPending ? '...' : 'Valider et Analyser'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};