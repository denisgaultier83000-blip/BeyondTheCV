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
        overview?: string;
        identity_dna: string;
        key_figures?: string;
        leadership?: string;
        financial_health: string;
        usp: string;
        key_challenges?: string[];
        business_segments?: string[];
        current_dynamics?: string[];
        client_types?: string[];
        culture_environment: string;
        team_structure: string;
        hot_news?: string;
        news_links?: { title: string; url: string; source?: string; strategic_analysis?: string }[];
    };
    market_report?: {
        tension_score: number;
        tension_index: string;
        salary_barometer: string;
        competitive_landscape: string;
        trends: string;
        major_disruptions?: string;
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
                        <p>{data.company_report?.overview || data.company_report?.identity_dna || data.synthesis?.overview}</p>
                        {(data.company_report?.key_figures && data.company_report.key_figures !== "Non spécifié.") && (
                            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}><strong>Chiffres clés :</strong> {data.company_report.key_figures}</p>
                        )}
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        <h3>🧩 Activités & Clients</h3>
                        <p><strong>Segments :</strong> {data.company_report?.business_segments?.join(', ')}</p>
                        <p><strong>Clients :</strong> {data.company_report?.client_types?.join(', ')}</p>
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        <h3>🤝 Culture & Valeurs</h3>
                        <p>{data.company_report?.culture_environment || data.synthesis?.culture}</p>
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        <h3>⚠️ Enjeux & Challenges</h3>
                        <p>{data.company_report?.key_challenges?.join('\n') || data.company_report?.usp || data.synthesis?.challenges}</p>
                        {(data.company_report?.leadership && data.company_report.leadership !== "Non spécifié.") && (
                            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}><strong>Leadership :</strong> {data.company_report.leadership}</p>
                        )}
                        <p><strong>Dynamique :</strong> {data.company_report?.current_dynamics?.join(', ')}</p>
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

                        {data.company_report?.news_links && data.company_report.news_links.length > 0 && (
                            <div style={{ marginTop: '1.5rem' }}>
                                <h4 style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📰 Actualités & Leviers Stratégiques</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {data.company_report.news_links.map((link: any, i: number) => {
                                        const urlStr = link.url || '#';
                                        const isDummyUrl = urlStr === '#';
                                        const fullUrl = isDummyUrl ? '#' : (urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
                                        return (
                                            <div key={i} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }} onClick={(e) => e.stopPropagation()}>
                                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                    {!isDummyUrl ? (
                                                        <>
                                                            <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(fullUrl)}&sz=16`} alt="source" style={{ width: '16px', height: '16px', marginRight: '8px', borderRadius: '2px', flexShrink: 0 }} />
                                                            <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: 'var(--text-main)', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>{link.title}</a>
                                                        </>
                                                    ) : (
                                                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>💡 {link.title}</span>
                                                    )}
                                                </div>
                                                {link.strategic_analysis && (
                                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem', marginTop: '0.75rem', fontStyle: 'italic', lineHeight: 1.5 }}>
                                                        <strong style={{ color: 'var(--primary)', fontStyle: 'normal' }}>Conseil Stratégique :</strong> {link.strategic_analysis}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
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
                                {(data.market_report.major_disruptions && data.market_report.major_disruptions !== "Non spécifié.") && (
                                <tr style={{ borderBottom: "1px solid var(--border-color)", background: "rgba(239, 68, 68, 0.05)" }}>
                                    <td style={{ padding: "12px", fontWeight: "bold", color: "var(--danger-text)", width: "40%" }}>Perturbations Majeures (Risques)</td>
                                    <td style={{ padding: "12px", color: "var(--danger-text)" }}>{data.market_report.major_disruptions}</td>
                                </tr>
                                )}
                                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                                    <td style={{ padding: "12px", fontWeight: "bold", color: "var(--text-muted)", width: "40%" }}>Baromètre des salaires</td>
                                    <td style={{ padding: "12px" }}>{data.market_report.salary_barometer}</td>
                                </tr>
                                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                                    <td style={{ padding: "12px", fontWeight: "bold", color: "var(--text-muted)", width: "40%" }}>Paysage Concurrentiel</td>
                                    <td style={{ padding: "12px" }}>{data.market_report.competitive_landscape}</td>
                                </tr>
                                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                                    <td style={{ padding: "12px", fontWeight: "bold", color: "var(--text-muted)", width: "40%" }}>Tendances du marché</td>
                                    <td style={{ padding: "12px" }}>{data.market_report.trends}</td>
                                </tr>
                                {((data.market_report.top_skills?.hard && data.market_report.top_skills.hard.length > 0) || (data.market_report.top_skills?.soft && data.market_report.top_skills.soft.length > 0)) && (
                                    <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                                        <td style={{ padding: "12px", fontWeight: "bold", color: "var(--text-muted)", width: "40%" }}>Compétences prisées</td>
                                        <td style={{ padding: "12px" }}>
                                            <strong>Hard:</strong> {data.market_report.top_skills.hard?.join(', ') || 'N/A'}<br/>
                                            <strong>Soft:</strong> {data.market_report.top_skills.soft?.join(', ') || 'N/A'}
                                        </td>
                                    </tr>
                                )}
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