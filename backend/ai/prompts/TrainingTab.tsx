import React, { useState } from 'react';
import { 
  Mic, 
  Send, 
  Activity, 
  Target, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Settings2
} from 'lucide-react';

export default function TrainingTab() {
  const [score, setScore] = useState(68);
  const [selectedTheme, setSelectedTheme] = useState('Gestion de crise');
  const [selectedType, setSelectedType] = useState('MES');
  const [isGenerating, setIsGenerating] = useState(false);
  const [question, setQuestion] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);

  const themes = ['Management', 'Gestion de crise', 'Négociation', 'Leadership', 'Communication'];
  const types = [{ id: 'Classique', label: 'Questions Classiques' }, { id: 'MES', label: 'Mises en Situation' }];

  const handleGenerate = () => {
    setIsGenerating(true);
    setFeedback(null);
    setAnswer('');
    // Simulation d'appel API
    setTimeout(() => {
      setQuestion({
        text: "Mise en situation : Votre équipe technique vient de déployer une mise à jour qui a fait crasher le système principal d'un client majeur. Le client menace de rompre le contrat. Comment réagissez-vous dans les 15 premières minutes ?",
        advice: "Le recruteur évalue votre capacité à prioriser (communication vs technique) et votre sang-froid."
      });
      setIsGenerating(false);
    }, 1500);
  };

  const handleSubmit = () => {
    if (!answer.trim()) return;
    setIsEvaluating(true);
    // Simulation d'appel API d'évaluation
    setTimeout(() => {
      setFeedback({
        score: 75,
        strengths: ["Bonne prise d'initiative", "Réponse orientée client"],
        weaknesses: ["Manque de détails sur la coordination avec l'équipe technique", "Oubli d'informer la direction interne"],
        improved_answer: "Dans les 15 premières minutes, mon action immédiate est double. Premièrement, j'appelle personnellement le client pour accuser réception de la crise... Ensuite, je rassemble une cellule de crise avec le lead tech..."
      });
      setScore(Math.min(100, Math.round((score * 2 + 75) / 3))); // Simulation moyenne pondérée
      setIsEvaluating(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      
      {/* En-tête et Score */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0F2650] flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#6DBEF7]" />
            Simulateur d'Entretien
          </h2>
          <p className="text-slate-500 mt-1">Générez des questions sur-mesure et améliorez votre répartie.</p>
        </div>
        
        {/* Jauge de Score Circulaire */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Score Global</p>
            <p className="text-sm text-slate-400">Moyenne pondérée</p>
          </div>
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`${score >= 75 ? 'text-green-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}
                strokeDasharray={`${score}, 100`}
                strokeWidth="3"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-[#0F2650]">
              <span className="text-xl font-bold">{score}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panneau de Configuration */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 space-y-3 w-full">
            <label className="text-sm font-semibold text-[#0F2650] flex items-center gap-2">
              <Target className="w-4 h-4" /> Thème de l'entraînement
            </label>
            <div className="flex flex-wrap gap-2">
              {themes.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTheme(t)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedTheme === t 
                      ? 'bg-[#0F2650] text-white' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-[#6DBEF7]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-3 w-full">
            <label className="text-sm font-semibold text-[#0F2650] flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> Type de question
            </label>
            <div className="flex gap-2">
              {types.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedType === t.id 
                      ? 'bg-[#446285] text-white' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-[#6DBEF7]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-[#6DBEF7] hover:bg-blue-400 text-[#0F2650] font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            Générer
          </button>
        </div>
      </div>

      {/* Zone d'interaction (Question & Réponse) */}
      {question && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-[#F7FAFC]">
            <div className="flex items-start gap-4">
              <div className="bg-[#446285] p-3 rounded-lg text-white mt-1">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0F2650]">{question.text}</h3>
                <p className="text-sm text-slate-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Objectif du recruteur : {question.advice}
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-white space-y-4">
            <textarea 
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Rédigez votre réponse ici ou utilisez la dictée vocale de votre appareil..."
              className="w-full h-32 p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6DBEF7] focus:border-transparent outline-none resize-none"
            />
            <div className="flex justify-between items-center">
              <button className="flex items-center gap-2 text-slate-500 hover:text-[#0F2650] transition-colors px-4 py-2 rounded-lg hover:bg-slate-50 border border-transparent">
                <Mic className="w-5 h-5" />
                Activer la dictée vocale
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isEvaluating || !answer.trim()}
                className="bg-[#0F2650] hover:bg-[#446285] text-white font-medium py-2 px-6 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isEvaluating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Soumettre & Évaluer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback IA */}
      {feedback && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="col-span-1 space-y-6">
            {/* Score de la réponse */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 border-4 border-[#6DBEF7] text-[#0F2650] text-2xl font-bold mb-3">
                {feedback.score}
              </div>
              <h4 className="font-bold text-slate-700">Score de la réponse</h4>
            </div>
            
            {/* Forces et Faiblesses */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
              <div>
                <h4 className="font-semibold text-green-600 flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4"/> Points forts</h4>
                <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                  {feedback.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-semibold text-red-500 flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4"/> À améliorer</h4>
                <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                  {feedback.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {/* Réponse Idéale */}
          <div className="col-span-2 bg-[#0F2650] rounded-xl p-6 text-white shadow-lg">
            <h4 className="font-bold flex items-center gap-2 mb-4 text-[#6DBEF7]">
              <Award className="w-5 h-5" /> Réponse idéale suggérée
            </h4>
            <p className="text-slate-200 leading-relaxed whitespace-pre-line">
              {feedback.improved_answer}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}