import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Video, Phone, User, Users, Coffee, Award, CheckSquare, Clock, UserCog, Briefcase, Anchor, GitBranch, Map as MapIcon, 
  X, Zap, Loader2, AlertTriangle, Target, MessageCircle, Shield, Star, ChevronsRight, ChevronsLeft, UserCheck 
} from 'lucide-react';
import { useDashboard } from './DashboardContext';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';

// --- [NOUVEAU] La modale est maintenant intégrée dans ce fichier ---

interface RoadmapGeneratorModalProps {
  onClose: () => void;
}

function RoadmapGeneratorModal({ onClose }: RoadmapGeneratorModalProps) {
  const { t } = useTranslation();
  const { cvData } = useDashboard();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const [selections, setSelections] = useState({
    type: cvData?.interview_format || 'visio',
    interlocutor: cvData?.interview_type || 'manager',
    level: cvData?.seniority_level || 'mid',
    context: 'first_interview',
  });

  const handleChange = (field: keyof typeof selections, value: string) => {
    setSelections(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/generate-roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: selections,
          profile: cvData,
        }),
      });

      if (!response.ok) {
        throw new Error("La génération de la feuille de route a échoué. Veuillez réessayer.");
      }

      const data = await response.json();
      setResult(data.roadmap);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const SelectField = ({ label, value, onChange, options }: { label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: { value: string, label: string }[] }) => (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <select value={value} onChange={onChange} className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none">
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );

  const RoadmapSection = ({ title, icon, children, color = 'text-gray-800' }: { title: string, icon: React.ReactNode, children: React.ReactNode, color?: string }) => (
    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
      <h4 className={`font-bold ${color} flex items-center gap-3 mb-3 text-lg`}>{icon} {title}</h4>
      <div className="text-sm text-gray-700 space-y-2 pl-1">
        {children}
      </div>
    </div>
  );

  const BulletList = ({ items }: { items: string[] }) => (
    <ul className="space-y-2">
      {items.map((item, index) => <li key={index} className="flex items-start gap-2"><ChevronsRight size={16} className="text-blue-500 mt-0.5 shrink-0"/><span>{item}</span></li>)}
    </ul>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--bg-card)', padding: '2.5rem', borderRadius: '1.25rem',
        width: '90%', maxWidth: '700px', position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)'
      }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={20} />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-3">
            <MapIcon size={28} className="text-blue-600" />
            Générateur de Feuille de Route
          </h2>
          <p className="text-gray-500 mt-2">Configurez le contexte de votre entretien pour un plan sur-mesure.</p>
        </div>

        {!result ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <SelectField label="Type d'entretien" value={selections.type} onChange={(e) => handleChange('type', e.target.value)} options={[{ value: 'visio', label: 'Visioconférence' }, { value: 'presentiel', label: 'Présentiel' }, { value: 'telephone', label: 'Téléphonique' }]} />
              <SelectField label="Interlocuteur" value={selections.interlocutor} onChange={(e) => handleChange('interlocutor', e.target.value)} options={[{ value: 'rh', label: 'RH / Recruteur' }, { value: 'manager', label: 'Manager Opérationnel' }, { value: 'dg', label: 'Direction / C-Level' }, { value: 'cabinet', label: 'Cabinet de recrutement' }]} />
              <SelectField label="Niveau de poste" value={selections.level} onChange={(e) => handleChange('level', e.target.value)} options={[{ value: 'junior', label: 'Junior' }, { value: 'mid', label: 'Confirmé' }, { value: 'senior', label: 'Senior / Expert' }, { value: 'director', label: 'Direction' }]} />
              <SelectField label="Contexte" value={selections.context} onChange={(e) => handleChange('context', e.target.value)} options={[{ value: 'first_interview', label: 'Premier entretien' }, { value: 'final_interview', label: 'Entretien final' }, { value: 'negotiation', label: 'Négociation salariale' }, { value: 'reconversion', label: 'Reconversion' }]} />
            </div>
            {error && <div className="bg-red-50 text-red-700 p-3 rounded-md mb-6 flex items-center gap-2 text-sm"><AlertTriangle size={18} /> {error}</div>}
            <div className="flex justify-center">
              <button onClick={handleGenerate} disabled={loading} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50">
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} />}
                {loading ? "Génération en cours..." : "Générer mon plan"}
              </button>
            </div>
          </>
        ) : (
          <div className="animate-fadeIn space-y-6">
            <h3 className="text-xl font-bold text-center text-blue-700">{result.title}</h3>
            <RoadmapSection title="Focus du Recruteur" icon={<Target size={20} />} color="text-blue-800">
              <p className="text-xs text-gray-500 italic mb-3">Ce que votre interlocuteur cherchera à valider en priorité.</p>
              <BulletList items={result.recruiter_focus || []} />
            </RoadmapSection>
            <RoadmapSection title="Messages Clés à Marteler" icon={<MessageCircle size={20} />} color="text-green-800">
               <p className="text-xs text-gray-500 italic mb-3">Les 3 idées que vous devez absolument faire passer, peu importe les questions.</p>
              <BulletList items={result.key_messages || []} />
            </RoadmapSection>
            <RoadmapSection title="Règles d'Or" icon={<Star size={20} />} color="text-amber-700">
              <BulletList items={result.golden_rules || []} />
            </RoadmapSection>
            <RoadmapSection title="Erreurs à Éviter" icon={<Shield size={20} />} color="text-red-700">
              <BulletList items={result.mistakes_to_avoid || []} />
            </RoadmapSection>
            <RoadmapSection title="Check-list Avant Entretien" icon={<CheckSquare size={20} />}>
              <div className="space-y-4">
                <div><h5 className="font-semibold flex items-center gap-2 mb-2"><Clock size={16}/> 24h avant</h5><BulletList items={result.pre_interview_checklist?.h_minus_24 || []} /></div>
                <div><h5 className="font-semibold flex items-center gap-2 mb-2"><Clock size={16}/> 1h avant</h5><BulletList items={result.pre_interview_checklist?.h_minus_1 || []} /></div>
                <div><h5 className="font-semibold flex items-center gap-2 mb-2"><Clock size={16}/> 5 min avant</h5><BulletList items={result.pre_interview_checklist?.h_minus_5 || []} /></div>
              </div>
            </RoadmapSection>
            <RoadmapSection title="Phrase d'Ouverture" icon={<ChevronsRight size={20} />}>
              <p className="italic">"{result.opening_statement}"</p>
            </RoadmapSection>
            <RoadmapSection title="Phrase de Conclusion" icon={<ChevronsLeft size={20} />}>
              <p className="italic">"{result.closing_statement}"</p>
            </RoadmapSection>
            <RoadmapSection title="Conseils de Posture" icon={<UserCheck size={20} />}>
              <p>{result.posture_advice}</p>
            </RoadmapSection>
            <div className="text-center pt-4 border-t border-gray-200">
              <button onClick={() => setResult(null)} className="btn-secondary">Générer un autre plan</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const GuideCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <div className="flex items-start gap-4">
      <div className="text-blue-500 bg-blue-50 p-3 rounded-lg mt-1">{icon}</div>
      <div>
        <h3 className="font-bold text-lg text-gray-800 mb-1">{title}</h3>
        <div className="text-sm text-gray-600 space-y-2">{children}</div>
      </div>
    </div>
  </div>
);

export default function PostureTab() {
  const { t } = useTranslation();
  const [isRoadmapModalOpen, setIsRoadmapModalOpen] = useState(false);

  return (
    <div className="animate-fadeIn space-y-8 p-1">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800">Maîtriser sa Posture en Entretien</h2>
        <p className="mt-2 text-lg text-gray-600 max-w-3xl mx-auto">
          Au-delà des compétences, c'est votre posture qui fait la différence. Apprenez à maîtriser les codes implicites de l'entretien.
        </p>
      </div>

      <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl text-center">
        <h3 className="text-xl font-bold text-blue-800 mb-3">Feuille de Route Personnalisée</h3>
        <p className="text-blue-700 max-w-2xl mx-auto mb-6">
          Générez un plan d'action sur-mesure en fonction du type d'entretien, de votre interlocuteur et de votre niveau de séniorité. Obtenez des conseils de posture, des phrases clés et une check-list pour ne rien laisser au hasard.
        </p>
        <button onClick={() => setIsRoadmapModalOpen(true)} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-blue-700 transition-all">
          <MapIcon className="inline-block mr-2" size={20} />
          Ouvrir le Générateur de Feuille de Route
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <GuideCard icon={<Video />} title="Posture en Visioconférence">
          <p>Regardez la caméra, pas l'écran. Assurez un arrière-plan neutre et un bon éclairage. Testez votre micro et votre connexion en amont.</p>
        </GuideCard>
        <GuideCard icon={<Users />} title="Posture face à un Manager">
          <p>Parlez "résultats" et "impact business". Montrez comment vous pouvez résoudre SES problèmes. Soyez proactif et orienté solution.</p>
        </GuideCard>
        <GuideCard icon={<User />} title="Posture face à un RH">
          <p>Mettez en avant votre personnalité, vos soft skills et votre adéquation avec la culture de l'entreprise. Montrez votre motivation et votre vision à long terme.</p>
        </GuideCard>
        <GuideCard icon={<Coffee />} title="Le Café Post-Entretien">
          <p>Même si le cadre devient informel, restez professionnel. C'est une extension de l'entretien pour évaluer votre savoir-être.</p>
        </GuideCard>
        <GuideCard icon={<Phone />} title="L'Entretien Téléphonique">
          <p>Le non-verbal ne passe pas. Compensez avec une voix dynamique, des silences maîtrisés et un discours clair. Souriez, ça s'entend !</p>
        </GuideCard>
        <GuideCard icon={<Award />} title="Négociation Salariale">
          <p>Ne donnez jamais de chiffre en premier. Ancrez la discussion sur votre valeur et les standards du marché, pas sur vos besoins personnels.</p>
        </GuideCard>
      </div>

      {isRoadmapModalOpen && <RoadmapGeneratorModal onClose={() => setIsRoadmapModalOpen(false)} />}
    </div>
  );
}
