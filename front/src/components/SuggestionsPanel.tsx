// c:\BeyondTheCV\front\src\components\SuggestionsPanel.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

interface SuggestionsPanelProps {
  suggestions: any;
  onUpdate: (key: string, value: any) => void;
  onApply: (key: string, value: any) => void;
}

export default function SuggestionsPanel({ suggestions, onUpdate, onApply }: SuggestionsPanelProps) {
  if (!suggestions) return null;
  const { t } = useTranslation();
  const [applied, setApplied] = useState<Record<string, boolean>>({});

  const handleApply = (key: string, value: any, id?: string) => {
    onApply(key, value);
    setApplied(prev => ({ ...prev, [id || key]: true }));
  };

  const renderField = (label: string, key: string) => (
    <div style={{ marginBottom: 15 }}>
      <label style={{ fontSize: 12, fontWeight: "bold", color: "var(--primary)" }}>{label}</label>
      <div style={{ display: "flex", gap: 5 }}>
        <input 
          value={suggestions[key] || ""} 
          onChange={(e) => onUpdate(key, e.target.value)}
          style={{ fontSize: 12, padding: 5, flex: 1 }}
        />
        <button 
          type="button" 
          onClick={() => handleApply(key, suggestions[key])}
          className="btn-ghost"
          style={{ padding: "2px 8px", fontSize: 16, cursor: "pointer" }}
          title={t('apply_to_form_tooltip', "Apply to form")}
        >
          {applied[key] ? "✅" : "←"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="card" style={{ width: "500px", padding: "20px", height: "fit-content", maxHeight: "80vh", overflowY: "auto", position: "sticky", top: 20, borderLeft: "4px solid var(--primary)" }}>
      <h3 style={{ marginTop: 0, fontSize: 18, color: "var(--text-main)" }}>{t('suggestions_title', "AI Suggestions")}</h3>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
        {t('suggestions_desc', "Review data extracted from your CV and click the arrow to fill the form.")}
      </p>
      
      {renderField(t('first_name', "First Name"), "first_name")}
      {renderField(t('last_name', "Last Name"), "last_name")}
      {renderField(t('email', "Email"), "email")}
      {renderField(t('phone', "Phone"), "phone")}
      {renderField(t('linkedin', "LinkedIn"), "linkedin")}
      {renderField(t('city', "City"), "city")}
      {renderField(t('residence_country', "Country"), "residence_country")}
      
      <div style={{ marginBottom: 15 }}>
        <label style={{ fontSize: 12, fontWeight: "bold", color: "var(--primary)" }}>{t('bio', "Bio")}</label>
        <div style={{ display: "flex", gap: 5, flexDirection: "column" }}>
            <textarea 
                rows={3}
                value={suggestions.bio || ""} 
                onChange={(e) => onUpdate("bio", e.target.value)}
                style={{ fontSize: 12, padding: 5, width: "100%" }}
            />
            <button type="button" onClick={() => handleApply("bio", suggestions.bio)} className="btn-ghost" style={{ alignSelf: "flex-end", fontSize: 12 }}>
                {applied["bio"] ? t('applied', "✅ Applied") : t('apply_bio', "Apply Bio ←")}
            </button>
        </div>
      </div>

      {/* Experiences */}
      {suggestions.experiences?.length > 0 && (
          <div style={{ marginBottom: 15 }}>
              <label style={{ fontSize: 12, fontWeight: "bold", color: "var(--primary)" }}>{t('experience_title', "Experiences")} ({suggestions.experiences.length})</label>
              {suggestions.experiences.map((exp: any, i: number) => (
                  <div key={i} style={{ border: "1px solid var(--border-color)", padding: 8, borderRadius: 4, marginBottom: 5, fontSize: 12, background: "var(--bg-body)" }}>
                      <div style={{fontWeight: "bold"}}>{exp.role}</div>
                      <div>{exp.company}</div>
                      <div style={{ opacity: 0.7, fontSize: 11 }}>{exp.start_date} - {exp.end_date}</div>
                      <button type="button" onClick={() => handleApply("experiences", [exp], `exp_${i}`)} className="btn-ghost" style={{ marginTop: 5, width: "100%", fontSize: 11 }}>
                          {applied[`exp_${i}`] ? t('applied', "✅ Applied") : t('apply_experience', "Apply this experience ←")}
                      </button>
                  </div>
              ))}
          </div>
      )}

      {/* Educations */}
      {suggestions.educations?.length > 0 && (
          <div style={{ marginBottom: 15 }}>
              <label style={{ fontSize: 12, fontWeight: "bold", color: "var(--primary)" }}>{t('education_title', "Education")} ({suggestions.educations.length})</label>
              {suggestions.educations.map((edu: any, i: number) => (
                  <div key={i} style={{ border: "1px solid var(--border-color)", padding: 8, borderRadius: 4, marginBottom: 5, fontSize: 12, background: "var(--bg-body)" }}>
                      <div style={{fontWeight: "bold"}}>{edu.degree}</div>
                      <div>{edu.school}, {edu.year}</div>
                      <button type="button" onClick={() => handleApply("educations", [edu], `edu_${i}`)} className="btn-ghost" style={{ marginTop: 5, width: "100%", fontSize: 11 }}>
                          {applied[`edu_${i}`] ? t('applied', "✅ Applied") : t('apply_education', "Apply this diploma ←")}
                      </button>
                  </div>
              ))}
          </div>
      )}
      
      {renderField(t('tech_skills', "Skills"), "skills")}
      {renderField(t('interests_label', "Interests"), "interests")}

    </div>
  );
}
