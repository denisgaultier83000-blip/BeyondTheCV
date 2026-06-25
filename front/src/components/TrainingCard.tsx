import { Star, BrainCircuit, Users, Siren, Target, CheckCircle, MapPin, Zap, TrendingUp, Check, X, Award } from 'lucide-react';

// --- Définitions des types (à adapter selon votre API) ---

export interface Question {
  type: 'MES' | 'Classique';
  text: string;
  advice: string;
}

export interface MesAnalysis {
  diagnostic: string;
  human: string;
  action: string;
  follow_up: string;
}

export interface StarAnalysis {
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface Evaluation {
  score: number;
  strengths: string[];
  weaknesses: string[];
  mes_analysis?: MesAnalysis; // Présent si question.type === 'MES'
  star_analysis?: StarAnalysis; // Présent si question.type === 'Classique' (Optionnel, nécessite d'adapter le prompt AI)
  improved_answer: string;
}

// --- Sous-Composants UI ---

const Badge = ({ type }: { type: 'MES' | 'Classique' }) => {
  const isMes = type === 'MES';
  const bgColor = isMes ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800';
  const Icon = isMes ? BrainCircuit : Star;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${bgColor}`}>
      <Icon className="w-4 h-4 mr-1.5" />
      {isMes ? 'Mise en Situation (Diagnostic)' : 'Question Comportementale (STAR)'}
    </span>
  );
};

const CoachAdvice = ({ advice }: { advice: string }) => (
  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
    <p className="text-sm text-gray-700">
      <span className="font-semibold text-indigo-600">💡 Conseil du Coach :</span> {advice}
    </p>
  </div>
);

const MesEvaluationFeedback = ({ analysis }: { analysis: MesAnalysis }) => (
  <div className="mt-6">
    <h4 className="text-lg font-semibold text-gray-800 mb-4">Analyse de votre Raisonnement (Diagnostic)</h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center mb-2 text-red-600">
          <Siren className="w-5 h-5 mr-2" />
          <h5 className="font-semibold">1. Diagnostic</h5>
        </div>
        <p className="text-sm text-gray-600">{analysis.diagnostic}</p>
      </div>
      <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center mb-2 text-green-600">
          <Users className="w-5 h-5 mr-2" />
          <h5 className="font-semibold">2. Impact Humain</h5>
        </div>
        <p className="text-sm text-gray-600">{analysis.human}</p>
      </div>
      <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center mb-2 text-blue-600">
          <Target className="w-5 h-5 mr-2" />
          <h5 className="font-semibold">3. Plan d'Action</h5>
        </div>
        <p className="text-sm text-gray-600">{analysis.action}</p>
      </div>
      <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center mb-2 text-purple-600">
          <CheckCircle className="w-5 h-5 mr-2" />
          <h5 className="font-semibold">4. Suivi & Prévention</h5>
        </div>
        <p className="text-sm text-gray-600">{analysis.follow_up}</p>
      </div>
    </div>
  </div>
);

const StarEvaluationFeedback = ({ analysis }: { analysis: StarAnalysis }) => (
  <div className="mt-6">
    <h4 className="text-lg font-semibold text-gray-800 mb-4">Analyse de votre Expérience (Méthode STAR)</h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center mb-2 text-indigo-600">
          <MapPin className="w-5 h-5 mr-2" />
          <h5 className="font-semibold">1. Situation</h5>
        </div>
        <p className="text-sm text-gray-600">{analysis.situation}</p>
      </div>
      <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center mb-2 text-orange-600">
          <Target className="w-5 h-5 mr-2" />
          <h5 className="font-semibold">2. Tâche</h5>
        </div>
        <p className="text-sm text-gray-600">{analysis.task}</p>
      </div>
      <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center mb-2 text-yellow-500">
          <Zap className="w-5 h-5 mr-2" />
          <h5 className="font-semibold">3. Action</h5>
        </div>
        <p className="text-sm text-gray-600">{analysis.action}</p>
      </div>
      <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center mb-2 text-emerald-600">
          <TrendingUp className="w-5 h-5 mr-2" />
          <h5 className="font-semibold">4. Résultat</h5>
        </div>
        <p className="text-sm text-gray-600">{analysis.result}</p>
      </div>
    </div>
  </div>
);

const EvaluationSummary = ({ evaluation }: { evaluation: Evaluation }) => (
  <div className="mt-6 space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-5 bg-green-50 rounded-xl border border-green-100">
        <h5 className="font-semibold text-green-800 flex items-center mb-3">
          <Check className="w-5 h-5 mr-2" /> Points Forts
        </h5>
        <ul className="space-y-2">
          {evaluation.strengths.map((s, i) => (
            <li key={i} className="text-sm text-green-700 flex items-start"><span className="mr-2">•</span> {s}</li>
          ))}
        </ul>
      </div>
      <div className="p-5 bg-red-50 rounded-xl border border-red-100">
        <h5 className="font-semibold text-red-800 flex items-center mb-3">
          <X className="w-5 h-5 mr-2" /> Axes d'Amélioration
        </h5>
        <ul className="space-y-2">
          {evaluation.weaknesses.map((w, i) => (
            <li key={i} className="text-sm text-red-700 flex items-start"><span className="mr-2">•</span> {w}</li>
          ))}
        </ul>
      </div>
    </div>
    <div className="p-5 bg-blue-50 rounded-xl border border-blue-100">
      <h5 className="font-semibold text-blue-800 flex items-center mb-2">
        <Award className="w-5 h-5 mr-2" /> Réponse Améliorée (Suggestion)
      </h5>
      <p className="text-sm text-blue-900 italic leading-relaxed">"{evaluation.improved_answer}"</p>
    </div>
  </div>
);

/**
 * COMPOSANT PRINCIPAL : TrainingCard
 */
export const TrainingCard = ({ question, evaluation }: { question: Question, evaluation?: Evaluation }) => {
  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-4xl mx-auto">
      {/* --- PARTIE 1 : LA QUESTION --- */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-2">
        <h3 className="text-xl font-bold text-gray-900 leading-tight">{question.text}</h3>
        <Badge type={question.type} />
      </div>
      <CoachAdvice advice={question.advice} />

      {/* --- PARTIE 2 : L'ÉVALUATION --- */}
      {evaluation && (
        <div className="mt-8 pt-8 border-t border-gray-100">
          <div className="flex flex-col items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Bilan de votre réponse</h3>
            <p className={`mt-2 text-3xl font-extrabold ${evaluation.score >= 75 ? 'text-green-600' : evaluation.score >= 50 ? 'text-orange-500' : 'text-red-600'}`}>
              {evaluation.score} <span className="text-lg text-gray-400 font-medium">/ 100</span>
            </p>
          </div>

          {question.type === 'MES' && evaluation.mes_analysis && <MesEvaluationFeedback analysis={evaluation.mes_analysis} />}
          {question.type === 'Classique' && evaluation.star_analysis && <StarEvaluationFeedback analysis={evaluation.star_analysis} />}
          
          <EvaluationSummary evaluation={evaluation} />
        </div>
      )}
    </div>
  );
};