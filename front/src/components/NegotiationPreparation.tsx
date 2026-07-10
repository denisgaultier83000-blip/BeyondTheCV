
import React from 'react';
import { Check } from 'lucide-react';

const NegotiationPreparation = ({ data }) => {
    if (!data) return null;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount).replace(/\s/g, '\u00A0');
    };

    return (
        <div className="negotiation-section">
            <h4>1. Préparation</h4>
            <div className="preparation-grid">
                <div className="preparation-item">
                    <Check size={16} className="check-icon" />
                    <div>
                        <strong>Salaire marché :</strong>
                        <span>{formatCurrency(data.market_salary.min)}–{formatCurrency(data.market_salary.max)}</span>
                    </div>
                </div>
                <div className="preparation-item">
                    <Check size={16} className="check-icon" />
                    <div>
                        <strong>Budget estimé de l'entreprise :</strong>
                        <span>{formatCurrency(data.company_budget_estimation)}</span>
                    </div>
                </div>
                <div className="preparation-item">
                    <Check size={16} className="check-icon" />
                    <div>
                        <strong>Votre cible :</strong>
                        <span>{formatCurrency(data.target_salary)}</span>
                    </div>
                </div>
                <div className="preparation-item">
                    <Check size={16} className="check-icon" />
                    <div>
                        <strong>Minimum acceptable :</strong>
                        <span>{formatCurrency(data.minimum_acceptable)}</span>
                    </div>
                </div>
                <div className="preparation-item">
                    <Check size={16} className="check-icon" />
                    <div>
                        <strong>Zone de rupture :</strong>
                        <span>&lt; {formatCurrency(data.walk_away_point)}</span>
                    </div>
                </div>
            </div>

            <h5>Vos 5 meilleurs arguments</h5>
            <ul className="arguments-list">
                {data.top_arguments.map((arg, index) => (
                    <li key={index}>{arg}</li>
                ))}
            </ul>
        </div>
    );
};

export default NegotiationPreparation;
