import React from 'react';

export function LegalNotice() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem', background: 'var(--bg-card)', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', color: 'var(--text-main)', textAlign: 'left' }}>
      <h1 style={{ color: 'var(--primary)', marginBottom: '2rem', fontSize: '2rem' }}>Mentions Légales</h1>
      
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#446285', fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>1. Éditeur du site</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
          Le site BeyondTheCV est édité par [Nom de votre société / Votre Nom], situé au [Votre Adresse complète].<br />
          Email de contact : [contact@votre-domaine.com]
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#446285', fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>2. Hébergement</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
          Ce site est hébergé par [Nom de l'hébergeur, ex: Vercel, AWS, OVH], dont le siège social est situé au [Adresse de l'hébergeur].
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#446285', fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>3. Propriété intellectuelle</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
          L'ensemble des éléments figurant sur ce site (textes, éléments graphiques, algorithmes, interfaces) sont protégés par les dispositions du Code de la Propriété Intellectuelle. Toute reproduction totale ou partielle est strictement interdite sans autorisation préalable.
        </p>
      </section>
      
      <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
        Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
      </p>
    </div>
  );
}