import React from "react";
import { useTranslation } from "react-i18next";
import { 
  FileText, User, MessageSquare, Mic, 
  BarChart3, Target, Sparkles, Briefcase, Wallet, Linkedin,
  Compass, Map, Search, Dumbbell, ShieldAlert
} from 'lucide-react';

interface DashboardProps {
  data: any;
  experiences: any[];
  educations: any[];
  onAction?: (action: string) => void;
  loading: boolean;
  progress?: number;
  onBack: () => void;
  currentAction?: string | null;
  salaryData?: any;
  researchData?: any;
  isResearching?: boolean;
  careerGpsData?: any;
  careerRadarData?: any;
  jobDecoderData?: any;
  pitchData?: any;
  questionsData?: any;
  flawCoachingResult?: any;
  gapAnalysis?: any; // Ajout optionnel pour le futur
  lang?: string;
}

export default function Dashboard({
  data,
  onAction,
  loading,
  onBack,
  currentAction,
  salaryData,
  researchData,
  gapAnalysis,
  flawCoachingResult,
  careerGpsData,
  careerRadarData,
  jobDecoderData,
  pitchData,
  questionsData,
  isResearching,
}: DashboardProps) {

  const { t } = useTranslation();

  const ActionCard = ({ icon, title, desc, onClick, disabled, ready }: { icon: React.ReactElement, title: string, desc: string, onClick?: () => void, disabled?: boolean, ready?: any }) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className="action-card-new"
    >
      <div className="action-card-new-icon">
        {React.cloneElement(icon, { size: 24, strokeWidth: 1.5 })}
      </div>
      <div className="action-card-new-text">
        <div className="action-card-new-title-container">
          <h3 className="action-card-new-title">{title}</h3>
          {ready && <span className="ready-badge">✅ {t('ready_status', 'Prêt')}</span>}
        </div>
        <p className="action-card-new-desc">{desc}</p>
      </div>
    </button>
  );

  // Helper pour savoir si on a une entreprise cible définie
  const hasCompany = !!data.target_company;

  return (
    <div className="dashboard-container-new">
      {/* Overlay de chargement */}
      {loading && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'var(--bg-body)', zIndex: 10000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
            <div className="spinner" style={{ width: '50px', height: '50px', border: '5px solid #f3f3f3', borderTop: '5px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <h3 style={{ marginTop: '20px', color: 'var(--text-main)' }}>
                {currentAction ? `${currentAction}...` : t('btn_generating')}
            </h3>
            <div style={{ width: '300px', height: '10px', background: '#e0e0e0', borderRadius: '5px', marginTop: '15px', overflow: 'hidden' }}>
                <div style={{ width: '0%', height: '100%', background: '#3498db', animation: 'progressBarAnim 15s ease-out forwards' }}></div>
            </div>
            <p style={{ marginTop: '10px', color: 'var(--text-muted)', fontSize: '14px' }}>Analyse IA en cours, veuillez patienter...</p>
            <style>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes progressBarAnim { 0% { width: 0%; } 90% { width: 95%; } 100% { width: 100%; } }
            `}</style>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <h2 style={{ margin: 0, fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
          {t('dashboard_title', 'Tableau de bord')}
        </h2>
        <button onClick={onBack} className="btn-secondary" disabled={loading}>
          &larr; {t('profile')}
        </button>
      </div>

      {/* GRILLE PRINCIPALE (3 Colonnes) */}
      <div className="dashboard-grid-new">
        
        {/* --- SECTION 1 : CV --- */}
        <div className="section-card-new">
          <div className="section-header-new">
            <div className="section-icon-new">
              <FileText size={20} />
            </div>
            <h2 className="section-title-new">{t('tab_cv', 'Mon CV')}</h2>
          </div>
          
          <div className="action-cards-container-new">
            <ActionCard 
              icon={<FileText />} 
              title="Créer / Éditer mon CV" 
              desc="Générez et prévisualisez votre CV au format unique (optimisé ATS & Recruteur)."
              onClick={() => onAction && onAction("Review CV")}
              disabled={loading}
              ready={true}
            />
          </div>
        </div>

        {/* --- SECTION 2 : ENTRETIEN --- */}
        <div className="section-card-new">
          <div className="section-header-new">
            <div className="section-icon-new">
              <MessageSquare size={20} />
            </div>
            <h2 className="section-title-new">{t('tab_interview', 'Entretien')}</h2>
          </div>
          
          <div className="action-cards-container-new">
            <ActionCard 
              icon={<MessageSquare />} 
              title={t('card_interview_title')} 
              desc={t('card_interview_desc')}
              onClick={() => onAction && onAction("Questionnaire")}
              disabled={loading && currentAction === "Questionnaire"}
              ready={questionsData}
            />
            <ActionCard 
              icon={<Mic />} 
              title={t('card_pitch_title')} 
              desc={t('card_pitch_desc')}
              onClick={() => onAction && onAction("Pitch")}
              disabled={loading && currentAction === "Pitch"}
              ready={pitchData}
            />
            <ActionCard 
              icon={<Sparkles />} 
              title="Parades aux Défauts" 
              desc="Transformez vos points de vigilance en arguments de force pour l'entretien."
              onClick={() => onAction && onAction("Flaw Coaching")}
              disabled={loading}
              ready={!!flawCoachingResult}
            />
          </div>
        </div>

        {/* --- SECTION 3 : ANALYSE --- */}
        <div className="section-card-new">
          <div className="section-header-new">
            <div className="section-icon-new">
              <BarChart3 size={20} />
            </div>
            <h2 className="section-title-new">{t('tab_analysis', 'Analyse')}</h2>
          </div>
          
          <div className="action-cards-container-new">
            <ActionCard 
              icon={<Briefcase />} 
              title={t('card_company_title')} 
              desc={t('card_company_desc')}
              onClick={() => onAction && onAction(researchData && hasCompany ? "View Company Report" : "Company Research")}
              disabled={loading || isResearching}
              ready={researchData && hasCompany}
            />
            <ActionCard 
              icon={<BarChart3 />} 
              title={t('card_market_title')} 
              desc={t('card_market_desc')}
              onClick={() => onAction && onAction(researchData ? "View Market Report" : "Market Research")}
              disabled={loading || isResearching}
              ready={researchData}
            />
             <ActionCard 
              icon={<Wallet />}
              title={t('salary_title', 'Estimation Salaire')} 
              desc={t('card_salary_desc', 'Estimez votre fourchette de salaire.')}
              onClick={() => onAction && onAction(salaryData ? "View Salary" : "Salary Estimate")}
              disabled={loading && currentAction === "Salary Estimate"}
              ready={salaryData}
            />
            <ActionCard 
              icon={<Target />} 
              title={t('card_gap_title')} 
              desc={t('card_gap_desc')}
              onClick={() => onAction && onAction(gapAnalysis ? "View Gap Analysis" : "Gap Analysis")}
              disabled={loading && currentAction === "Gap Analysis"}
              ready={gapAnalysis}
            />
            <ActionCard 
              icon={<Search />} 
              title="Décodeur d'annonce" 
              desc="Lisez entre les lignes et décodez le vrai jargon RH."
              onClick={() => onAction && onAction("Job Decoder")}
              disabled={loading}
              ready={jobDecoderData}
            />
            <ActionCard 
              icon={<Compass />} 
              title="Career GPS" 
              desc="Votre feuille de route pas-à-pas vers ce poste."
              onClick={() => onAction && onAction("Career GPS")}
              disabled={loading}
              ready={careerGpsData}
            />
            <ActionCard 
              icon={<Map />} 
              title="Career Radar" 
              desc="Découvrez des trajectoires de carrière alternatives."
              onClick={() => onAction && onAction("Career Radar")}
              disabled={loading}
              ready={careerRadarData}
            />
            <ActionCard 
              icon={<Linkedin />} 
              title="Badge LinkedIn" 
              desc="Partagez votre archétype pour challenger votre réseau (Reality Check)."
              onClick={() => onAction && onAction("Reality Check")}
              disabled={loading}
              ready={true}
            />
          </div>
        </div>

        {/* --- SECTION 4 : S'ENTRAINER --- */}
        <div className="section-card-new">
          <div className="section-header-new">
            <div className="section-icon-new">
              <Dumbbell size={20} />
            </div>
            <h2 className="section-title-new">{t('tab_training', "S'entrainer")}</h2>
          </div>
          
          <div className="action-cards-container-new">
            <ActionCard 
              icon={<ShieldAlert />} 
              title="Mises en situation" 
              desc="Gérez des scénarios de crise et décisions complexes adaptés à votre poste."
              onClick={() => onAction && onAction("Training Scenarios")}
              disabled={loading}
              ready={true}
            />
            <ActionCard 
              icon={<MessageSquare />} 
              title="Entraînement ciblé" 
              desc="Pratiquez la méthode STAR sur des thèmes précis (Conflit, Négociation...)."
              onClick={() => onAction && onAction("Training Targeted")}
              disabled={loading}
              ready={true}
            />
          </div>
        </div>

      </div>

      <style>{`
        .dashboard-container-new {
          background-color: transparent;
          padding: 2rem;
          font-family: sans-serif;
        }
        .dashboard-grid-new {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        @media (min-width: 1024px) {
          .dashboard-grid-new {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .section-card-new {
          background-color: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        }
        .section-header-new {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        .section-icon-new {
          padding: 0.5rem;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .section-title-new {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }
        .action-cards-container-new {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .action-card-new {
          width: 100%;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          border-radius: 0.75rem;
          border: 1px solid transparent;
          background-color: transparent;
          transition: all 0.2s ease-in-out;
          text-align: left;
          cursor: pointer;
        }
        .action-card-new:hover {
          border-color: var(--primary);
          background-color: var(--bg-secondary);
        }
        .action-card-new:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background-color: transparent;
        }
        .action-card-new-icon {
          color: var(--primary);
          margin-top: 4px;
          transition: transform 0.2s;
        }
        .action-card-new:hover .action-card-new-icon {
          transform: scale(1.1);
        }
        .action-card-new-text {
          flex: 1;
        }
        .action-card-new-title-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .action-card-new-title {
          font-weight: 600;
          color: var(--text-main);
          line-height: 1.2;
          margin: 0;
        }
        .action-card-new-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
          margin-bottom: 0;
        }
        .ready-badge {
          font-size: 0.7rem;
          background: #dcfce7;
          color: #166534;
          padding: 2px 8px;
          border-radius: 12px;
          border: 1px solid #bbf7d0;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}