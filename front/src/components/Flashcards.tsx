import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, CheckCircle2, Lightbulb, MessageSquare, Tag, Flame, Mic, MicOff } from 'lucide-react';

interface Question {
  category?: string;
  question: string;
  difficulty?: string;
  trap_type?: string;
  suggested_answer?: string;
  advice?: string;
}

export default function Flashcards({ questions }: { questions: Question[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mastered, setMastered] = useState<number[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const toggleRecording = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    if (recognitionRef.current) recognitionRef.current.stop();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur (Essayez sur Chrome).");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;

    let baselineAnswer = userAnswers[currentIndex] || "";

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      
      setUserAnswers(prev => ({ ...prev, [currentIndex]: baselineAnswer + (baselineAnswer && finalTranscript ? ' ' : '') + finalTranscript + interimTranscript }));
      
      if (finalTranscript) {
         baselineAnswer += (baselineAnswer ? ' ' : '') + finalTranscript;
      }
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    } catch (err) {
      setIsRecording(false);
    }
  };

  if (!questions || questions.length === 0) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Aucune question disponible.</div>;

  const currentQ = questions[currentIndex];
  const isCurrentMastered = mastered.includes(currentIndex);

  const handleNext = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % questions.length);
    }, 150);
  };

  const handlePrev = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + questions.length) % questions.length);
    }, 150);
  };

  const toggleMastered = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrentMastered) {
      setMastered(prev => prev.filter(i => i !== currentIndex));
    } else {
      setMastered(prev => [...prev, currentIndex]);
    }
  };

  const progress = Math.round((mastered.length / questions.length) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* En-tête & Barre de progression */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Question {currentIndex + 1} / {questions.length}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>
            Maîtrise : {progress}%
          </div>
          <div style={{ width: '120px', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: '#10b981', transition: 'width 0.4s ease-out' }} />
          </div>
        </div>
      </div>

      {/* Conteneur de la carte (Perspective 3D) */}
      <div 
        style={{ perspective: '1000px', width: '100%', height: '420px', marginBottom: '2rem' }}
      >
        <div style={{
          width: '100%', height: '100%', position: 'relative',
          transition: 'transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)',
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}>
          
          {/* RECTO : La Question */}
          <div style={{
            position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
            background: 'var(--bg-card)', borderRadius: '1rem', border: '2px solid var(--border-color)',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', padding: '2rem', display: 'flex', flexDirection: 'column',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between', marginBottom: '1.5rem', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {currentQ.category && (
                  <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '0.4rem 1rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Tag size={14} /> {currentQ.category}
                  </span>
                )}
                {currentQ.trap_type && (
                  <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.4rem 1rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Flame size={14} /> {currentQ.trap_type}
                  </span>
                )}
              </div>
              {currentQ.difficulty && <div style={{ fontSize: '1.2rem', letterSpacing: '0.1em' }} title="Niveau de difficulté">{currentQ.difficulty}</div>}
            </div>
            
            <h3 style={{ fontSize: '1.4rem', color: 'var(--text-main)', lineHeight: 1.5, margin: '0 0 1.5rem 0', fontWeight: 700 }}>
              "{currentQ.question}"
            </h3>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem', width: '100%' }}>
              {userAnswers[currentIndex] ? (
                <div style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)', maxHeight: '80px', overflowY: 'auto', border: '1px solid var(--border-color)', textAlign: 'left' }}>
                  {userAnswers[currentIndex]}
                </div>
              ) : (
                 <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                   Entraînez-vous à répondre à l'oral avant de voir la solution.
                 </div>
              )}
              
              <button 
                onClick={toggleRecording}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', borderRadius: '2rem', border: 'none', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', background: isRecording ? '#ef4444' : 'rgba(59, 130, 246, 0.1)', color: isRecording ? 'white' : 'var(--primary)', boxShadow: isRecording ? '0 0 0 4px rgba(239, 68, 68, 0.2)' : 'none' }}
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                {isRecording ? "Arrêter l'enregistrement" : "Répondre à la voix"}
              </button>
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
              style={{ width: '100%', background: 'var(--primary)', color: 'white', border: 'none', padding: '1rem', borderRadius: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
            >
              <RotateCcw size={18} /> Voir la réponse suggérée
            </button>
          </div>

          {/* VERSO : La Réponse & le Conseil */}
          <div style={{
            position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
            background: 'var(--bg-secondary)', borderRadius: '1rem', border: '2px solid var(--primary)',
            boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.15)', padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column',
            transform: 'rotateY(180deg)', overflowY: 'auto'
          }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
              <MessageSquare size={18} /> Piste de Réponse (Méthode STAR)
            </h4>
            <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-main)', lineHeight: 1.6, fontSize: '1rem' }}>{currentQ.suggested_answer}</p>

            {currentQ.advice && (
              <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(34, 197, 94, 0.2)', marginTop: 'auto' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}><Lightbulb size={16} /> L'oeil du recruteur</h4>
                <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.5, fontSize: '0.95rem' }}>{currentQ.advice}</p>
              </div>
            )}

            <button 
              onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
              className="btn-secondary"
              style={{ width: '100%', padding: '1rem', borderRadius: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '1.5rem', flexShrink: 0 }}
            >
              <RotateCcw size={18} /> Retour à la question
            </button>
          </div>
        </div>
      </div>

      {/* Contrôles (Boutons Précédent, Maîtrise, Suivant) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: '100%', justifyContent: 'center' }}>
        <button onClick={handlePrev} className="btn-secondary" style={{ width: '54px', height: '54px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Question précédente">
          <ChevronLeft size={28} />
        </button>

        <button 
          onClick={toggleMastered}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 2.5rem', borderRadius: '3rem', fontSize: '1.05rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            background: isCurrentMastered ? '#10b981' : 'var(--bg-card)',
            color: isCurrentMastered ? 'white' : 'var(--text-main)',
            border: `2px solid ${isCurrentMastered ? '#10b981' : 'var(--border-color)'}`,
            boxShadow: isCurrentMastered ? '0 10px 20px -5px rgba(16, 185, 129, 0.3)' : '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}
        >
          <CheckCircle2 size={22} /> {isCurrentMastered ? "Question maîtrisée" : "Marquer comme maîtrisée"}
        </button>

        <button onClick={handleNext} className="btn-secondary" style={{ width: '54px', height: '54px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Question suivante">
          <ChevronRight size={28} />
        </button>
      </div>
    </div>
  );
}