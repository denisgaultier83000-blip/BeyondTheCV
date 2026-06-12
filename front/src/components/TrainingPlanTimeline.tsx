import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Target, ChevronRight, CheckCircle2, Circle } from 'lucide-react';

export interface TrainingModule {
  day: string;
  module: string;
  duration_minutes: number;
  focus?: string;
}

interface Props {
  plan: TrainingModule[];
}

export const TrainingPlanTimeline: React.FC<Props> = ({ plan }) => {
  // Chargement des étapes terminées depuis le cache local
  const [checkedItems, setCheckedItems] = useState<number[]>(() => {
    const saved = localStorage.getItem("trainingPlanChecked");
    return saved ? JSON.parse(saved) : [];
  });

  // Sauvegarde à chaque modification
  useEffect(() => {
    localStorage.setItem("trainingPlanChecked", JSON.stringify(checkedItems));
  }, [checkedItems]);

  const toggleCheck = (idx: number) => {
    setCheckedItems(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  if (!plan || plan.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="mb-6 border-b pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F2650] flex items-center gap-2">
            <Target className="w-6 h-6 text-[#6DBEF7]" />
            Votre Plan d'Entraînement
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Généré sur-mesure en fonction de vos contraintes de temps et de la date de l'entretien.
          </p>
        </div>
      </div>

      <div className="relative border-l-2 border-[#6DBEF7] ml-3 space-y-6">
        {plan.map((step, index) => {
          const isChecked = checkedItems.includes(index);
          return (
          <div key={index} className="relative pl-6" style={{ opacity: isChecked ? 0.6 : 1, transition: 'opacity 0.3s' }}>
            {/* Point sur la timeline */}
            <div className={`absolute -left-[9px] top-[1.25rem] w-4 h-4 rounded-full border-2 transition-colors ${isChecked ? 'bg-[#10b981] border-[#10b981]' : 'bg-white border-[#1FA6A0]'}`}></div>
            
            <div 
              className={`rounded-lg p-4 transition-all border cursor-pointer ${isChecked ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100 hover:shadow-md'}`}
              onClick={() => toggleCheck(index)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-bold flex items-center gap-2 ${isChecked ? 'text-gray-400 line-through' : 'text-[#446285]'}`}>
                  {isChecked ? <CheckCircle2 className="w-4 h-4 text-[#10b981]" /> : <Circle className="w-4 h-4 text-gray-300" />}
                  <Calendar className="w-4 h-4 ml-1" />
                  {step.day}
                </span>
                <span className="text-xs font-medium bg-[#EBF5FF] text-[#0F2650] px-2 py-1 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {step.duration_minutes} min
                </span>
              </div>
              
              <p className={`text-sm font-medium flex items-start gap-2 ${isChecked ? 'text-gray-400' : 'text-[#0F2650]'}`}>
                <ChevronRight className="w-4 h-4 text-[#1FA6A0] shrink-0 mt-0.5" />
                {step.module}
              </p>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
};