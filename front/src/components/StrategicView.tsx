
import React from 'react';
import { Star } from 'lucide-react';

const StrategicView = ({ preparationData, expectations }) => {
    if (!preparationData || !expectations) return null;

    const { market_salary, company_budget_estimation } = preparationData;
    const expectationAmount = parseInt(expectations.replace(/\D/g, ''));

    const getPositionAnalysis = () => {
        if (expectationAmount > market_salary.max) {
            const percentageAbove = Math.round(((expectationAmount - market_salary.max) / market_salary.max) * 100);
            return {
                level: 'warning',
                message: `Vous êtes ${percentageAbove}% au-dessus du marché. Préparez des arguments solides.`
            };
        }
        if (expectationAmount >= market_salary.min && expectationAmount <= market_salary.max) {
            return {
                level: 'strong',
                message: 'Très forte probabilité d'accord'
            };
        }
        return {
            level: 'info',
            message: 'Votre demande est en dessous du marché.'
        };
    };

    const analysis = getPositionAnalysis();

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount).replace(/\s/g, '\u00A0');
    };

    const renderStars = () => {
        if (analysis.level === 'strong') {
            return Array(5).fill(0).map((_, i) => <Star key={i} size={18} className="star-filled" />);
        }
        return null;
    };

    return (
        <div className="strategic-view">
            <h4>Votre position</h4>
            <div className="positions">
                <div className="position-item">
                    <strong>Marché</strong>
                    <span>{formatCurrency(market_salary.min)}–{formatCurrency(market_salary.max)}</span>
                </div>
                <div className="position-item">
                    <strong>Entreprise</strong>
                    <span>{formatCurrency(company_budget_estimation - 5000)}–{formatCurrency(company_budget_estimation + 5000)}</span>
                </div>
                <div className="position-item">
                    <strong>Vous demandez</strong>
                    <span>{formatCurrency(expectationAmount)}</span>
                </div>
            </div>
            <div className={`analysis ${analysis.level}`}>
                <div className="stars">{renderStars()}</div>
                <p>{analysis.message}</p>
            </div>
        </div>
    );
};

export default StrategicView;
