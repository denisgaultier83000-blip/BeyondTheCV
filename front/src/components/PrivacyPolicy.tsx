import React from 'react';

export function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem', background: 'var(--bg-card)', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', color: 'var(--text-main)', textAlign: 'left' }}>
      <h1 style={{ color: 'var(--primary)', marginBottom: '2rem', fontSize: '2rem' }}>Politique de Confidentialité</h1>
      
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#446285', fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>1. Collecte des Données</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
          Nous collectons les données strictement nécessaires au fonctionnement de nos services (informations de profil, expériences professionnelles, parcours éducatif). Ces informations sont stockées de manière sécurisée pour vous permettre de générer vos documents et de reprendre votre avancement à tout moment.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#446285', fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>2. Utilisation de l'Intelligence Artificielle</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
          Pour vous fournir une analyse stratégique personnalisée, une partie de vos données (anonymisées dans la mesure du possible, hors identifiants directs comme votre email ou téléphone) est transmise à nos partenaires d'intelligence artificielle (ex: OpenAI, Google). Ces prestataires ont l'interdiction d'utiliser ces données pour entraîner leurs modèles publics.
        </p>
      </section>
      
      <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
        Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
      </p>
    </div>
  );
}