import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";

export type InterviewQuestion = {
  id: string;
  category: "timeline" | "role_scope" | "impact" | "context_culture";
  question: string;
  probabilityScore: number;
  whyThisQuestion: string;
  source: { type: "experience" | "education" | "location" | "name"; value: string; reference: string };
};

export default function InterviewPrepPanel({
  questions,
}: {
  questions: InterviewQuestion[];
}) {
  const { t, i18n } = useTranslation();

  function labelCat(c: InterviewQuestion["category"]) {
    if (c === "timeline") return t('interview_prep_panel_cat_timeline');
    if (c === "role_scope") return t('interview_prep_panel_cat_role_scope');
    if (c === "impact") return t('interview_prep_panel_cat_impact');
    return t('interview_prep_panel_cat_context_culture');
  }

  const grouped = useMemo(() => {
    const g: Record<string, InterviewQuestion[]> = {};
    for (const q of questions) {
      (g[q.category] ||= []).push(q);
    }
    for (const k of Object.keys(g)) g[k].sort((a, b) => b.probabilityScore - a.probabilityScore);
    return g;
  }, [questions]);

  if (!questions.length) return null;

  return (
    <div style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
      <h2 style={{ marginTop: 0 }}>{t('interview_prep_panel_title')}</h2>
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
        {t('interview_prep_panel_language', { language: i18n.language.toUpperCase(), count: questions.length })}
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginTop: 12 }}>
          <h3 style={{ marginBottom: 8 }}>{labelCat(cat as any)}</h3>
          {items.map((q) => (
            <div key={q.id} style={{ padding: 10, border: "1px solid #eee", borderRadius: 10, marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 700 }}>{q.question}</div>
                <div style={{ fontSize: 12, opacity: 0.8, whiteSpace: "nowrap" }}>
                  {q.probabilityScore}/100
                </div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>{q.whyThisQuestion}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }} dangerouslySetInnerHTML={{ __html: t('interview_prep_panel_source', { reference: q.source.reference, value: q.source.value }) }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
