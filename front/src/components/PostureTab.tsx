import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Video, Phone, Users, Coffee, Award, UserCog, Map as MapIcon,
  X, Zap, Loader2, AlertTriangle, Target, MessageCircle, Shield, Star, ChevronsRight, ChevronsLeft, UserCheck, Clock, Check, LifeBuoy,
  HelpCircle, Eye, WifiOff, PhoneMissed, VolumeX, BrainCircuit, DollarSign, Send, CheckSquare,
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import { DashboardCard } from './DashboardCard';
import RoadmapGeneratorModal from './RoadmapGeneratorModal';
export { RoadmapGeneratorModal };

type PostureTrainingEntry = {
  id: string;
  mode: 'manual' | 'voice' | 'video';
  title: string;
  summary: string;
  date: string;
  fileName?: string;
};

function getPostureTrainingEntries(): PostureTrainingEntry[] {
  try {
    const raw = localStorage.getItem('btcv_posture_sessions');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function PostureDataCard() {
  const [sessions, setSessions] = useState<PostureTrainingEntry[]>(() => getPostureTrainingEntries());

  useEffect(() => {
    const sync = () => setSessions(getPostureTrainingEntries());
    sync();
    window.addEventListener('btcv-posture-updated', sync);
    return () => window.removeEventListener('btcv-posture-updated', sync);
  }, []);

  const goToTraining = () => {
    window.dispatchEvent(new CustomEvent('btcv-go-training'));
  };

  return (
    <DashboardCard
      title="Données de posture"
      icon={<Award size={24} />}
      id="posture_data_section"
    >
      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '-1rem', marginBottom: '1.5rem' }}>
        Les données affichées ici proviennent des entraînements enregistrés dans la page S’entrainer. Elles servent de base pour suivre votre progression sans détour inutile.
      </p>

      {sessions.length === 0 ? (
        <div style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Aucune donnée de posture n’a encore été enregistrée depuis l’entraînement.</p>
          <button onClick={goToTraining} className="btn-primary" style={{ alignSelf: 'flex-start' }}>
            S’entraîner
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {sessions.map((session) => (
            <div key={session.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.9rem', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', marginBottom: '0.8rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{session.title}</span>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.08)', padding: '0.3rem 0.5rem', borderRadius: '999px' }}>
                  {session.mode === 'video' ? 'Vidéo' : session.mode === 'voice' ? 'Vocal' : 'Manuel'}
                </span>
              </div>
              <p style={{ margin: '0 0 0.8rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>{session.summary}</p>
              {session.fileName && (
                <p style={{ margin: '0 0 0.8rem 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Fichier : {session.fileName}</p>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(session.date).toLocaleDateString('fr-FR')}</span>
                <button onClick={goToTraining} className="btn-secondary" style={{ padding: '0.45rem 0.8rem', fontSize: '0.8rem' }}>
                  S’entraîner
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}

export function LastHourChecklistCard() {
  return (
    <DashboardCard
      title="Dernière Heure Avant l'Entretien"
      icon={<Clock size={24} />}
      id="last_hour_section"
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
  );
}

export function StrategicQuestionsCard() {
  return (
    <DashboardCard
      title="Questions Stratégiques à Poser"
      icon={<HelpCircle size={24} />}
      id="strategic_questions_section"
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
  );
}

export function SignalsToObserveCard() {
  return (
    <DashboardCard
      title="Signaux à Observer (Pendant l'entretien)"
      icon={<Eye size={24} />}
      id="signals_section"
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
  );
}

export function PostureGuidesCard() {
  return (
    <DashboardCard
      title="Adapter ma posture (Guides de Posture)"
      icon={<UserCog size={24} />}
      id="posture_guides_section"
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
  );
}

export function ContingencyPlanCard() {
  return (
    <DashboardCard
      title="Plan de secours (Gérer les Imprévus)"
      icon={<LifeBuoy size={24} />}
      id="contingency_plan_section"
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
  );
}

export default function PostureTab() {
  const { t } = useTranslation();
  const [isRoadmapModalOpen, setIsRoadmapModalOpen] = useState(false);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease-out' }}>
      <PostureDataCard />

      <DashboardCard
        title={t('posture_generator_title', "Feuille de Route Personnalisée")}
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

      <StrategicQuestionsCard />
      <SignalsToObserveCard />
      <PostureGuidesCard />
      <LastHourChecklistCard />
      <ContingencyPlanCard />

      {isRoadmapModalOpen && <RoadmapGeneratorModal onClose={() => setIsRoadmapModalOpen(false)} />}
    </div>
  );
}
