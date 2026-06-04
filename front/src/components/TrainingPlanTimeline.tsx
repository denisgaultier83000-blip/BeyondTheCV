import React from 'react';
import { Calendar, Clock, Target, ChevronRight } from 'lucide-react';

export interface TrainingModule {
  day: string;
  module: string;
  duration_minutes: number;
}

interface Props {
  plan: TrainingModule[];
}

export const TrainingPlanTimeline: React.FC<Props> = ({ plan }) => {
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
        {plan.map((step, index) => (
          <div key={index} className="relative pl-6">
            {/* Point sur la timeline */}
            <div className="absolute -left-[9px] top-1 w-4 h-4 bg-white border-2 border-[#1FA6A0] rounded-full"></div>
            
            <div className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[#446285] flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {step.day}
                </span>
                <span className="text-xs font-medium bg-[#EBF5FF] text-[#0F2650] px-2 py-1 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {step.duration_minutes} min
                </span>
              </div>
              
              <p className="text-sm text-[#0F2650] font-medium flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-[#1FA6A0] shrink-0 mt-0.5" />
                {step.module}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};