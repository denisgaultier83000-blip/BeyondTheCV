import React from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageSelectorProps {
  value?: string;
  onChange?: (lang: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function LanguageSelector({ value, onChange, className, style }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  
  // [FIX] Ajout de .toLowerCase() car la prop "value" peut être "French" ou "English"
  // "French".toLowerCase().substring(0, 2) -> "fr" (correspond aux options)
  const currentLang = (value || i18n.resolvedLanguage || i18n.language || 'fr').toLowerCase().substring(0, 2);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);
    if (onChange) onChange(newLang);
  };

  return (
    <select 
      className={className}
      value={currentLang} 
      onChange={handleChange}
      style={{ 
        padding: "6px 12px", 
        borderRadius: "20px", 
        border: "1px solid var(--border-color)", 
        background: "var(--bg-card)", 
        color: "var(--text-main)", 
        cursor: "pointer", 
        fontSize: "14px",
        outline: "none",
        ...style
      }}
    >
      <option value="fr">Français 🇫🇷</option>
      <option value="en">English 🇬🇧</option>
    </select>
  );
}