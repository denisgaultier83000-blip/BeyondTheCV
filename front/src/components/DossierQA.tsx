import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MessageSquare, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import Questionnaire from './Questionnaire';

export const DossierQA: React.FC = () => {
  const { applicationData } = useOutletContext<any>();
  const { questionsResult } = applicationData?.data || {};
  
  const { t } = useTranslation();
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);

  const fetchHistory = async () => {
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/interview/history`);
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data.history || []);
      }
    } catch (e) {
      console.error("Erreur de récupération de l'historique", e);
    }
  };

  useEffect(() => {
    if (showHistory) fetchHistory();
  }, [showHistory]);

  const getQuestionsArray = (data: any): any[] => {
    if (!data) return [];
    let actualData = data.result !== undefined ? data.result : data;
    
    let depth = 0;
    while (typeof actualData === 'string' && depth < 7) {
        try {
            const match = actualData.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            actualData = JSON.parse(match ? match[1] : actualData);
            depth++;
        } catch(e) {
            break;
        }
    }
    
    if (Array.isArray(actualData)) return actualData;
    
    const payload = actualData.interview_questions_result || actualData.interview_questions || actualData;
    if (Array.isArray(payload)) return payload;
    
    if (payload?.interview_prep && typeof payload.interview_prep === 'object') {
      if (Array.isArray(payload.interview_prep)) return payload.interview_prep;
      const allQuestions: any[] = [];
      Object.values(payload.interview_prep).forEach(val => {
        if (Array.isArray(val)) allQuestions.push(...val);
      });
      if (allQuestions.length > 0) return allQuestions;
    }

    if (payload?.questions && Array.isArray(payload.questions)) return payload.questions;

    const extractQuestionsDeep = (obj: any): any[] => {
        if (!obj || typeof obj !== 'object') return [];
        let found: any[] = [];
        for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (Array.isArray(val)) {
                if (val.length > 0 && typeof val[0] === 'object' && val[0].question) {
                    found = found.concat(val);
                }
            } else if (typeof val === 'object' && val !== null) {
                found = found.concat(extractQuestionsDeep(val));
            }
        }
        return found;
    };

    const deepExtracted = extractQuestionsDeep(payload);
    if (deepExtracted.length > 0) return deepExtracted;
    return (Object.values(payload).find(v => Array.isArray(v)) as any[]) || [];
  };

  if (!questionsResult) return <div className="p-10 text-center text-slate-500">Le questionnaire n'est pas encore disponible.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-1">Module Entretien</p>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><MessageSquare size={28} className="text-blue-600" /> Questions d'Entretien</h1>
        </div>
        <button onClick={() => setShowHistory(!showHistory)} className="btn-secondary flex items-center gap-2 text-sm px-4 py-2">
          <History size={16} /> {showHistory ? "Masquer les archives" : "Archives de mes réponses"}
        </button>
      </div>

      {showHistory && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <h3 className="font-bold text-slate-800 mb-4">Historique de vos réponses</h3>
          {historyData.length === 0 ? <p className="text-slate-500">Aucune réponse enregistrée.</p> : (
            <div className="flex flex-col gap-4">
              {historyData.map((item, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-sm text-slate-500 mb-2">{new Date(item.created_at).toLocaleDateString()} - Score : {item.score}/100</div>
                  <div className="font-bold text-slate-800 mb-2">Q : {item.question}</div>
                  <div className="text-slate-600 italic mb-2">R : "{item.user_answer}"</div>
                  <div className="text-green-800 bg-green-100 p-3 rounded-lg text-sm">Feedback : {item.feedback?.improved_answer || "Bonne réponse."}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!showHistory && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-sm text-slate-500 mb-6 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
            * Légende : ★ (1-Facile) à ★★★★★ (5-Très Difficile)
          </div>
          {getQuestionsArray(questionsResult).length > 0 ? (
            <Questionnaire questions={getQuestionsArray(questionsResult)} hideHeader={true} />
          ) : (
            <div className="p-10 text-center text-slate-500">Les questions n'ont pas pu être formatées correctement.</div>
          )}
        </div>
      )}
    </div>
  );
};