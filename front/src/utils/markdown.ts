/**
 * Parseur Markdown léger et sécurisé pour l'affichage des analyses IA.
 * Gère l'échappement HTML basique, les titres, le gras et les listes à puces.
 */
export const formatMarkdown = (text: string | null | undefined) => {
    if (!text) return { __html: "" };
    
    let safeText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  
    const html = safeText
      .replace(/^###?\s+(.*$)/gim, '<h4 style="margin: 1.2rem 0 0.5rem 0; color: var(--primary); font-size: 1.05rem;">$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-main); font-weight: 700;">$1</strong>')
      .replace(/^\s*[\-\*]\s+(.*$)/gim, '<li style="margin-left: 1.5rem; display: list-item; list-style-type: disc; margin-bottom: 0.25rem;">$1</li>');
      
    return { __html: html };
  };