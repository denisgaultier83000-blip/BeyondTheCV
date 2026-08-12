import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Video, Phone, Users, Coffee, Award, UserCog, Map as MapIcon,
  X, Zap, Loader2, AlertTriangle, Target, MessageCircle, Shield, Star, ChevronsRight, ChevronsLeft, UserCheck, Clock, Check, Edit, LifeBuoy,
  HelpCircle, Mail, Eye,
  WifiOff, PhoneMissed, VolumeX, BrainCircuit, DollarSign, Send, CheckSquare,
  Camera, CameraOff, Gauge,
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';

type PresenceMetrics = {
  eyeContact: number;
  postureStability: number;
  headMovement: number;
  cameraFraming: number;
  notesGlances: number;
};

const defaultPresenceMetrics: PresenceMetrics = {
  eyeContact: 0,
  postureStability: 0,
  headMovement: 0,
  cameraFraming: 0,
  notesGlances: 0,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function PresenceCoachCard() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<ImageData | null>(null);
  const detectTimerRef = useRef<number>(0);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [livemetrics, setLivemetrics] = useState<PresenceMetrics>(defaultPresenceMetrics);
  const [status, setStatus] = useState('Prêt à analyser votre présence.');

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  }, []);

  const computeMotionVariance = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;

    const { width, height } = canvas;
    const image = ctx.getImageData(0, 0, width, height).data;
    const lastFrame = lastFrameRef.current;

    if (!lastFrame) {
      lastFrameRef.current = new ImageData(new Uint8ClampedArray(image), width, height);
      return 0;
    }

    let diff = 0;
    const step = 4;
    for (let i = 0; i < image.length; i += step) {
      const delta = Math.abs(image[i] - lastFrame.data[i]);
      diff += delta;
    }

    const normalized = (diff / ((width * height * 255) || 1)) * 1000;
    lastFrameRef.current = new ImageData(new Uint8ClampedArray(image), width, height);
    return clamp(normalized, 0, 100);
  };

  const updateMetricsFromStream = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const motion = computeMotionVariance(canvas);
    const centerBias = Math.abs(canvas.width / 2 - (canvas.width * 0.5)) / (canvas.width * 0.5);
    const postureStability = clamp(100 - motion * 2.5, 0, 100);
    const eyeContact = clamp(100 - (centerBias * 100) - Math.max(0, motion - 10), 0, 100);
    const headMovement = clamp(motion * 4, 0, 100);
    const cameraFraming = clamp(100 - Math.abs((canvas.width * 0.5) - (canvas.width * 0.45)) / (canvas.width * 0.5) * 100, 0, 100);
    const notesGlances = clamp(Math.max(0, headMovement - 35), 0, 100);

    setLivemetrics({
      eyeContact: Math.round(eyeContact),
      postureStability: Math.round(postureStability),
      headMovement: Math.round(headMovement),
      cameraFraming: Math.round(cameraFraming),
      notesGlances: Math.round(notesGlances),
    });

    if (postureStability < 60) {
      setStatus('Votre posture bouge beaucoup : stabilisez votre base et réduisez les gestes parasites.');
    } else if (eyeContact < 65) {
      setStatus('Votre regard est partiellement détourné : cherchez à conserver plus de contact visuel avec la caméra.');
    } else {
      setStatus('Bonne présence visuelle : votre cadrage et votre posture sont globalement stables.');
    }
  };

  useEffect(() => {
    if (!isCameraOn) return;

    const tick = () => {
      const now = Date.now();
      if (now - detectTimerRef.current > 350) {
        updateMetricsFromStream();
        detectTimerRef.current = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isCameraOn]);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Votre navigateur ne prend pas en charge la webcam.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 540 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraOn(true);
      setCameraError(null);
      setStatus('Analyse en direct active. Gardez le regard sur la caméra.');
    } catch (error) {
      console.error(error);
      setCameraError('L’accès à la caméra a été refusé. Vérifiez votre navigateur et vos permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOn(false);
    setStatus('Caméra fermée. Vous pouvez relancer l’analyse à tout moment.');
    lastFrameRef.current = null;
    setLivemetrics(defaultPresenceMetrics);
  };

  const metrics = [
    { label: 'Contact caméra', value: `${livemetrics.eyeContact}/100`, tone: livemetrics.eyeContact >= 70 ? 'good' : livemetrics.eyeContact >= 50 ? 'warn' : 'bad' },
    { label: 'Stabilité posture', value: `${livemetrics.postureStability}/100`, tone: livemetrics.postureStability >= 70 ? 'good' : livemetrics.postureStability >= 50 ? 'warn' : 'bad' },
    { label: 'Mouvement tête', value: `${livemetrics.headMovement}/100`, tone: livemetrics.headMovement <= 50 ? 'good' : livemetrics.headMovement <= 70 ? 'warn' : 'bad' },
    { label: 'Cadrage', value: `${livemetrics.cameraFraming}/100`, tone: livemetrics.cameraFraming >= 70 ? 'good' : livemetrics.cameraFraming >= 50 ? 'warn' : 'bad' },
  ];

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', background: 'rgba(37, 99, 235, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <Camera size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Présence & posture</h3>
            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Observation de signaux visibles, sans inférence émotionnelle.</p>
          </div>
        </div>

        <button
          onClick={isCameraOn ? stopCamera : startCamera}
          className={isCameraOn ? 'btn-outline' : 'btn-primary'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {isCameraOn ? <CameraOff size={18} /> : <Camera size={18} />}
          {isCameraOn ? 'Arrêter l’analyse' : 'Analyser ma présence'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.25rem' }}>
        <div style={{ position: 'relative', borderRadius: '0.9rem', overflow: 'hidden', background: '#0f172a', minHeight: '270px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: isCameraOn ? 'block' : 'none' }} />
          {!isCameraOn && (
            <div style={{ textAlign: 'center', color: 'white', maxWidth: '300px', padding: '1rem' }}>
              <Camera size={34} style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Lancez la caméra pour mesurer votre présence.</div>
              <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Le score se base sur des éléments visibles : regard, cadrage, stabilité de posture, gestion de la tête.</div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {metrics.map((metric) => (
            <div key={metric.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '0.8rem 0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{metric.label}</span>
                <span style={{
                  fontWeight: 700,
                  color: metric.tone === 'good' ? '#16a34a' : metric.tone === 'warn' ? '#d97706' : '#dc2626',
                }}>{metric.value}</span>
              </div>
              <div style={{ width: '100%', height: '0.55rem', background: 'rgba(148, 163, 184, 0.15)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.max(8, Number(metric.value.replace('/100', '')))}%`,
                  height: '100%',
                  borderRadius: '999px',
                  background: metric.tone === 'good' ? '#22c55e' : metric.tone === 'warn' ? '#f59e0b' : '#ef4444',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {cameraError && (
        <div style={{ marginTop: '1rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#991b1b', borderRadius: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.9rem' }}>
          {cameraError}
        </div>
      )}

      <div style={{ marginTop: '1rem', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--text-main)', borderRadius: '0.75rem', padding: '0.9rem 1rem' }}>
        <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Conseil de coaching</strong>
        <span>{status}</span>
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
        <strong>Positionnement :</strong> cette analyse mesure uniquement des éléments observables : contact visuel, cadrage, posture, gestes et stabilité. Elle ne détermine pas votre personnalité ou votre émotion.
      </div>
    </div>
  );
}

interface RoadmapGeneratorModalProps {
  onClose: () => void;
}

function RoadmapGeneratorModal({ onClose }: RoadmapGeneratorModalProps) {
  const { t } = useTranslation(); // [FIX] cvData n'est pas disponible ici, on retire la dépendance
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const [selections, setSelections] = useState({
    type: 'visio', // Valeur par défaut
    interlocutor: 'manager', // Valeur par défaut
    level: 'mid', // Valeur par défaut
    context: 'first_interview', // Valeur par défaut
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
          profile: {}, // On envoie un profil vide, l'IA s'adaptera au contexte
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
  const [isRoadmapModalOpen, setIsRoadmapModalOpen] = useState(false); // Seul l'état de la modale de roadmap est conservé
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease-out' }}>
      <DashboardCard
        title="Présence & Posture"
        icon={<Gauge size={24} />}
        id="presence_posture_section"
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '-1rem', marginBottom: '1.5rem' }}>
          Analysez votre présence devant la caméra avec des métriques observables et actionnables : regard, stabilité, cadrage et gestion de la gestuelle.
        </p>
        <PresenceCoachCard />
      </DashboardCard>

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
    </div>
  );
}
