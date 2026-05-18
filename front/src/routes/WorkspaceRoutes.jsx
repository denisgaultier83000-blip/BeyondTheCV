import { Routes, Route } from 'react-router-dom';
import WorkspaceLayout from '../components/layouts/WorkspaceLayout';
import DashboardOverview from '../pages/Workspace/DashboardOverview';
import DocumentView from '../pages/Workspace/DocumentView';

// Composant de routage pour le module "Dossier Candidat"
export default function WorkspaceRoutes() {
  return (
    <Routes>
      {/* WorkspaceLayout gérera la récupération initiale du {ghd} et l'autorisation (Anti-IDOR) */}
      <Route path="/recherches/:ghd" element={<WorkspaceLayout />}>
        
        {/* Index du dossier : Affiche les "cartes" premium */}
        <Route index element={<DashboardOverview />} />
        
        {/* Vues de détail pour impression / édition */}
        <Route path="cv" element={<DocumentView documentType="cv" />} />
        <Route path="questions-reponses" element={<DocumentView documentType="qa" />} />
        <Route path="mises-en-situation" element={<DocumentView documentType="situations" />} />
        <Route path="entreprise" element={<DocumentView documentType="company" />} />
        <Route path="marche" element={<DocumentView documentType="market" />} />
        <Route path="defauts" element={<DocumentView documentType="flaws" />} />
        <Route path="pitch" element={<DocumentView documentType="pitch" />} />
        
      </Route>
    </Routes>
  );
}