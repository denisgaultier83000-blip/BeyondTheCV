import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Video, Phone, Users, Coffee, Award, UserCog, Map as MapIcon,
  X, Zap, Loader2, AlertTriangle, Target, MessageCircle, Shield, Star, ChevronsRight, ChevronsLeft, UserCheck, Clock, Check, Edit, LifeBuoy,
  HelpCircle, Mail, Eye,
  WifiOff, PhoneMissed, VolumeX, BrainCircuit, DollarSign, HelpCircle, Send
} from 'lucide-react';
import { useDashboard } from './DashboardContext';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import { DebriefModal } from './DebriefModal';

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

import { DashboardCard } from './DashboardCard';

export default function PostureTab() {
  const { t } = useTranslation();
  const [isRoadmapModalOpen, setIsRoadmapModalOpen] = useState(false);
  const [isDebriefModalOpen, setIsDebriefModalOpen] = useState(false);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease-out' }}>
      <DashboardCard
        title="Feuille de Route Personnalisée"
        icon={<MapIcon size={24} />}
        id="roadmap_section"
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '-1rem', marginBottom: '1.5rem' }}>
          Générez un plan d'action sur-mesure en fonction du type d'entretien, de votre interlocuteur et de votre niveau de séniorité. Obtenez des conseils de posture, des phrases clés et une check-list pour ne rien laisser au hasard.
        </p>
        <button onClick={() => setIsRoadmapModalOpen(true)} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapIcon size={20} />
          Ouvrir le Générateur de Feuille de Route
        </button>
      </DashboardCard>

      {/* NOUVEAU : Dernière Heure avant l'Entretien */}
      <DashboardCard
        title="Dernière Heure Avant l'Entretien"
        icon={<Clock size={24} />}
        id="last_hour_section" // ID pour l'ancrage
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '-1rem', marginBottom: '1.5rem' }}>
          Le guide de survie ultime. Pas de théorie, uniquement des actions à mener dans les 60 minutes qui précèdent l'échange.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          {[
            "Relire son pitch en 90 secondes.",
            "Relire les 3 messages clés à faire passer.",
            "Vérifier le nom et la fonction des interlocuteurs.",
            "Préparer 3 questions intelligentes.",
            "Préparer une réponse courte sur salaire, disponibilité et motivation.",
            "Fermer les onglets inutiles.",
            "Couper les notifications.",
            "Respirer lentement 2 minutes.",
          ].map((item, index) => (
            <div key={index} style={{ background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Check size={18} color="var(--primary)" />
              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{item}</span>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* NOUVEAU : Questions à Poser */}
      <DashboardCard
        title="Questions Stratégiques à Poser"
        icon={<HelpCircle size={24} />}
        id="strategic_questions_section" // ID pour l'ancrage
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '-1rem', marginBottom: '1.5rem' }}>
          Ne subissez plus l'entretien, pilotez-le. Des questions pertinentes pour chaque type d'interlocuteur.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: 0, color: 'var(--text-main)', fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><Users size={20} /> Face à un RH</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <li>Quels sont les critères qui feront qu’un candidat sera considéré comme réussi sur ce poste ?</li>
              <li>Quelles sont les prochaines étapes du processus ?</li>
              <li>Y a-t-il des points de mon parcours que vous souhaitez approfondir ?</li>
            </ul>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: 0, color: 'var(--text-main)', fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><UserCog size={20} /> Face à un Manager</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <li>Quels sont les trois enjeux prioritaires sur les six premiers mois ?</li>
              <li>Qu’est-ce qui vous ferait dire dans six mois que le recrutement est réussi ?</li>
              <li>Quels sont les irritants actuels dans l’équipe ou l’organisation ?</li>
            </ul>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: 0, color: 'var(--text-main)', fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><Award size={20} /> Face à un Dirigeant</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <li>Quelle contribution attendez-vous de ce poste sur la trajectoire globale de l’entreprise ?</li>
              <li>Quels arbitrages stratégiques auront le plus d’impact dans les prochains mois ?</li>
            </ul>
          </div>
        </div>
      </DashboardCard>

      {/* NOUVEAU : Signaux à Observer */}
      <DashboardCard
        title="Signaux à Observer (Pendant l'entretien)"
        icon={<Eye size={24} />}
        id="signals_section" // ID pour l'ancrage
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '-1rem', marginBottom: '1.5rem' }}>
          Vous n'êtes pas seulement évalué, vous évaluez aussi. Gardez ces points en tête pour prendre la bonne décision.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {[
            "Le recruteur décrit-il clairement le poste ?",
            "Les attentes sont-elles cohérentes avec les moyens annoncés ?",
            "Le manager parle-t-il de l’équipe avec respect ?",
            "Les délais, objectifs et responsabilités sont-ils réalistes ?",
            "Le processus de recrutement est-il clair ?",
            "Y a-t-il des contradictions entre RH, manager et fiche de poste ?",
          ].map((item, index) => (
            <div key={index} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 500 }}>
              {item}
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard
        title="Guides de Posture"
        icon={<UserCog size={24} />}
        id="posture_guides_section" // ID pour l'ancrage
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {[
            { icon: <Video />, title: "Posture en Visioconférence", desc: "Regardez la caméra, pas l'écran. Assurez un arrière-plan neutre et un bon éclairage. Testez votre micro et votre connexion en amont." },
            { icon: <Users />, title: "Posture face à un Manager", desc: "Parlez \"résultats\" et \"impact business\". Montrez comment vous pouvez résoudre SES problèmes. Soyez proactif et orienté solution." },
            { icon: <UserCheck />, title: "Posture face à un RH", desc: "Mettez en avant votre personnalité, vos soft skills et votre adéquation avec la culture de l'entreprise. Montrez votre motivation et votre vision à long terme." },
            { icon: <Coffee />, title: "Le Café Post-Entretien", desc: "Même si le cadre devient informel, restez professionnel. C'est une extension de l'entretien pour évaluer votre savoir-être." },
            { icon: <Phone />, title: "L'Entretien Téléphonique", desc: "Le non-verbal ne passe pas. Compensez avec une voix dynamique, des silences maîtrisés et un discours clair. Souriez, ça s'entend !" },
            { icon: <Award />, title: "Négociation Salariale", desc: "Ne donnez jamais de chiffre en premier. Ancrez la discussion sur votre valeur et les standards du marché, pas sur vos besoins personnels." },
          ].map((item, index) => (
            <div key={index} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--primary)', marginTop: '4px', flexShrink: 0 }}>{React.cloneElement(item.icon, { size: 22 })}</div>
              <div>
                <h4 style={{ margin: 0, color: 'var(--text-main)', fontWeight: 600, fontSize: '1rem' }}>{item.title}</h4>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* NOUVEAU : Débrief Post-Entretien (Statique pour l'instant) */}
      <DashboardCard
        title="Débrief d'Entretien"
        icon={<Edit size={24} />}
        id="debrief_section" // ID pour l'ancrage
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '-1rem', marginBottom: '1.5rem' }}>
          Capitalisez sur chaque échange. Enregistrez vos impressions à chaud pour transformer chaque entretien en une leçon stratégique pour le suivant.
        </p>
        <button onClick={() => setIsDebriefModalOpen(true)} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <Edit size={20} />
          Enregistrer un nouveau débrief
        </button>
      </DashboardCard>

      {/* NOUVEAU : Section Gérer les Imprévus */}
      <DashboardCard
        title="Gérer les Imprévus (Plan de Secours)"
        icon={<LifeBuoy size={24} />}
        id="contingency_plan_section" // ID pour l'ancrage
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '-1rem', marginBottom: '1.5rem' }}>
          Des réponses prêtes à l’emploi pour rester professionnel même quand l’entretien ne se déroule pas comme prévu.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {[
            { icon: <WifiOff />, title: "Problème de connexion visio", content: "Bonjour,\n\nJe rencontre un problème de connexion pour rejoindre notre entretien. Je tente de me reconnecter immédiatement.\n\nSi le problème persiste, je reste joignable par téléphone au [Votre Numéro] et suis disponible pour poursuivre l'échange selon le format qui vous conviendra.\n\nMerci pour votre compréhension.\n\nBien cordialement,\n[Prénom Nom]" },
            { icon: <Clock />, title: "Retard du recruteur (> 5 min)", content: "Bonjour,\n\nJe suis bien connecté pour notre entretien prévu à [heure]. Je reste disponible en ligne.\n\nN’hésitez pas à me dire si vous souhaitez maintenir l’échange ou le reprogrammer à un moment plus adapté.\n\nBien cordialement,\n[Prénom Nom]" },
            { icon: <PhoneMissed />, title: "Vous êtes en retard", content: "Bonjour,\n\nJe suis désolé, je rencontre un imprévu et serai en retard de quelques minutes pour notre entretien.\n\nJe fais le nécessaire pour être disponible au plus vite. Si cela perturbe votre agenda, je m’adapterai bien entendu à vos disponibilités.\n\nBien cordialement,\n[Prénom Nom]" },
            { icon: <VolumeX />, title: "Bruit ou interruption imprévue", content: "Je vous prie de m'excuser pour cette interruption. Donnez-moi juste un instant pour régler cela... C'est bon, je suis de nouveau à vous." },
            { icon: <BrainCircuit />, title: "Trou de mémoire", content: "C'est une excellente question. Je vais prendre quelques secondes pour structurer ma réponse afin de vous répondre clairement." },
            { icon: <Shield />, title: "Question agressive / déstabilisante", content: "C’est un point légitime. Je ne vais pas le contourner : il y a effectivement un sujet à expliquer. Ce que j’en retiens surtout, c’est [enseignement], et c’est précisément ce qui me permet aujourd’hui d’aborder ce type de situation avec plus de méthode." },
            { icon: <DollarSign />, title: "Le salaire est abordé trop tôt", content: "Je préfère d’abord m'assurer de bien comprendre le périmètre exact du poste, les responsabilités attendues et vos enjeux prioritaires. Cela me permettra de vous donner une fourchette cohérente et réaliste." },
            { icon: <HelpCircle />, title: "Recruteur froid ou peu expressif", content: "(Posture à adopter) Restez factuel, ne sur-interprétez pas. Concentrez-vous sur votre structure (STAR), posez des questions ouvertes pour l'impliquer ('Quel est le principal défi sur ce poste actuellement ?') et validez sa compréhension ('Est-ce que cela répond à votre question ?')." },
            { icon: <Send />, title: "L'entretien se termine sans suite claire", content: "Merci pour cet échange très instructif. Pour ma part, je suis très intéressé. Quelles sont les prochaines étapes du processus de votre côté ?" },
          ].map((item, index) => (
            <div key={index} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ color: 'var(--primary)', flexShrink: 0 }}>{React.cloneElement(item.icon, { size: 20 })}</div>
                <h4 style={{ margin: 0, color: 'var(--text-main)', fontWeight: 600, fontSize: '1rem' }}>{item.title}</h4>
              </div>
              <div style={{ 
                background: 'var(--bg-card)', 
                padding: '1rem', 
                borderRadius: '0.5rem', 
                border: '1px dashed var(--border-color)', 
                whiteSpace: 'pre-wrap', 
                fontSize: '0.9rem', 
                color: 'var(--text-muted)',
                flexGrow: 1
              }}>
                {item.content}
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {isRoadmapModalOpen && <RoadmapGeneratorModal onClose={() => setIsRoadmapModalOpen(false)} />}
      {isDebriefModalOpen && <DebriefModal onClose={() => setIsDebriefModalOpen(false)} cvData={useDashboard().cvData} />}
    </div>
  );
}
