import React from 'react';

interface MarketData {
    company: string;
    synthesis?: {
        overview: string;
        culture: string;
        challenges: string;
        advice: string[];
    };
    key_data?: { label: string; value: string }[];
    company_report?: {
        identity_dna: string;
        financial_health: string;
        usp: string;
        culture_environment: string;
        team_structure: string;
        hot_news: string;
    };
    market_report?: {
        tension_score: number;
        tension_index: string;
        salary_barometer: string;
        competitive_landscape: string;
        trends: string;
        recruitment_dynamics: string;
        top_skills?: { hard: string[], soft: string[] };
    };
    sources: string[];
}

interface Props {
    data: MarketData;
    onBack: () => void;
}

export default function MarketReport({ data, onBack }: Props) {
    const handlePrintFull = () => window.print();
    
    const handlePrintTable = () => {
        const style = document.createElement('style');
        style.innerHTML = `
            @media print {
                body * { visibility: hidden; }
                .market-table-container, .market-table-container * { visibility: visible; }
                .market-table-container { position: absolute; left: 0; top: 0; width: 100%; }
                .no-print { display: none; }
            }
        `;
        document.head.appendChild(style);
        window.print();
        document.head.removeChild(style);
    };

    return (
        <div className="dashboard-container" style={{ maxWidth: "1000px", width: "100%" }}>
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <button onClick={onBack} className="btn-secondary">← Back</button>
                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={handlePrintTable} className="btn-secondary">🖨️ Table Only</button>
                    <button onClick={handlePrintFull} className="btn-primary">🖨️ Full Report</button>
                </div>
            </div>

            <div className="report-content">
                <h1 style={{ textAlign: "center", color: "var(--primary)" }}>Market Research: {data.company}</h1>
                
                <div className="card" style={{ marginBottom: 20, padding: 30 }}>
                    <h2>Synthèse Entreprise</h2>
                    <div style={{ marginBottom: 20 }}>
                        <h3>🏢 Vue d'ensemble</h3>
                        <p>{data.company_report?.identity_dna || data.synthesis?.overview}</p>
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        <h3>🤝 Culture & Valeurs</h3>
                        <p>{data.company_report?.culture_environment || data.synthesis?.culture}</p>
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        <h3>⚠️ Enjeux & Challenges</h3>
                        <p>{data.company_report?.usp || data.synthesis?.challenges}</p>
                    </div>
                    <div>
                        <h3>💡 Conseils & Infos</h3>
                        {data.synthesis?.advice ? (
                            <ul>
                                {data.synthesis.advice.map((tip, i) => <li key={i}>{tip}</li>)}
                            </ul>
                        ) : data.company_report ? (
                            <ul>
                                {data.company_report.team_structure && <li><strong>Équipes :</strong> {data.company_report.team_structure}</li>}
                                {data.company_report.hot_news && <li><strong>Actu :</strong> {data.company_report.hot_news}</li>}
                            </ul>
                        ) : null}
                    </div>
                </div>

                <div className="market-table-container card" style={{ padding: 30 }}>
                    {data.key_data ? (
                        <>
                        <h2 style={{ textAlign: "center", marginBottom: 20 }}>Fiche d'Identité</h2>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody>
                                {data.key_data.map((row, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                        <td style={{ padding: "12px", fontWeight: "bold", color: "var(--text-muted)", width: "40%" }}>{row.label}</td>
                                        <td style={{ padding: "12px" }}>{row.value}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </>
                    ) : data.market_report ? (
                        <>
                        <h2 style={{ textAlign: "center", marginBottom: 20 }}>Rapport Marché</h2>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody>
                                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                                    <td style={{ padding: "12px", fontWeight: "bold", color: "var(--text-muted)", width: "40%" }}>Tension du marché</td>
                                    <td style={{ padding: "12px" }}>{data.market_report.tension_index} ({data.market_report.tension_score}/100)</td>
                                </tr>
                                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                                    <td style={{ padding: "12px", fontWeight: "bold", color: "var(--text-muted)", width: "40%" }}>Dynamique de recrutement</td>
                                    <td style={{ padding: "12px" }}>{data.market_report.recruitment_dynamics}</td>
                                </tr>
                                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                                    <td style={{ padding: "12px", fontWeight: "bold", color: "var(--text-muted)", width: "40%" }}>Baromètre des salaires</td>
                                    <td style={{ padding: "12px" }}>{data.market_report.salary_barometer}</td>
                                </tr>
                            </tbody>
                        </table>
                        </>
                    ) : null}
                </div>

                <div className="card" style={{ marginTop: 20, padding: 20, background: "var(--bg-secondary)" }}>
                    <h3 style={{ fontSize: "16px", marginBottom: 10, color: "var(--text-muted)" }}>📚 Sources consultées (Sélection par IA)</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {data.sources && data.sources.map((source, i) => (
                            <span key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", color: "var(--text-main)" }}>{source}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}