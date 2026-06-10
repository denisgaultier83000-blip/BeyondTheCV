import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Monitor, UserCheck, Clock, HeartPulse, Award, Compass, DollarSign, MessageCircle } from 'lucide-react';

export interface InterviewContextData {
  interview_date: string;
  interview_format: string;
  interview_type: string;
  available_time: string;
  stress_level: string;
  seniority_level: string;
  current_situation: string;
  salary_expectations: string;
  coaching_style: string;
}

interface Props {
  data: Partial<InterviewContextData>;
  onChange: (data: Partial<InterviewContextData>) => void;
  errors?: Record<string, boolean>;
}

export const InterviewContextForm: React.FC<Props> = ({ data, onChange, errors }) => {
  const { t } = useTranslation();

  const handleChange = (field: keyof InterviewContextData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="mb-6 border-b pb-4">
        <h2 className="text-xl font-bold text-[#0F2650]">
          {t('interview_context_title')}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Ces informations permettront à l'IA de générer un plan d'entraînement sur-mesure.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Date de l'entretien */}
        <div className="col-span-1 md:col-span-3">
          <label className="flex items-center gap-2 text-sm font-medium text-[#446285] mb-2">
            <Calendar className="w-4 h-4" />
            {t('interview_date')}
          </label>
          <input
            type="text"
            placeholder={t('interview_date_placeholder')}
            value={data.interview_date || ''}
            onChange={(e) => handleChange('interview_date', e.target.value)}
            className={`w-full border rounded-lg p-3 outline-none transition-all ${
              errors?.interview_date 
                ? 'border-[#ef4444] focus:ring-2 focus:ring-[#ef4444]' 
                : 'border-gray-300 focus:ring-2 focus:ring-[#6DBEF7] focus:border-[#6DBEF7]'
            }`}
          />
          {errors?.interview_date && (
            <p style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: "0.5rem", marginBottom: 0 }}>
              Veuillez renseigner une date ou indiquer "Je ne sais pas".
            </p>
          )}
        </div>

        {/* Format de l'entretien */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#446285] mb-2">
            <Monitor className="w-4 h-4" />
            {t('interview_format')}
          </label>
          <select
            value={data.interview_format || ''}
            onChange={(e) => handleChange('interview_format', e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#6DBEF7] focus:border-[#6DBEF7] outline-none bg-white transition-all"
          >
            <option value="" disabled>{t('select')}</option>
            <option value="visio">{t('format_visio')}</option>
            <option value="phone">{t('format_phone')}</option>
            <option value="onsite">{t('format_onsite')}</option>
          </select>
        </div>

        {/* Niveau du poste / Séniorité */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#446285] mb-2">
            <Award className="w-4 h-4" />
            Niveau d'expérience visé
          </label>
          <select
            value={data.seniority_level || ''}
            onChange={(e) => handleChange('seniority_level', e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#6DBEF7] focus:border-[#6DBEF7] outline-none bg-white transition-all"
          >
            <option value="" disabled>{t('select')}</option>
            <option value="junior">Junior / Débutant</option>
            <option value="mid">Confirmé (Mid-level)</option>
            <option value="senior">Senior / Expert</option>
            <option value="manager">Manager / Lead</option>
            <option value="director">Direction (C-Level)</option>
          </select>
        </div>

        {/* Type d'interlocuteur */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#446285] mb-2">
            <UserCheck className="w-4 h-4" />
            {t('interview_type')}
          </label>
          <select
            value={data.interview_type || ''}
            onChange={(e) => handleChange('interview_type', e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#6DBEF7] focus:border-[#6DBEF7] outline-none bg-white transition-all"
          >
            <option value="" disabled>{t('select')}</option>
            <option value="rh">{t('type_rh')}</option>
            <option value="manager">{t('type_manager')}</option>
            <option value="tech">{t('type_tech')}</option>
            <option value="final">{t('type_final')}</option>
          </select>
        </div>

        {/* Situation actuelle / Profil atypique */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#446285] mb-2">
            <Compass className="w-4 h-4" />
            Situation actuelle
          </label>
          <select
            value={data.current_situation || ''}
            onChange={(e) => handleChange('current_situation', e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#6DBEF7] focus:border-[#6DBEF7] outline-none bg-white transition-all"
          >
            <option value="" disabled>{t('select')}</option>
            <option value="employed">En poste (Écoute active)</option>
            <option value="job_seeker">En recherche active</option>
            <option value="career_change">Reconversion professionnelle</option>
            <option value="military_transition">Transition Militaire / Public</option>
            <option value="student">Étudiant / Jeune Diplômé</option>
          </select>
        </div>

        {/* Temps disponible */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#446285] mb-2">
            <Clock className="w-4 h-4" />
            {t('available_time')}
          </label>
          <select
            value={data.available_time || ''}
            onChange={(e) => handleChange('available_time', e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#6DBEF7] focus:border-[#6DBEF7] outline-none bg-white transition-all"
          >
            <option value="" disabled>{t('select')}</option>
            <option value="10m">{t('time_10m')}</option>
            <option value="20m">{t('time_20m')}</option>
            <option value="45m">{t('time_45m')}</option>
          </select>
        </div>

        {/* Style de coaching */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#446285] mb-2">
            <MessageCircle className="w-4 h-4" />
            Style de Coaching IA
          </label>
          <select
            value={data.coaching_style || ''}
            onChange={(e) => handleChange('coaching_style', e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#6DBEF7] focus:border-[#6DBEF7] outline-none bg-white transition-all"
          >
            <option value="" disabled>{t('select')}</option>
            <option value="supportive">Bienveillant & Rassurant</option>
            <option value="demanding">Exigeant & Direct</option>
            <option value="commando">Commando (Sans filtre, intense)</option>
          </select>
        </div>

        {/* Niveau de stress */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#446285] mb-2">
            <HeartPulse className="w-4 h-4" />
            {t('stress_level')}
          </label>
          <select
            value={data.stress_level || ''}
            onChange={(e) => handleChange('stress_level', e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#6DBEF7] focus:border-[#6DBEF7] outline-none bg-white transition-all"
          >
            <option value="" disabled>{t('select')}</option>
            <option value="low">{t('stress_low')}</option>
            <option value="medium">{t('stress_medium')}</option>
            <option value="high">{t('stress_high')}</option>
          </select>
        </div>

        {/* Salaire visé */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#446285] mb-2">
            <DollarSign className="w-4 h-4" />
            Prétentions Salariales
          </label>
          <input
            type="text"
            placeholder="Ex: 45k€, Négociable..."
            value={data.salary_expectations || ''}
            onChange={(e) => handleChange('salary_expectations', e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#6DBEF7] focus:border-[#6DBEF7] outline-none bg-white transition-all"
          />
        </div>
      </div>
    </div>
  );
};