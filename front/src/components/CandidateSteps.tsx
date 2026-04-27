// c:\BeyondTheCV\front\src\components\CandidateSteps.tsx
import React, { useState, useRef, useEffect } from "react";
import ScoreGauge from "./ScoreGauge";
import { useTranslation } from "react-i18next";
import { 
  Camera, Loader2, Sparkles, User, Briefcase, GraduationCap, Circle, CheckCircle2, Plus, Trash2, Target, Gem, RefreshCw, HelpCircle, Linkedin, UploadCloud, FileText
} from 'lucide-react';
import RadarChart from './RadarChart'; // Import the new component
import { API_BASE_URL } from "../config";
import { authenticatedFetch } from "../utils/auth";

interface StepProps {
  data: any;
  onChange: (key: string, value: any) => void;
  errors?: Record<string, boolean>;
  loading?: boolean;
  lang?: string; // [NEW] Prop pour la langue
}

interface ListStepProps {
  list: any[];
  onAdd: () => void;
  onRemove: (id: number) => void;
  onUpdate: (id: number, field: string, value: any) => void;
  lang?: string; // [NEW] Prop pour la langue
  onOptimize?: (id: number, item: any) => void;
}

const COUNTRIES = [
  { code: "FR", name: "France" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "CA", name: "Canada" },
  { code: "CH", name: "Switzerland" },
  { code: "BE", name: "Belgium" },
  { code: "AU", name: "Australia" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "AE", name: "United Arab Emirates" }
];

export const StepImport = ({ onUpload, loading, lang = 'en' }: { onUpload?: (file: File) => void, loading?: boolean, lang?: string }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onUpload) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="step-content">
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <Linkedin size={48} color="#0a66c2" style={{ marginBottom: "1rem" }} />
        <h2>{t('import_linkedin_title', 'Importez votre profil LinkedIn')}</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "1rem", maxWidth: "600px", margin: "0 auto" }}>
          {t('import_linkedin_desc', 'Pour garantir une analyse parfaite de votre profil, nous utilisons exclusivement le format standard de LinkedIn. Téléchargez votre profil en 3 clics.')}
        </p>
      </div>

      <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", marginBottom: "2rem" }}>
        <div style={{ background: "var(--bg-secondary)", padding: "1rem 1.5rem", borderRadius: "0.5rem", flex: 1, maxWidth: "250px", textAlign: "center" }}>
          <div style={{ fontWeight: "bold", color: "var(--primary)", marginBottom: "0.5rem" }}>{t('step_1', 'Étape 1')}</div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>{t('import_step1_desc', 'Allez sur votre profil LinkedIn.')}</div>
        </div>
        <div style={{ background: "var(--bg-secondary)", padding: "1rem 1.5rem", borderRadius: "0.5rem", flex: 1, maxWidth: "250px", textAlign: "center" }}>
          <div style={{ fontWeight: "bold", color: "var(--primary)", marginBottom: "0.5rem" }}>{t('step_2', 'Étape 2')}</div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>{t('import_step2_desc', 'Cliquez sur le bouton')} <b>{t('import_btn_more', '"Plus"')}</b>.</div>
        </div>
        <div style={{ background: "var(--bg-secondary)", padding: "1rem 1.5rem", borderRadius: "0.5rem", flex: 1, maxWidth: "250px", textAlign: "center" }}>
          <div style={{ fontWeight: "bold", color: "var(--primary)", marginBottom: "0.5rem" }}>{t('step_3', 'Étape 3')}</div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>{t('import_step3_desc', 'Choisissez')} <b>{t('import_btn_pdf', '"Enregistrer au format PDF"')}</b>.</div>
        </div>
      </div>

      <div onClick={() => !loading && fileInputRef.current?.click()} style={{ border: "2px dashed #0a66c2", background: "rgba(10, 102, 194, 0.05)", padding: "3rem", textAlign: "center", borderRadius: "1rem", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" style={{ display: "none" }} />
        {loading ? <Loader2 size={32} className="spin" color="#0a66c2" /> : <UploadCloud size={32} color="#0a66c2" />}
        <h3 style={{ marginTop: "1rem", color: "#0a66c2" }}>{loading ? t('analysis_in_progress', "Analyse en cours...") : t('import_upload_btn', "Cliquez ici pour charger votre PDF LinkedIn")}</h3>
        <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.9rem" }}>{t('import_format_accepted', "Format accepté : .pdf uniquement")}</p>
      </div>
    </div>
  );
};

export const StepProfile = ({ data, onChange, errors, lang = 'en' }: StepProps) => {
  const { t } = useTranslation();

  // Formate le prénom : "jean-pierre" devient "Jean-Pierre"
  const formatFirstName = (val: string) => {
    if (!val) return "";
    return val.replace(/(?:^|[\s-])\S/g, (match) => match.toUpperCase());
  };

  // Formate le nom : "dupont" devient "DUPONT" (Standard CV)
  const formatLastName = (val: string) => {
    if (!val) return "";
    return val.toUpperCase();
  };

  return (
  <div className="step-content">
    <h2>{t('profile_title')}</h2>

    <div className="row">
      <div className="col form-group">
        <label>{t('first_name')}</label>
        <input value={data.first_name || ""} onChange={e => onChange("first_name", formatFirstName(e.target.value))} placeholder={t('placeholder_firstname')} style={{ width: "100%", borderColor: errors?.first_name ? "#ef4444" : undefined }} />
      </div>
      <div className="col form-group">
        <label>{t('last_name')}</label>
        <input value={data.last_name || ""} onChange={e => onChange("last_name", formatLastName(e.target.value))} placeholder={t('placeholder_lastname')} style={{ width: "100%", borderColor: errors?.last_name ? "#ef4444" : undefined }} />
      </div>
    </div>
    <div className="row">
      <div className="col form-group">
        <label>{t('email')}</label>
        <input type="email" value={data.email || ""} onChange={e => onChange("email", e.target.value)} placeholder={t('placeholder_email')} style={{ width: "100%", borderColor: errors?.email ? "#ef4444" : undefined }} />
      </div>
      <div className="col form-group">
        <label>{t('phone')}</label>
        <input type="tel" value={data.phone || ""} onChange={e => onChange("phone", e.target.value)} placeholder={t('placeholder_phone')} style={{ width: "100%" }} />
      </div>
    </div>
    <div className="form-group">
      <label>{t('linkedin')}</label>
      <input value={data.linkedin || ""} onChange={e => onChange("linkedin", e.target.value)} placeholder={t('placeholder_linkedin')} style={{ width: "100%" }} />
    </div>
    <div className="row">
      <div className="col form-group">
        <label>{t('residence_country')}</label>
        <div style={{ display: "flex", gap: "10px" }}>
            <select 
                value={COUNTRIES.some(c => c.code === data.residence_country) ? data.residence_country : (data.residence_country ? "OTHER" : "")} 
                onChange={e => onChange("residence_country", e.target.value)} 
                style={{ flex: 1 }}
            >
                <option value="">{t('select_country')}</option>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                <option value="OTHER">{t('other')}</option>
            </select>
            {(data.residence_country === "OTHER" || (data.residence_country && !COUNTRIES.some(c => c.code === data.residence_country))) && (
                <input 
                    placeholder={t('placeholder_iso2')} 
                    value={data.residence_country === "OTHER" ? "" : data.residence_country} 
                    onChange={e => onChange("residence_country", e.target.value.toUpperCase())} 
                    maxLength={2}
                    style={{ width: "80px" }} 
                />
            )}
        </div>
      </div>
      <div className="col form-group">
        <label>{t('city')}</label>
        <input value={data.city || ""} onChange={e => onChange("city", e.target.value)} placeholder={t('placeholder_city')} style={{ width: "100%" }} />
      </div>
    </div>
  </div>
  );
};

export const StepTarget = ({ data, onChange, errors, loading, lang = 'en' }: StepProps) => {
  // Extraction de i18n et t sans doublon (correction du crash React)
  const { t, i18n } = useTranslation();
  return (
  <div className="step-content">
    <h2>{t('target_title')}</h2>
    {loading && (
        <div style={{ marginBottom: 15, padding: 10, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--primary)", fontSize: "0.9em", display: "flex", alignItems: "center", gap: 8 }}>
            <Loader2 size={16} className="spin" /> {t('analysis_progress')}
        </div>
    )}
    <div className="row">
      <div className="col form-group">
        <label>{t('target_role')}</label>
        <input 
            disabled={loading} 
            value={data.target_job || data.target_role_primary || ""} 
            onChange={e => { onChange("target_job", e.target.value); onChange("target_role_primary", e.target.value); }} 
            placeholder={t('placeholder_target_role')} 
            style={{ width: "100%", borderColor: errors?.target_job ? "#ef4444" : undefined, opacity: loading ? 0.6 : 1 }} 
        />
      </div>
      <div className="col form-group">
        <label>{t('contract_type')}</label>
        <select disabled={loading} value={data.contract_type || ""} onChange={e => onChange("contract_type", e.target.value)} style={{ width: "100%", opacity: loading ? 0.6 : 1 }}>
          <option value="">{t('select')}</option>
          <option value="CDI">{t('full_time')}</option>
          <option value="Freelance">{t('freelance')}</option>
          <option value="CDD">{t('fixed_term')}</option>
        </select>
      </div>
    </div>
    <div className="row">
      <div className="col form-group">
        <label>{t('target_company')} <span style={{ fontWeight: 'normal', fontSize: '0.85em', color: 'var(--text-muted)' }}>(Optionnel)</span></label>
        <input disabled={loading} value={data.target_company || ""} onChange={e => onChange("target_company", e.target.value)} placeholder={t('placeholder_target_company')} style={{ width: "100%", opacity: loading ? 0.6 : 1 }} />
      </div>
      <div className="col form-group">
        <label>{t('target_industry')}</label>
        <input disabled={loading} value={data.target_industry || ""} onChange={e => onChange("target_industry", e.target.value)} placeholder={t('placeholder_target_industry')} style={{ width: "100%", opacity: loading ? 0.6 : 1 }} />
      </div>
    </div>
    <div className="form-group">
      <label>{t('job_desc_label')}</label>
      <textarea disabled={loading} rows={6} value={data.job_description || ""} onChange={e => onChange("job_description", e.target.value)} placeholder={t('job_desc_placeholder')} style={{ width: "100%", opacity: loading ? 0.6 : 1 }} />
    </div>

    {/* [NOUVEAU] Champ explicite pour la langue cible du CV */}
    <div className="row" style={{ marginTop: 20 }}>
      <div className="col form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{t('target_language_label', "Langue de rédaction de l'IA (CV, Pitch, Analyses)")}</label>
        <select 
          disabled={loading} 
          value={data.target_language || i18n.resolvedLanguage?.substring(0, 2) || "fr"} 
          onChange={e => onChange("target_language", e.target.value)} 
          style={{ width: "100%", opacity: loading ? 0.6 : 1, border: "1px solid var(--primary)", background: "var(--bg-card)", color: "var(--text-main)" }}
        >
          <option value="fr">Français 🇫🇷</option>
          <option value="en">English 🇬🇧</option>
        </select>
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px", marginBottom: 0 }}>
          {t('target_language_hint', "L'IA générera tous vos documents dans cette langue.")}
        </p>
      </div>
    </div>

    {/* Section Mobilité intégrée */}
    <h3 style={{ marginTop: 20, fontSize: "1.1rem", color: "var(--text-main)" }}>{t('mobility_title')}</h3>
    <div className="row">
      <div className="col form-group">
        <label>{t('target_country_label')}</label>
        <div style={{ display: "flex", gap: "10px" }}>
            <select 
                value={COUNTRIES.some(c => c.code === data.target_country) ? data.target_country : (data.target_country ? "OTHER" : "")} 
                onChange={e => onChange("target_country", e.target.value)} 
                style={{ flex: 1 }}
            >
                  <option value="">{t('select_target_country')}</option>
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                  <option value="OTHER">{t('other')}</option>
            </select>
            {(data.target_country === "OTHER" || (data.target_country && !COUNTRIES.some(c => c.code === data.target_country))) && (
                <input 
                    placeholder={t('placeholder_iso2')} 
                    value={data.target_country === "OTHER" ? "" : data.target_country} 
                    onChange={e => onChange("target_country", e.target.value.toUpperCase())} 
                    maxLength={2}
                    style={{ width: "80px" }} 
                />
            )}
        </div>
      </div>
      <div className="col form-group">
        <label>{t('remote_pref')}</label>
        <select value={data.remote_preference} onChange={e => onChange("remote_preference", e.target.value)} style={{ width: "100%" }}>
          <option value="">{t('select')}</option>
          <option value="full">{t('full_remote')}</option>
          <option value="hybrid">{t('hybrid')}</option>
          <option value="onsite">{t('onsite')}</option>
        </select>
      </div>
    </div>
    
    <div className="form-group" style={{ marginTop: 15 }}>
      <label>{t('availability_label', 'Disponibilité')}</label>
      <select 
        disabled={loading} 
        value={['immediate', '1_month', '3_months'].includes(data.availability) ? data.availability : (data.availability ? 'Autre' : '')} 
        onChange={(e) => onChange("availability", e.target.value)} 
        style={{ width: "100%", opacity: loading ? 0.6 : 1 }}
      >
        <option value="">{t('select', 'Sélectionnez...')}</option>
        <option value="immediate">{t('availability_immediate', 'Immédiate')}</option>
        <option value="1_month">{t('availability_1_month', '1 mois (Préavis)')}</option>
        <option value="3_months">{t('availability_3_months', '3 mois (Préavis)')}</option>
        <option value="Autre">{t('availability_other', 'Autre (Préciser)...')}</option>
      </select>

      {(!['immediate', '1_month', '3_months', ''].includes(data.availability || '') || data.availability === "Autre") && (
        <input 
          type="text" 
          placeholder={t('availability_custom_placeholder', 'Précisez (ex: Dans 5 mois, Mi-Septembre)...')} 
          value={data.availability === "Autre" ? "" : data.availability} 
          onChange={(e) => onChange("availability", e.target.value)} 
          className="form-control"
          style={{ width: "100%", marginTop: '0.5rem' }}
          autoFocus
        />
      )}
    </div>
  </div>
  );
};

export const StepEducation = ({ list, onAdd, onRemove, onUpdate, lang = 'en' }: ListStepProps) => {
  const { t } = useTranslation();
  return (
  <div className="step-content">
    <h2>{t('education_title')}</h2>
    {list.map((edu: any, index: number) => (
      <div key={edu.id} className="dynamic-item">
        <div className="dynamic-header">
          <label>{t('diploma')} {index + 1}</label>
          {list.length > 1 && <button type="button" onClick={() => onRemove(edu.id)} className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Trash2 size={14} /> {t('remove')}</button>}
        </div>
        <div className="form-group">
          <input placeholder={t('degree')} value={edu.degree || ""} onChange={e => onUpdate(edu.id, "degree", e.target.value)} style={{ marginBottom: 8, width: "100%" }} />
          <input placeholder={t('school')} value={edu.school || ""} onChange={e => onUpdate(edu.id, "school", e.target.value)} style={{ marginBottom: 8, width: "100%" }} />
          <input placeholder={t('year')} value={edu.year || ""} onChange={e => onUpdate(edu.id, "year", e.target.value)} style={{ width: "100%" }} />
        </div>
      </div>
    ))}
    <button type="button" onClick={onAdd} className="btn-secondary dashed" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Plus size={16} /> {t('add_education')}</button>
  </div>
  );
};

export const StepExperience = ({ list, onAdd, onRemove, onUpdate, lang = 'en', onOptimize }: ListStepProps) => {
  const { t } = useTranslation();
  return (
  <div className="step-content">
    <h2>{t('experience_title')}</h2>
    {list.map((exp: any, index: number) => (
      <div key={exp.id} className="dynamic-item">
        <div className="dynamic-header">
          <label>{t('experience')} {index + 1}</label>
          {list.length > 1 && <button type="button" onClick={() => onRemove(exp.id)} className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Trash2 size={14} /> {t('remove')}</button>}
        </div>
        <div className="form-group">
          <input placeholder={t('role')} value={exp.role || ""} onChange={e => onUpdate(exp.id, "role", e.target.value)} style={{ marginBottom: 8, width: "100%" }} />
          <input placeholder={t('company')} value={exp.company || ""} onChange={e => onUpdate(exp.id, "company", e.target.value)} style={{ marginBottom: 8, width: "100%" }} />
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <input placeholder={t('start_date')} value={exp.start_date || ""} onChange={e => onUpdate(exp.id, "start_date", e.target.value)} style={{ width: "100%" }} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "5px" }}>
              <input 
                placeholder={t('end_date')} 
                value={exp.end_date || ""} 
                onChange={e => onUpdate(exp.id, "end_date", e.target.value)} 
                disabled={exp.end_date === "Aujourd'hui"}
                style={{ width: "100%", opacity: exp.end_date === "Aujourd'hui" ? 0.6 : 1 }} 
              />
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--text-muted)", cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  checked={exp.end_date === "Aujourd'hui"}
                  onChange={e => onUpdate(exp.id, "end_date", e.target.checked ? "Aujourd'hui" : "")}
                  style={{ margin: 0, width: "auto", cursor: "pointer" }}
                />
                {t('today', "Aujourd'hui")}
              </label>
            </div>
          </div>
          <div style={{ position: "relative" }}>
            <textarea 
              rows={4} 
              placeholder={t('description_placeholder')} 
              value={exp.description || ""} 
              onChange={e => onUpdate(exp.id, "description", e.target.value)} 
              style={{ marginTop: 8, width: "100%", fontFamily: "inherit", paddingBottom: "30px" }} 
            />
            {onOptimize && (
              <button 
                type="button" 
                onClick={() => onOptimize(exp.id, exp)}
                className="btn-ghost"
                style={{ position: "absolute", right: "10px", bottom: "10px", fontSize: "12px", padding: "2px 8px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "4px", display: 'flex', alignItems: 'center', gap: 4 }}
                title={t('optimize_tooltip', "Reformuler avec l'IA")}
              >
                <Sparkles size={12} /> {t('optimize', "Améliorer")}
              </button>
            )}
          </div>

          {/* SUCCÈS */}
          <div style={{ marginTop: 15, padding: 15, background: "rgba(16, 185, 129, 0.1)", borderRadius: 8, border: "1px solid var(--success)" }}>
            <label style={{ color: "var(--success)", fontWeight: "bold", marginBottom: 10, display: "block" }}>{t('success_mark_title', '🏆 Succès marquant')}</label>
            <div style={{ display: "grid", gap: 10 }}>
              <input placeholder={t('success_context_placeholder', "Contexte (ex: Projet en retard...)")} value={exp.success_context || ""} onChange={e => onUpdate(exp.id, "success_context", e.target.value)} style={{ width: "100%" }} />
              <input placeholder={t('success_action_placeholder', "Action (ex: J'ai réorganisé le planning...)")} value={exp.success_action || ""} onChange={e => onUpdate(exp.id, "success_action", e.target.value)} style={{ width: "100%" }} />
              <input placeholder={t('success_result_placeholder', "Résultats (ex: Livré à temps, +15% perf...)")} value={exp.success_result || ""} onChange={e => onUpdate(exp.id, "success_result", e.target.value)} style={{ width: "100%" }} />
            </div>
          </div>

          {/* ÉCHECS */}
          <div style={{ marginTop: 15, padding: 15, background: "rgba(239, 68, 68, 0.1)", borderRadius: 8, border: "1px solid var(--danger-text)" }}>
            <label style={{ color: "var(--danger-text)", fontWeight: "bold", marginBottom: 10, display: "block" }}>{t('failure_mark_title', '📉 Challenge / Échec surmonté')}</label>
            <div style={{ display: "grid", gap: 10 }}>
              <input placeholder={t('failure_context_placeholder', "Contexte (ex: Erreur de communication...)")} value={exp.failure_context || ""} onChange={e => onUpdate(exp.id, "failure_context", e.target.value)} style={{ width: "100%" }} />
              <input placeholder={t('failure_action_placeholder', "Action (ex: J'ai organisé un point hebdo...)")} value={exp.failure_action || ""} onChange={e => onUpdate(exp.id, "failure_action", e.target.value)} style={{ width: "100%" }} />
              <input placeholder={t('failure_lesson_placeholder', "Enseignements (ex: Importance du feedback...)")} value={exp.failure_lesson || ""} onChange={e => onUpdate(exp.id, "failure_lesson", e.target.value)} style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      </div>
    ))}
    <button type="button" onClick={onAdd} className="btn-secondary dashed" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Plus size={16} /> {t('add_experience')}</button>
  </div>
  );
};

const PROFILE_CATEGORIES = [
  {
    id: 'work_style',
    title: '1. Style de travail',
    desc: 'Choisissez 3 traits qui décrivent votre manière de travailler',
    traits: ['Analytique', 'Créatif', 'Orienté solution', 'Organisé', 'Rigoureux', 'Proactif', 'Flexible', 'Résilient', 'Autonome']
  },
  {
    id: 'relational_style',
    title: '2. Style relationnel',
    desc: 'Choisissez 3 traits qui décrivent votre interaction avec les autres',
    traits: ['Communicant', 'À l’écoute', 'Pédagogue', 'Collaboratif', 'Facilitateur', 'Diplomate', 'Leader', 'Décideur', 'Mobilisateur']
  },
  {
    id: 'professional_approach',
    title: '3. Approche professionnelle',
    desc: 'Choisissez 3 traits qui décrivent votre contribution au travail',
    traits: ['Orienté performance', 'Pragmatique', 'Persévérant', 'Fiable', 'Sens des responsabilités', 'Engagé', 'Curieux', 'Force de proposition', 'Vision stratégique']
  }
];

export const StepQualitiesFlaws = ({ data, onChange, lang = 'en' }: any) => {
  const { t } = useTranslation();
  const hasSelectedTraits = (data.work_style?.length || 0) + (data.relational_style?.length || 0) + (data.professional_approach?.length || 0) > 0;
  const interestsList = (t('interests_list', { returnObjects: true }) as string[]) || [];

  // --- LANGUAGES CONFIGURATION ---
  const languagesList = ["English", "Français", "Español", "Deutsch", "Italiano", "Português", "中文", "日本語", "Русский", "العربية"];
  const levels = [
    { code: "A1", label: "A1", desc: t('lang_a1', "A1 - Débutant : Comprend des phrases très simples.") },
    { code: "A2", label: "A2", desc: t('lang_a2', "A2 - Élémentaire : Comprend des expressions fréquentes.") },
    { code: "B1", label: "B1", desc: t('lang_b1', "B1 - Intermédiaire : Peut se débrouiller en voyage.") },
    { code: "B2", label: "B2", desc: t('lang_b2', "B2 - Avancé : Comprend l'essentiel de sujets complexes.") },
    { code: "C1", label: "C1", desc: t('lang_c1', "C1 - Autonome : S'exprime spontanément et couramment.") },
    { code: "C2", label: "C2", desc: t('lang_c2', "C2 - Maîtrise : Comprend tout sans effort.") },
    { code: "Native", label: "Native", desc: t('lang_native', "Langue maternelle") }
  ];

  const handleAddLanguage = () => {
    const current = data.languages || [];
    onChange("languages", [...current, { language: "", level: "" }]);
  };

  const handleUpdateLanguage = (index: number, field: string, value: string) => {
    const current = [...(data.languages || [])];
    current[index] = { ...current[index], [field]: value };
    onChange("languages", current);
  };

  const handleRemoveLanguage = (index: number) => {
    const current = [...(data.languages || [])];
    current.splice(index, 1);
    onChange("languages", current);
  };
  // -------------------------------

  const toggleItem = (list: string[], item: string) => {
    if (list.includes(item)) return list.filter(i => i !== item);
    return [...list, item];
  };

  return (
  <div className="step-content">
    <h2>{t('qualities_title')}</h2>
    
    <div style={{ display: 'grid', gridTemplateColumns: hasSelectedTraits ? '2fr 1fr' : '1fr', gap: '2rem', alignItems: 'center' }}>
      <div>
    {PROFILE_CATEGORIES.map(cat => {
      const selected = data[cat.id] || [];
      return (
        <div key={cat.id} style={{ marginBottom: 25 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <label style={{ fontSize: "1.1em", fontWeight: "bold" }}>{t(`profile_cat_${cat.id}_title`, cat.title)}</label>
            <span style={{ fontSize: "0.9em", color: selected.length === 3 ? "var(--success)" : "var(--text-muted)" }}>
              {selected.length} / 3 {t('selected', 'sélectionnés')}
            </span>
          </div>
          <p style={{ fontSize: "0.9em", color: "var(--text-muted)", marginBottom: 10 }}>{t(`profile_cat_${cat.id}_desc`, cat.desc)}</p>
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {cat.traits.map(trait => {
              const isSelected = selected.includes(trait);
              return (
                <button
                  key={trait}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      onChange(cat.id, selected.filter((t: string) => t !== trait));
                    } else if (selected.length < 3) {
                      onChange(cat.id, [...selected, trait]);
                    }
                  }}
                  style={{
                    background: isSelected ? "var(--primary)" : "var(--input-bg)",
                    color: isSelected ? "white" : "var(--text-main)",
                    border: `1px solid ${isSelected ? "var(--primary)" : "var(--border-color)"}`,
                    borderRadius: "20px",
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontSize: "13px",
                    transition: "all 0.2s",
                    opacity: (!isSelected && selected.length >= 3) ? 0.5 : 1
                  }}
                >
                  {trait}
                </button>
              );
            })}
          </div>
        </div>
      );
    })}
      </div>
      {hasSelectedTraits && (
        <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '2rem' }}>
          <RadarChart data={data} />
        </div>
      )}
    </div>
    
    {/* --- DÉFAUTS & COACHING --- */}
    <div style={{ marginTop: 30, marginBottom: 30 }}>
      <h3 style={{ margin: "0 0 10px 0" }}>{t('flaws_title', 'Points de vigilance (Défauts)')}</h3>
      <p style={{ fontSize: "0.9em", color: "var(--text-muted)", marginBottom: 15 }}>
        {t('flaws_desc', "Choisissez des défauts réalistes. L'objectif n'est pas d'être parfait, mais crédible en entretien.")}
      </p>
      
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: 15 }}>
          {(t('flaws_list', { returnObjects: true, defaultValue: ['Impatient', 'Trop exigeant', 'Difficulté à déléguer', 'Tendance à tout contrôler', 'Manque de diplomatie', 'Difficulté à dire non', 'Obstiné', 'Tendance à se disperser', 'Sensible au stress', 'Idéaliste', 'Difficulté à demander de l\'aide'] }) as string[]).map((f: string) => {
              const isSelected = (data.flaws || []).includes(f);
              return (
                  <button 
                      key={f} 
                      type="button"
                      onClick={() => onChange("flaws", toggleItem(data.flaws || [], f))}
                      style={{ 
                          background: isSelected ? "var(--danger-text)" : "var(--bg-body)", 
                          color: isSelected ? "white" : "var(--text-main)",
                          border: `1px solid ${isSelected ? "var(--danger-text)" : "var(--border-color)"}`, 
                          borderRadius: "20px", padding: "6px 12px", cursor: "pointer", fontSize: "13px", transition: "all 0.2s"
                      }}
                  >
                      {f}
                  </button>
              );
          })}
      </div>
      <input 
        placeholder={t('add_custom_flaw', "Ajouter un autre défaut...")} 
        onKeyDown={(e) => { 
          if(e.key === 'Enter' && e.currentTarget.value.trim()) { 
            e.preventDefault(); 
            onChange("flaws", [...(data.flaws || []), e.currentTarget.value.trim()]); 
            e.currentTarget.value = ""; 
          } 
        }} 
        style={{ width: "100%", marginBottom: 20, padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)" }} 
      />

      {(data.flaws || []).length > 0 && (
        <div style={{ fontSize: "0.9em", color: "var(--primary)", background: "rgba(59, 130, 246, 0.1)", padding: "10px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={16} /> {t('flaws_ai_hint', "L'IA préparera les parades stratégiques pour vos défauts dans le Dashboard final.")}
        </div>
      )}
    </div>

    {/* --- LANGUAGES SECTION --- */}
    <h3 style={{marginTop: 20}}>{t('languages_title')}</h3>
    {(data.languages || []).map((lang: any, index: number) => {
        const isCustom = lang.language && !languagesList.includes(lang.language);
        return (
          <div key={index} className="dynamic-item">
              <div className="dynamic-header">
                  <label>{t('language')} {index + 1}</label>
                  <button type="button" onClick={() => handleRemoveLanguage(index)} className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Trash2 size={14} /> {t('remove')}</button>
              </div>
              <div className="form-group">
                  <div style={{display: "flex", gap: 10, marginBottom: 10}}>
                      <select 
                          value={isCustom ? "Other" : lang.language} 
                          onChange={(e) => handleUpdateLanguage(index, "language", e.target.value === "Other" ? "Other" : e.target.value)}
                          style={{flex: 1}}
                      >
                          <option value="">{t('select_language')}</option>
                          {languagesList.map(l => <option key={l} value={l}>{l}</option>)}
                          <option value="Other">{t('other')}</option>
                      </select>
                      {(lang.language === "Other" || isCustom) && (
                          <input 
                              placeholder={t('specify_language')} 
                              value={lang.language === "Other" ? "" : lang.language} 
                              onChange={(e) => handleUpdateLanguage(index, "language", e.target.value)}
                              autoFocus
                              style={{ flex: 1 }}
                          />
                      )}
                  </div>
                  
                  <label style={{fontSize: "0.9em", color: "var(--text-muted)", marginBottom: 5}}>{t('level_label')}</label>
                  <div style={{display: "flex", flexWrap: "wrap", gap: 5}}>
                      {levels.map(lvl => (
                          <button
                              key={lvl.code}
                              type="button"
                              title={lvl.desc}
                              onClick={() => handleUpdateLanguage(index, "level", lvl.code)}
                              style={{
                                  background: lang.level === lvl.code ? "var(--primary)" : "var(--bg-body)",
                                  color: lang.level === lvl.code ? "white" : "var(--text-main)",
                                  border: "1px solid var(--border-color)",
                                  borderRadius: "4px",
                                  padding: "5px 10px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontWeight: lang.level === lvl.code ? "bold" : "normal",
                                  transition: "all 0.2s"
                              }}
                          >
                              {lvl.label}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
        );
    })}
    <button type="button" onClick={handleAddLanguage} className="btn-secondary dashed" style={{marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6}}><Plus size={16} /> {t('add_language')}</button>
    {/* ------------------------- */}

    <div className="form-group">
        <label>{t('tech_skills')}</label>
        <textarea rows={2} value={data.skills || ""} onChange={e => onChange("skills", e.target.value)} placeholder={t('placeholder_tech_skills')} style={{ width: "100%" }} />
    </div>

    <div className="form-group" style={{marginTop: 20}}>
        <label>{t('interests_label')}</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", maxHeight: "150px", overflowY: "auto", border: "1px solid var(--border-color)", padding: "10px", borderRadius: "8px" }}>
            {interestsList.map(i => (
                <button 
                    key={i} 
                    type="button"
                    onClick={() => onChange("interests", toggleItem(Array.isArray(data.interests) ? data.interests : [], i))}
                    style={{ 
                        background: (Array.isArray(data.interests) ? data.interests : []).includes(i) ? "var(--primary)" : "var(--bg-body)", 
                        color: (Array.isArray(data.interests) ? data.interests : []).includes(i) ? "white" : "var(--text-main)",
                        border: "1px solid var(--border-color)", borderRadius: "20px", padding: "5px 10px", cursor: "pointer", fontSize: "12px"
                    }}
                >
                    {i}
                </button>
            ))}
        </div>
        <input placeholder={t('add_custom_interest')} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); onChange("interests", [...(Array.isArray(data.interests) ? data.interests : []), e.currentTarget.value]); e.currentTarget.value = ""; } }} style={{marginTop: 5, width: "100%"}} />
    </div>
  </div>
  );
};

export const StepFreeText = ({ data, onChange, onAnalyze, loading, lang = 'en' }: any) => {
    const { t } = useTranslation();
    return (
    <div className="step-content">
        <h2>{t('express_yourself')}</h2>
        <p style={{fontSize: "0.9em", color: "var(--text-muted)"}}>{t('express_desc')}</p>
        <textarea rows={8} value={data.free_text} onChange={e => onChange("free_text", e.target.value)} placeholder={t('express_placeholder')} style={{ width: "100%" }} />
    </div>
    );
};

export const StepClarification = ({ clarifications, onAnswer, lang = 'en' }: any) => {
  const { t } = useTranslation();
  if (!clarifications || clarifications.length === 0) return <div className="step-content"><h2>{t('all_good')}</h2><p>{t('profile_complete')}</p></div>;
  return (
    <div className="step-content">
      <h2>{t('clarification_title')}</h2>
      <p style={{color: "var(--text-muted)", marginBottom: 20}}>{t('clarification_desc')}</p>
      
      {clarifications.map((item: any, index: number) => (
        <div key={index} className="card" style={{ padding: 20, marginBottom: 15, border: "1px solid var(--border-color)", borderRadius: "12px", background: "var(--bg-card)", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
            <div style={{ background: "var(--bg-secondary)", padding: "8px", borderRadius: "8px", height: "fit-content" }}>
              <HelpCircle size={20} color="var(--primary)" />
            </div>
            <label style={{fontWeight: "600", fontSize: "1.05em", color: "var(--text-main)", lineHeight: "1.4", marginTop: "2px"}}>{item.question}</label>
          </div>
          <textarea rows={3} placeholder={t('placeholder_answer')} onBlur={(e) => onAnswer(item.id, e.target.value)} style={{ width: "100%", borderRadius: "8px", borderColor: "var(--border-color)" }} />
        </div>
      ))}
    </div>
  );
};

export const StepReview = (props: any) => {
  const { 
    data, onChange, 
    experiences, onUpdateExperience, onAddExperience, onRemoveExperience,
    educations, onUpdateEducation, onAddEducation, onRemoveEducation,
    onPreview,
    onBack,
    onGenerate,
    loading,
    cvMode,
    cvAnalysis,
    pitchData,
    gapAnalysis, // [NEW] On importe les données d'analyse
    lang = 'en'
  } = props;

  const { t } = useTranslation();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>("profile");

  // --- LOGIQUE JAUGE ATS & MOTS CLES ---
  const gapData = gapAnalysis || {};
  // Fallback si l'IA a traduit les clés en français
  const missingKeywordsRaw = gapData.missing_gaps || gapData.lacunes || gapData.ecarts || [];
  const missingKeywords = missingKeywordsRaw.map((g: any) => typeof g === 'string' ? g : (g.skill || JSON.stringify(g)));
  const baseScore = gapData.match_score || gapData.score_adequation || gapData.score || 0;

  const [addedKeywords, setAddedKeywords] = useState<string[]>([]);
  const [editingKw, setEditingKw] = useState<string | null>(null);
  const [kwInput, setKwInput] = useState("");
  
  const pointsPerKeyword = missingKeywords.length > 0 ? Math.ceil((100 - baseScore) / missingKeywords.length) : 0;
  const targetScore = Math.min(100, baseScore + (addedKeywords.length * pointsPerKeyword));
  const [animatedScore, setAnimatedScore] = useState(baseScore);

  useEffect(() => {
      let current = animatedScore;
      if (current === targetScore) return;
      const step = targetScore > current ? 1 : -1;
      const timer = setInterval(() => {
          if (current === targetScore) clearInterval(timer);
          else { current += step; setAnimatedScore(current); }
      }, 20);
      return () => clearInterval(timer);
  }, [targetScore, animatedScore]);

  const handleConfirmAdd = (originalKw: string) => {
      if (kwInput.trim()) {
          if (!addedKeywords.includes(originalKw)) setAddedKeywords(prev => [...prev, originalKw]);
          setEditingKw(null);
          // Optionnel: Mettre à jour les skills dans le formulaire
          if (onChange) {
              const currentSkills = data.skills || [];
              onChange("skills", typeof currentSkills === 'string' ? `${currentSkills}, ${kwInput}` : [...currentSkills, kwInput]);
          }
      }
  };
  const scoreColor = animatedScore >= 80 ? '#10b981' : animatedScore >= 50 ? '#f59e0b' : '#ef4444';

  const refreshPreview = async () => {
    if (onPreview) {
      setLoadingPreview(true);
      const url = await onPreview({ design_variant: "1", cvMode: "ATS" });
      setPreviewUrl(url);
      setLoadingPreview(false);
    }
  };

  // Charger la prévisualisation au montage
  useEffect(() => {
    refreshPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Accordion = ({ title, id, children }: any) => (
    <div style={{ border: "1px solid var(--border-color)", borderRadius: 8, marginBottom: 10, overflow: "hidden" }}>
      <div 
        onClick={() => setActiveTab(activeTab === id ? null : id)}
        style={{ 
          padding: "10px 15px", background: "var(--bg-secondary)", cursor: "pointer", fontWeight: "bold", 
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}
      >
        {title}
        <span>{activeTab === id ? "▲" : "▼"}</span>
      </div>
      {activeTab === id && <div style={{ padding: 15, background: "var(--bg-card)" }}>{children}</div>}
    </div>
  );

  return (
    <div className="step-content" style={{ maxWidth: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <button type="button" onClick={onBack} className="btn-secondary">&larr; {t('back_productions')}</button>
        <h2 style={{ margin: 0 }}>{t('review_title')}</h2>
        <div style={{width: 180}}></div> {/* Spacer to center title */}
      </div>
      <div style={{ display: "flex", gap: 20, flexDirection: "row", height: "calc(100vh - 220px)", minHeight: "500px" }}>
        
        {/* LEFT COLUMN: EDITOR */}
        <div style={{ flex: 1, overflowY: "auto", paddingRight: 10 }}>
          <Accordion title={<span style={{display: 'flex', alignItems: 'center', gap: 8}}><User size={18}/> {t('profile_title')}</span>} id="profile">
            <StepProfile data={data} onChange={onChange} lang={lang} />
          </Accordion>
          
          <Accordion title={<span style={{display: 'flex', alignItems: 'center', gap: 8}}><Briefcase size={18}/> {t('experience_title')}</span>} id="experience">
            <StepExperience list={experiences} onUpdate={onUpdateExperience} onAdd={onAddExperience} onRemove={onRemoveExperience} lang={lang} />
          </Accordion>
          
          <Accordion title={<span style={{display: 'flex', alignItems: 'center', gap: 8}}><GraduationCap size={18}/> {t('education_title')}</span>} id="education">
            <StepEducation list={educations} onUpdate={onUpdateEducation} onAdd={onAddEducation} onRemove={onRemoveEducation} lang={lang} />
          </Accordion>

          <Accordion title={<span style={{display: 'flex', alignItems: 'center', gap: 8}}><Gem size={18}/> {t('qualities_title')}</span>} id="skills">
             <StepQualitiesFlaws 
                data={data} onChange={onChange}
                lang={lang}
             />
          </Accordion>

          <Accordion title={<span style={{display: 'flex', alignItems: 'center', gap: 8}}><Target size={18}/> {t('target_title')}</span>} id="target">
             <StepTarget data={data} onChange={onChange} lang={lang} />
          </Accordion>
        </div>

        {/* RIGHT COLUMN: PREVIEW */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid var(--border-color)", borderRadius: 8, background: "#525659", overflow: "hidden" }}>
          <div style={{ padding: 10, background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: "bold" }}>{t('live_preview')}</span>
            
            {/* Badge Format Unique */}
            <div style={{ background: "var(--bg-card)", color: "var(--primary)", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", border: "1px solid var(--primary)" }}>
              {t('unique_format_badge', 'Format Unique (Optimisé)')}
            </div>

            <button 
              type="button" 
              onClick={refreshPreview} 
              className="btn-primary" 
              style={{ padding: "5px 15px", fontSize: "12px", display: 'flex', alignItems: 'center', gap: 6 }}
              disabled={loadingPreview}
            >
              {loadingPreview ? <><Loader2 size={14} className="spin" /> {t('generating')}</> : <><RefreshCw size={14} /> {t('refresh_preview')}</>}
            </button>
          </div>
          
          {/* ZONE DE SCORE */}
          <div style={{ padding: "15px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}>
              
              {/* JAUGE ATS & MOTS CLES INTERACTIFS */}
              <div style={{ marginBottom: cvAnalysis?.score_analysis ? '1.5rem' : '0', paddingBottom: cvAnalysis?.score_analysis ? '1.5rem' : '0', borderBottom: cvAnalysis?.score_analysis ? '1px dashed var(--border-color)' : 'none' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Target size={16} color={scoreColor} /> {t('ats_score_title', "Score d'Adéquation ATS")}
                  </h4>
                  <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                      <div style={{ width: `${animatedScore}%`, height: '100%', background: scoreColor, transition: 'width 0.1s linear, background 0.5s ease-in-out' }}></div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: scoreColor, fontWeight: 600 }}>{animatedScore}/100 - {animatedScore >= 80 ? t('score_excellent', "Excellent") : animatedScore >= 50 ? t('score_average', "Moyen") : t('score_improve', "À améliorer")}</div>

                  {missingKeywords.length > 0 && (
                      <div style={{ marginTop: '1rem', background: 'var(--bg-card)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                          <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--danger-text)' }}>{t('missing_keywords', 'Mots-clés manquants')}</h5>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                              {missingKeywords.map((kw: string, i: number) => {
                                  const isAdded = addedKeywords.includes(kw);
                                  if (editingKw === kw) {
                                      return (
                                          <div key={i} style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--primary)', borderRadius: '2rem', padding: '0.15rem 0.25rem 0.15rem 0.75rem' }}>
                                              <input autoFocus value={kwInput} onChange={e => setKwInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') handleConfirmAdd(kw); if(e.key === 'Escape') setEditingKw(null); }} style={{ border: 'none', outline: 'none', width: '100px', fontSize: '0.8rem' }} />
                                              <button onClick={() => handleConfirmAdd(kw)} style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: '0.25rem' }}><CheckCircle2 size={12}/></button>
                                          </div>
                                      );
                                  }
                                  return (
                                      <span key={i} onClick={() => { if(!isAdded) { setEditingKw(kw); setKwInput(kw); } }} style={{ background: isAdded ? 'rgba(34, 197, 94, 0.1)' : 'transparent', color: isAdded ? 'var(--success)' : 'var(--danger-text)', border: `1px solid ${isAdded ? 'var(--success)' : 'var(--danger-text)'}`, padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', cursor: isAdded ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                          {kw} {isAdded ? <CheckCircle2 size={12}/> : <Plus size={12}/>}
                                      </span>
                                  );
                              })}
                          </div>
                      </div>
                  )}
              </div>

              {cvAnalysis?.score_analysis && (
                 <>
                {cvAnalysis.score_analysis && (
                    <ScoreGauge 
                        score={cvAnalysis.score_analysis.global_score} 
                        label={t('recruiter_readability', "📄 Lisibilité Recruteur")} 
                        critique={cvAnalysis.score_analysis.critique}
                        metrics={[
                            { label: t('metric_reading', "Lecture"), value: cvAnalysis.score_analysis.readability },
                            { label: t('metric_value', "Valeur"), value: cvAnalysis.score_analysis.perceived_value },
                            { label: t('metric_noise', "Bruit"), value: cvAnalysis.score_analysis.noise_level }
                        ]}
                    />
                )}

                {/* Cross Analysis: Wahou Effect */}
                {cvAnalysis?.score_analysis && pitchData?.analysis && Math.abs(cvAnalysis.score_analysis.global_score - pitchData.analysis.global_score) > 1.5 && (
                    <div style={{ fontSize: "12px", padding: "8px", background: "#fff7ed", border: "1px solid #fdba74", borderRadius: "6px", color: "#c2410c" }}>
                        ⚠️ <b>{t('gap_detected_warning', "Écart détecté :")}</b> {cvAnalysis.score_analysis.global_score > pitchData.analysis.global_score ? t('gap_cv_better_pitch', "Ton CV est clair, mais ton pitch dilue ta valeur.") : t('gap_pitch_better_cv', "Ton pitch est convaincant, mais ton CV ne le reflète pas.")}
                    </div>
                )}
                 </>
              )}
          </div>

          <div style={{ flex: 1, position: "relative" }}>
             {previewUrl ? (
               <iframe src={previewUrl} style={{ width: "100%", height: "100%", border: "none" }} title="CV Preview" />
             ) : (
               <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "white" }}>{loadingPreview ? t('loading_preview') : t('preview_unavailable')}</div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
