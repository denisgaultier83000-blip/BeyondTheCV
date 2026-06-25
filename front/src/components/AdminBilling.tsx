export function AdminBilling() {
  // TODO: Fetch payment/order data from a new backend endpoint: GET /api/admin/billing

  return (
    <div className="admin-page-content">
      <h2 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        Facturation & Abonnements
      </h2>
      <p style={{ color: '#64748b' }}>
        Cette section affichera l'historique de toutes les transactions (paiements Stripe, recharges, remboursements).
        Elle permettra de vérifier rapidement les droits d'accès d'un utilisateur et de consulter
        les factures associées.
      </p>
      {/* Placeholder for billing table */}
      <div style={{ border: '2px dashed #e2e8f0', padding: '2rem', textAlign: 'center', color: '#94a3b8', borderRadius: '8px', marginTop: '2rem' }}>
        Tableau des transactions à venir...
      </div>
    </div>
  );
}