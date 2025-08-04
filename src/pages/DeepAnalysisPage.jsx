// src/pages/DeepAnalysisPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useAnalysisEngine } from '../hooks/useAnalysisEngine';
import CorrectScorePanel from '../components/CorrectScorePanel.jsx';
import FixtureErrorCard from '../components/FixtureErrorCard.jsx';
import PowerScoreCard from '../components/PowerScoreCard.jsx';
import MarketOpportunityCard from '../components/MarketOpportunityCard.jsx';
import GreenAnalysisCard from '../components/GreenAnalysisCard.jsx';
import HighProbabilityCard from '../components/HighProbabilityCard.jsx';

const CURRENT_SEASON = new Date().getFullYear();

export default function DeepAnalysisPage({ onRegisterBet }) {
    const { loading, error: engineError, apiFetch, runFullAnalysis, fetchLeagueContext } = useAnalysisEngine();

    const [leagues, setLeagues] = useState([]);
    const [fixtures, setFixtures] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [selectedFixtureId, setSelectedFixtureId] = useState('');
    const [analysisResult, setAnalysisResult] = useState(null);

    const handleRegister = (bet) => {
        if (!bet) {
            console.error("Tentativa de registar uma aposta indefinida.");
            return;
        }
        onRegisterBet({
            fixtureId: parseInt(selectedFixtureId),
            fixture: analysisResult?.fixtureName || "Jogo Desconhecido",
            market: bet.market,
            outcome: bet.outcome,
            odd: bet.odd,
            stake: (bet.kellyStake || 0.01) * 100,
        });
    };

    const fetchLeagues = useCallback(async () => {
        const data = await apiFetch(`v3/leagues?season=${CURRENT_SEASON}`);
        if (data) {
            const sortedLeagues = data.sort((a, b) => a.country.name.localeCompare(b.country.name) || a.league.name.localeCompare(b.name));
            setLeagues(sortedLeagues);
        }
    }, [apiFetch]);

    useEffect(() => {
        fetchLeagues();
    }, [fetchLeagues]);

    useEffect(() => {
        const fetchFixtures = async () => {
            if (selectedLeague) {
                setFixtures([]);
                setSelectedFixtureId('');
                setAnalysisResult(null);
                const data = await apiFetch(`v3/fixtures?league=${selectedLeague}&season=${CURRENT_SEASON}&status=NS`);
                if (data) setFixtures(data);
            }
        };
        fetchFixtures();
    }, [selectedLeague, apiFetch]);

    const handleAnalyzeClick = async () => {
        if (selectedFixtureId) {
            setAnalysisResult(null);
            const fixture = fixtures.find(f => f.fixture.id.toString() === selectedFixtureId);
            if (fixture) {
                const leagueContext = await fetchLeagueContext(fixture.league.id);
                const result = await runFullAnalysis(fixture, leagueContext);
                setAnalysisResult(result);
            }
        }
    };
    
    const valuableBets = analysisResult?.valuableBets || [];
    
    const marketsWithValue = valuableBets.reduce((acc, bet) => {
        const marketName = bet.market;
        if (!acc[marketName]) {
            acc[marketName] = {};
        }
        acc[marketName][bet.outcome] = bet;
        return acc;
    }, {});

    const highProbValuableBets = valuableBets.filter(bet => bet.prob > 0.55);
    
    const greenBetAnalysis = {
        bestBet: [...highProbValuableBets].sort((a, b) => b.value - a.value)[0], 
        secondBestBet: [...highProbValuableBets].sort((a, b) => b.value - a.value)[1] || null
    };

    const highProbAnalysisData = {
        bestBet: [...valuableBets].sort((a,b) => b.prob - a.prob)[0], 
        justification: "Resultado com a maior probabilidade estatística calculada pelo modelo Power Score."
    };

    return (
        <div className="max-w-7xl mx-auto">
            <header className="text-center mb-8">
                <h1 className="text-4xl font-bold text-emerald-400">🔍 Análise Profunda</h1>
                <p className="text-gray-400 mt-2">Selecione um jogo para uma análise detalhada com o motor "Power Score".</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-lg self-start">
                    <h2 className="text-2xl font-bold text-white mb-4">Selecionar Jogo</h2>
                    <div className="space-y-4">
                        <select 
                            value={selectedLeague} 
                            onChange={(e) => setSelectedLeague(e.target.value)} 
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-3"
                        >
                            <option value="">Selecione uma Liga</option>
                            {leagues.map(l => (
                                <option key={l.league.id} value={l.league.id}>{l.country.name} - {l.league.name}</option>
                            ))}
                        </select>
                        <select 
                            value={selectedFixtureId}
                            onChange={(e) => setSelectedFixtureId(e.target.value)}
                            disabled={!selectedLeague || fixtures.length === 0}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-3 disabled:opacity-50"
                        >
                            <option value="">Selecione um Jogo</option>
                            {fixtures.map(f => (
                                <option key={f.fixture.id} value={f.fixture.id}>{f.teams.home.name} vs {f.teams.away.name}</option>
                            ))}
                        </select>
                         <button 
                            onClick={handleAnalyzeClick}
                            disabled={!selectedFixtureId || loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
                        >
                            {loading ? 'A Analisar...' : 'Analisar Jogo Selecionado'}
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    {loading && <p className="text-center text-emerald-400">A analisar...</p>}
                    {!loading && !analysisResult && (
                         <div className="text-center bg-gray-800 p-16 rounded-lg">
                            <p className="text-gray-500">Selecione um jogo e clique em "Analisar" para ver os resultados.</p>
                        </div>
                    )}

                    {analysisResult && (
                        <div className="space-y-6">
                            {analysisResult.error && <FixtureErrorCard fixtureName={analysisResult.fixtureName} error={analysisResult.error} />}
                            
                            {!analysisResult.error && (
                                <>
                                    {/* <PowerScoreCard analysisResult={analysisResult} /> */}
                                    <CorrectScorePanel analysisResults={[analysisResult]} />
                                    <GreenAnalysisCard analysis={greenBetAnalysis} onRegister={() => handleRegister(greenBetAnalysis.bestBet)} />
                                    <HighProbabilityCard analysis={highProbAnalysisData} onRegister={() => handleRegister(highProbAnalysisData.bestBet)} />
                                    
                                    {Object.entries(marketsWithValue).map(([market, outcomes]) => (
                                        <MarketOpportunityCard
                                            key={market}
                                            marketTitle={market}
                                            outcomes={outcomes}
                                            onRegister={(betData) => handleRegister(betData)}
                                        />
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}