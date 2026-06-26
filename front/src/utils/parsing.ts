/**
 * @file parsing.ts
 * @description Fonctions utilitaires robustes pour parser les réponses JSON de l'IA,
 * conçues pour résister aux variations de format et aux "hallucinations".
 */

/**
 * Extrait de manière ultra-robuste un tableau de questions d'un objet de données potentiellement malformé.
 * @param data - Les données brutes reçues de l'IA.
 * @returns Un tableau de questions valides, ou un tableau vide.
 */
export const getQuestionsArray = (data: any): any[] => {
  if (!data) return [];

  // 1. Déballage et parsing sécurisé du JSON.
  let actualData = data.result !== undefined ? data.result : data;
  let depth = 0;
  while (typeof actualData === 'string' && depth < 7) {
      try {
          const match = actualData.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
          actualData = JSON.parse(match ? match[1] : actualData);
          depth++;
      } catch(e) { break; }
  }

  if (typeof actualData !== 'object' || actualData === null) return [];

  // 2. Recherche récursive de la "meilleure" liste de questions.
  let bestMatch: any[] = [];
  const findBestArray = (obj: any) => {
    if (!obj) return;
    for (const key in obj) {
      const value = obj[key];
      if (Array.isArray(value) && value.length > 0) {
        const questionLikeItems = value.filter(item => typeof item === 'object' && item !== null && 'question' in item).length;
        if (questionLikeItems > bestMatch.length) bestMatch = value;
      } else if (typeof value === 'object') findBestArray(value);
    }
  };
  findBestArray(actualData);
  if (bestMatch.length > 0) return bestMatch;

  // 3. Stratégies de secours.
  if (actualData.questions && Array.isArray(actualData.questions)) return actualData.questions;
  if (Array.isArray(actualData)) return actualData;
  const allArrays = Object.values(actualData).filter(v => Array.isArray(v) && v.every(i => typeof i === 'object')) as any[][];
  if (allArrays.length > 0) {
    allArrays.sort((a, b) => b.length - a.length);
    return allArrays[0];
  }

  return [];
};

/**
 * Extrait et transforme les "Mises en Situation" (MES) en un format de question standard.
 * @param data - Les données brutes reçues de l'IA.
 * @returns Un tableau de scénarios formatés comme des questions, ou un tableau vide.
 */
export const getScenariosAsQuestions = (data: any): any[] => {
  if (!data) return [];
  let actualData = data.result !== undefined ? data.result : data;
  let depth = 0;
  while (typeof actualData === 'string' && depth < 7) {
      try {
          const match = actualData.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
          actualData = JSON.parse(match ? match[1] : actualData);
          depth++;
      } catch(e) { break; }
  }
  if (typeof actualData !== 'object' || actualData === null) return [];
  let bestMatch: any[] = [];
  const scenarioKeys = ['scenario', 'situation', 'defi', 'contexte', 'description'];
  const findBestArray = (obj: any) => {
    if (!obj) return;
    for (const key in obj) {
      const value = obj[key];
      if (Array.isArray(value) && value.length > 0) {
        const scenarioLikeItems = value.filter(item => typeof item === 'object' && item !== null && scenarioKeys.some(sk => sk in item)).length;
        if (scenarioLikeItems > bestMatch.length) bestMatch = value;
      } else if (typeof value === 'object') findBestArray(value);
    }
  };
  findBestArray(actualData);
  return bestMatch.map(sc => ({
    category: `SCÉNARIO : ${sc.category || sc.theme || 'Général'}`,
    question: sc.scenario || sc.situation || sc.defi || sc.contexte || sc.description || 'Décrivez la situation.',
    suggested_answer: sc.expected_behavior || sc.suggested_answer || sc.answer || sc.solution || "Utilisez la méthode STAR pour structurer votre réponse.",
    advice: sc.advice || sc.context || sc.rationale || sc.strategy || "Cette mise en situation évalue vos réflexes professionnels.",
  }));
};