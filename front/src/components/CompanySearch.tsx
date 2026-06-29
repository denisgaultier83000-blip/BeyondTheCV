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
    mutationFn: validateCompanyAPI,
    // 1. onMutate est appelé AVANT la mutation. C'est ici que la magie opère.
    onMutate: async (selectedCompany) => {
      // Annuler les requêtes en cours pour la liste des entreprises pour éviter les conflits
      await queryClient.cancelQueries({ queryKey: ['companies', searchTerm] });

      // Sauvegarder l'état précédent de la liste
      const previousCompanies = queryClient.getQueryData(['companies', searchTerm]);

      // Mettre à jour l'UI de manière optimiste : on retire l'entreprise de la liste
      queryClient.setQueryData(['companies', searchTerm], (oldData: any[] | undefined) => 
        oldData ? oldData.filter(c => c.id !== selectedCompany.id) : []
      );

      // Retourner le snapshot de l'état précédent
      return { previousCompanies };
    },
    // 2. onError est appelé si la mutation échoue.
    onError: (err, variables, context) => {
      // On restaure les données précédentes depuis le contexte retourné par onMutate
      if (context?.previousCompanies) {
        queryClient.setQueryData(['companies', searchTerm], context.previousCompanies);
      }
      console.error('Erreur de validation (optimiste):', err.message);
    },
    // 3. onSettled est toujours appelé à la fin (succès ou erreur).
    onSettled: () => {
      // On invalide la requête pour resynchroniser l'état de l'UI avec le serveur.
      // C'est la source de vérité finale.
      queryClient.invalidateQueries({ queryKey: ['companies', searchTerm] });
      // On peut aussi invalider d'autres données qui dépendent de cette action
      queryClient.invalidateQueries({ queryKey: ['application_dossiers'] });
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