import React from "react";
import { useTranslation } from "react-i18next";

interface PitchMissingInfoProps {
  missingFields: string[];
  data: any;
  onChange: (key: string, value: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function PitchMissingInfo({ missingFields, data, onChange, onSubmit, onCancel }: PitchMissingInfoProps) {
  const { t } = useTranslation();
  const labels: Record<string, string> = {
    birth_date: t('birth_date', "Date de naissance"),
    birth_place: t('birth_place', "Lieu de naissance"),
    family_situation: t('family_situation', "Situation familiale"),
    target_company: t('target_company', "Entreprise Cible (ou Secteur)"),
  };

  return (
    <div className="dashboard-container" style={{ width: "100%", maxWidth: "600px" }}>
      <h2 style={{ textAlign: "center", color: "var(--primary)" }}>{t('missing_info_title', "Informations Manquantes")}</h2>
      <p style={{ textAlign: "center", color: "var(--text-muted)", marginBottom: "20px" }}>
        {t('missing_info_desc', "Pour générer un pitch sur-mesure, quelques détails supplémentaires sont nécessaires.")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {missingFields.includes("birth_date") && (
          <div className="form-group">
            <label>{labels["birth_date"]}</label>
            <input type="date" value={data.birth_date || ""} onChange={(e) => onChange("birth_date", e.target.value)} style={{ width: "100%" }} />
          </div>
        )}

        {missingFields.includes("birth_place") && (
          <div className="form-group">
            <label>{labels["birth_place"]}</label>
            <input type="text" value={data.birth_place || ""} onChange={(e) => onChange("birth_place", e.target.value)} placeholder="e.g. Paris, France" style={{ width: "100%" }} />
          </div>
        )}

        {missingFields.includes("family_situation") && (
          <div className="form-group">
            <label>{labels["family_situation"]}</label>
            <input type="text" value={data.family_situation || ""} onChange={(e) => onChange("family_situation", e.target.value)} placeholder="e.g. Married, 2 children" style={{ width: "100%" }} />
          </div>
        )}

        {(missingFields.includes("target_company") || missingFields.includes("target_industry")) && (
          <>
            <div className="form-group">
                <label>{t('target_company', "Entreprise cible")}</label>
                <input type="text" value={data.target_company || ""} onChange={(e) => onChange("target_company", e.target.value)} placeholder={t('placeholder_target_company', "Ex: Google")} style={{ width: "100%" }} />
            </div>
            <div className="form-group">
                <label>{t('target_industry', "Secteur cible (si entreprise inconnue)")}</label>
                <input type="text" value={data.target_industry || ""} onChange={(e) => onChange("target_industry", e.target.value)} placeholder={t('placeholder_target_industry', "Ex: Tech")} style={{ width: "100%" }} />
            </div>
          </>
        )}
      </div>

      <div className="actions" style={{ marginTop: "30px", justifyContent: "center", gap: "20px" }}>
        <button className="btn-secondary" onClick={onCancel}>{t('btn_cancel', "Annuler")}</button>
        <button className="btn-primary" onClick={onSubmit}>{t('btn_gen_pitch', "Générer le Pitch")}</button>
      </div>
    </div>
  );
}