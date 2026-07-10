
import React from 'react';
import { ShieldCheck } from 'lucide-react';

const TacticalCards = ({ data }) => {
    if (!data) return null;

    return (
        <div className="negotiation-section">
            <h4>2. Cartes tactiques</h4>
            <p>Le recruteur risque de dire :</p>
            <div className="tactical-cards-grid">
                {data.recruiter_objections.map((objection, index) => (
                    <div key={index} className="tactical-card">
                        <ShieldCheck size={20} className="shield-icon" />
                        <span>{objection}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TacticalCards;
