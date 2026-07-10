
import React from 'react';
import { BrainCircuit } from 'lucide-react';

const NegotiationBriefing = ({ data }) => {
    if (!data) return null;

    const { opening_salary, target_agreement, walk_away_point, alternative_negotiation_points } = data.negotiation_briefing;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount).replace(/\s/g, '\u00A0');
    };

    return (
        <div className="negotiation-section briefing-section">
            <BrainCircuit size={24} className="section-icon" />
            <h4>Votre briefing personnalisé</h4>
            <p>
                Au vu de votre expérience, des salaires observés sur ce type de poste, de la taille de cette entreprise et de son contexte économique, je vous conseille d'ouvrir la négociation à <strong>{formatCurrency(opening_salary)}</strong>, de viser un accord autour de <strong>{formatCurrency(target_agreement)}</strong> et de ne pas descendre sous <strong>{formatCurrency(walk_away_point)}</strong>.
            </p>
            <p>
                Si l'entreprise refuse, privilégiez la négociation des points suivants :
            </p>
            <ul>
                {alternative_negotiation_points.map((point, index) => (
                    <li key={index}>{point}</li>
                ))}
            </ul>
        </div>
    );
};

export default NegotiationBriefing;
