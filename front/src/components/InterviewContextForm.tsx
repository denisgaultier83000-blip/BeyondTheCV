import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Monitor, UserCheck, Clock, HeartPulse } from 'lucide-react';

export interface InterviewContextData {
  interview_date: string;
  interview_format: string;
  interview_type: string;
  available_time: string;
  stress_level: string;
}

interface Props {
  data: Partial<InterviewContextData>;
  onChange: (data: Partial<InterviewContextData>) => void;
}

export const InterviewContextForm: React.FC<Props> = ({ data, onChange }) => {
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Date de l'entretien */}
        <div className="col-span-1 md:col-span-2">
          <label className="flex items-center gap-2 text-sm font-medium text-[#446285] mb-2">
            <Calendar className="w-4 h-4" />
            {t('interview_date')}
          </label>
          <input
            type="text"
            placeholder={t('interview_date_placeholder')}
            value={data.interview_date || ''}
            onChange={(e) => handleChange('interview_date', e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#6DBEF7] focus:border-[#6DBEF7] outline-none transition-all"
          />
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
      </div>
    </div>
  );
};