import React from 'react';

export function CGU() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem', background: 'var(--bg-card)', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', color: 'var(--text-main)', textAlign: 'left' }}>
      <h1 style={{ color: 'var(--primary)', marginBottom: '2rem', fontSize: '2rem' }}>Conditions Générales d'Utilisation (CGU)</h1>
      
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#446285', fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>1. Objet du Service</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
          BeyondTheCV est une plateforme SaaS d'assistance à la rédaction de CV et de préparation aux entretiens d'embauche. Le service analyse le profil de l'utilisateur pour fournir une stratégie de candidature ciblée.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#446285', fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>2. Avertissement lié à l'Intelligence Artificielle</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
          Les contenus générés (pitchs, analyses de marché, suggestions d'entretien, optimisation de CV) sont produits par des algorithmes d'Intelligence Artificielle avancés. Bien que nous nous efforcions de fournir l'analyse la plus pertinente, ces résultats sont fournis à titre consultatif. L'utilisateur est seul responsable de la vérification, de la révision et de l'usage des documents générés. <strong>BeyondTheCV ne garantit en aucun cas l'obtention d'un entretien, d'un emploi ou la réussite d'un processus de recrutement.</strong>
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#446285', fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>3. Tarification et Accès</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
          L'accès à la génération de la première candidature (incluant l'ensemble des modules du tableau de bord) est facturé 99 $. Cet accès est valable pour une durée de 3 mois. L'utilisateur peut générer des candidatures supplémentaires pour de nouvelles cibles au tarif de 10 $ l'unité. En raison de la nature immédiate et personnalisée de la génération par IA (qui engage des frais serveurs), aucun remboursement ne peut être exigé une fois le processus d'analyse lancé.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#446285', fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>4. Confidentialité et Données</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
          Vos données professionnelles sont traitées dans le strict respect de la vie privée. Afin de fournir le service, vos données de profil sont transmises de manière sécurisée et éphémère à nos fournisseurs de modèles d'IA (OpenAI, Google). Elles ne sont en aucun cas revendues à des tiers ni utilisées pour l'entraînement public des modèles.
        </p>
      </section>
      
      <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
        Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
      </p>
    </div>
  );
}