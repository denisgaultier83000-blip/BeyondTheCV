
import React, { useState, useEffect } from 'react';
import '../styles/SalaryNegotiator.css';
import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';
import { useDashboard } from '../hooks/DashboardContext';
import { DollarSign, Loader2 } from 'lucide-react';

import NegotiationBriefing from './NegotiationBriefing';
import StrategicView from './StrategicView';
import NegotiationPreparation from './NegotiationPreparation';
import TacticalCards from './TacticalCards';
import NegotiationSimulation from './NegotiationSimulation';

const SalaryNegotiatorV2 = () => {
    const { cvData } = useDashboard();
    const [loading, setLoading] = useState(true);
    const [preparationData, setPreparationData] = useState(null);
    const [tacticalCards, setTacticalCards] = useState(null);
    const [briefing, setBriefing] = useState(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!cvData) return;
            try {
                setLoading(true);
                const [prepRes, tacticalRes, briefingRes] = await Promise.all([
                    authenticatedFetch(`${API_BASE_URL}/negotiation/preparation`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ job_title: cvData.job_title, experience_years: cvData.experience_years, skills: cvData.skills })
                    }),
                    authenticatedFetch(`${API_BASE_URL}/negotiation/tactical-cards`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ job_title: cvData.job_title, experience_years: cvData.experience_years, skills: cvData.skills })
                    }),
                    authenticatedFetch(`${API_BASE_URL}/negotiation/briefing`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ job_title: cvData.job_title, experience_years: cvData.experience_years, skills: cvData.skills })
                    })
                ]);

                if (!prepRes.ok || !tacticalRes.ok || !briefingRes.ok) {
                    throw new Error('Failed to fetch negotiation data');
                }

                const prepData = await prepRes.json();
                const tacticalData = await tacticalRes.json();
                const briefingData = await briefingRes.json();

                setPreparationData(prepData);
                setTacticalCards(tacticalData);
                setBriefing(briefingData);
            } catch (err: any) {
                setError(err.message || 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [cvData]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
                <Loader2 className="animate-spin" size={32} />
                <p style={{ marginLeft: '1rem' }}>Loading negotiation strategy...</p>
            </div>
        );
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className="salary-negotiator-v2">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
                <DollarSign size={24} /> Négociation Salariale Stratégique
            </h3>

            <NegotiationBriefing data={briefing} />
            <StrategicView preparationData={preparationData} expectations={cvData.salary_expectations} />
            <NegotiationPreparation data={preparationData} />
            <TacticalCards data={tacticalCards} />
            <NegotiationSimulation preparationData={preparationData} />
            
        </div>
    );
};

export default SalaryNegotiatorV2;
