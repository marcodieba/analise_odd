import React, { useState, useEffect } from 'react';
import { poisson } from '../utils/math.js';
import { getCache, setCache } from '../utils/cache.js';
import PredictionGauge from '../components/PredictionGauge.jsx';
import AnalysisFactor from '../components/AnalysisFactor.jsx';
import LineupAnalysisCard from '../components/LineupAnalysisCard.jsx';

// --- Constantes da API ---
const API_HOST = 'api-football-v1.p.rapidapi.com';
const CURRENT_SEASON = new Date().getFullYear();
const PREVIOUS_SEASON = CURRENT_SEASON - 1;

export default function AdvancedAnalysisPage() {
    const apiKey = import.meta.env.VITE_API_FOOTBALL_KEY;
    const gnewsApiKey = import.meta.env.VITE_GNEWS_KEY;

    const [leagues, setLeagues] = useState([]);
    const [fixtures, setFixtures] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [selectedFixtureId, setSelectedFixtureId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // --- Estados para os dados da Análise ---
    const [prediction, setPrediction] = useState(null);
    const [factors, setFactors] = useState(null);
    const [contextData, setContextData] = useState(null);

    // --- Efeitos ---
    useEffect(() => {
        if (apiKey) fetchLeagues();
    }, [apiKey]);

    useEffect(() => {
        if (selectedLeague) {
            setFixtures([]);
            setSelectedFixtureId('');
            resetAnalysisState();
            fetchFixtures(selectedLeague);
        }
    }, [selectedLeague]);
    
    useEffect(() => {
        if (selectedFixtureId) {
            const fixture = fixtures.find(f => f.fixture.id.toString() === selectedFixtureId);
            if (fixture) {
                resetAnalysisState();
                runFullAnalysis(fixture);
            }
        }
    }, [selectedFixtureId]);

    const resetAnalysisState = () => {
        setPrediction(null);
        setFactors(null);
        setContextData(null);
        setError('');
    };

    // --- Funções de Fetch com Cache ---
    const apiFetch = async (endpoint) => {
        const cacheKey = endpoint;
        const cachedData = await getCache(cacheKey);
        if (cachedData) return cachedData;

        setLoading(true);
        try {
            const response = await fetch(`https://${API_HOST}/${endpoint}`, {
                method: 'GET',
                headers: { 'x-rapidapi-host': API_HOST, 'x-rapidapi-key': apiKey },
            });
            const data = await response.json();
            if (data.errors && Object.keys(data.errors).length > 0) throw new Error(JSON.stringify(data.errors));
            const responseData = data.response || [];
            await setCache(cacheKey, responseData);
            return responseData;
        } catch (err) {
            setError(`Erro na API: ${err.message}`);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const fetchLeagues = async () => {
        const data = await apiFetch(`v3/leagues?season=${CURRENT_SEASON}`);
        if (data) {
            const sortedLeagues = data.sort((a, b) => a.country.name.localeCompare(b.country.name) || a.league.name.localeCompare(b.league.name));
            setLeagues(sortedLeagues);
        }
    };

    const fetchFixtures = async (leagueId) => {
        const data = await apiFetch(`v3/fixtures?league=${leagueId}&season=${CURRENT_SEASON}&status=NS`);
        if (data) setFixtures(data);
    };

    // --- Motor de Análise ---
    const runFullAnalysis = async (fixture) => {
        const { teams, league } = fixture;
        const homeId = teams.home.id;
        const awayId = teams.away.id;

        // 1. Coleta de todos os dados brutos
        const [
            homeStatsData, awayStatsData, h2hData, 
            homeMomentumData, awayMomentumData, 
            lineupData, injuryData, homeNews, awayNews
        ] = await Promise.all([
            apiFetch(`v3/teams/statistics?season=${CURRENT_SEASON}&team=${homeId}&league=${league.id}`),
            apiFetch(`v3/teams/statistics?season=${CURRENT_SEASON}&team=${awayId}&league=${league.id}`),
            apiFetch(`v3/fixtures/headtohead?h2h=${homeId}-${awayId}&last=5`),
            apiFetch(`v3/fixtures?team=${homeId}&last=5&league=${league.id}`),
            apiFetch(`v3/fixtures?team=${awayId}&last=5&league=${league.id}`),
            apiFetch(`v3/fixtures/lineups?fixture=${fixture.fixture.id}`),
            apiFetch(`v3/injuries?fixture=${fixture.fixture.id}`),
            fetchNews(teams.home.name),
            fetchNews(teams.away.name)
        ]);
        
        setContextData({
            lineups: lineupData || [],
            injuries: injuryData || [],
            teamNames: { home: teams.home, away: teams.away }
        });

        // 2. Processamento e cálculo dos fatores
        const homeStats = processStats(homeStatsData[0], 'home');
        const awayStats = processStats(awayStatsData[0], 'away');
        const momentum = processMomentum(homeMomentumData, awayMomentumData, homeId, awayId);
        const h2hFactor = processH2H(h2hData, homeId);
        const homeSentiment = await analyzeSentiment(homeNews, teams.home.name);
        const awaySentiment = await analyzeSentiment(awayNews, teams.away.name);

        // 3. Cálculo do Power Score
        const homePowerScore = (homeStats.offensiveStrength * 1.2) + 
                               (awayStats.defensiveStrength * 0.8) + 
                               (momentum.home.points * 0.1) + 
                               (h2hFactor.home * 0.5) +
                               (homeSentiment.score * 0.2);

        const awayPowerScore = (awayStats.offensiveStrength * 1.2) + 
                               (homeStats.defensiveStrength * 0.8) + 
                               (momentum.away.points * 0.1) +
                               (h2hFactor.away * 0.5) +
                               (awaySentiment.score * 0.2);
        
        // 4. Geração da Previsão Final
        generatePrediction({home: teams.home, away: teams.away}, homePowerScore, awayPowerScore, {homeStats, awayStats, momentum, h2hFactor, homeSentiment, awaySentiment});
    };

    const processStats = (teamData, location) => {
        if (!teamData || !teamData.fixtures || teamData.fixtures.played.total === 0) {
            return { offensiveStrength: 1, defensiveStrength: 1 };
        }
        const played = teamData.fixtures.played.total;
        const goalsFor = (teamData.goals.for.total.total / played);
        const goalsAgainst = (teamData.goals.against.total.total / played);
        const shotsOnGoal = ((teamData.shots.on || 0) / played);

        const offensiveStrength = (goalsFor * 0.7) + (shotsOnGoal * 0.3);
        const defensiveStrength = 1 / (goalsAgainst * 0.7 + ((teamData.goals.against.total.total / (teamData.shots.on || 1)) * 0.3) || 1);
        
        return { offensiveStrength, defensiveStrength };
    };
    
    const processMomentum = (homeFixtures, awayFixtures, homeId, awayId) => {
        const getMomentum = (fixtures, teamId) => {
            let points = 0;
            fixtures.forEach(f => {
                const isWinner = (f.teams.home.id === teamId && f.teams.home.winner) || (f.teams.away.id === teamId && f.teams.away.winner);
                if (isWinner) points += 3;
                else if (f.teams.home.winner === null) points += 1;
            });
            return { points, signal: points >= 9 ? 'Alta' : points <= 4 ? 'Baixa' : 'Média' };
        };
        return { home: getMomentum(homeFixtures, homeId), away: getMomentum(awayFixtures, awayId) };
    };

    const processH2H = (h2hFixtures, homeId) => {
        if (!h2hFixtures || h2hFixtures.length === 0) return { home: 0, away: 0, draw: 0, signal: 'Neutro' };
        const wins = h2hFixtures.reduce((acc, f) => {
            if (f.teams.home.id === homeId && f.teams.home.winner) acc.home++;
            else if (f.teams.away.id === homeId && f.teams.away.winner) acc.home++;
            else if (f.teams.home.winner === null) acc.draw++;
            else acc.away++;
            return acc;
        }, { home: 0, away: 0, draw: 0 });
        
        let signal = 'Equilibrado';
        if (wins.home > wins.away + 1) signal = 'Vantagem Casa';
        if (wins.away > wins.home + 1) signal = 'Vantagem Visitante';

        return { ...wins, signal };
    };
    
    const fetchNews = async (teamName) => {
        if (!gnewsApiKey) return null;
        try {
            const response = await fetch(`https://gnews.io/api/v4/search?q="${teamName}"&lang=pt&max=5&token=${gnewsApiKey}`);
            const data = await response.json();
            return data.articles;
        } catch (err) { return null; }
    };

    const analyzeSentiment = async (news, teamName) => {
        if (!news || news.length === 0) return { score: 0, signal: 'Neutra' };
        const titles = news.map(article => article.title).join('\n');
        const prompt = `Analise o sentimento geral destes títulos sobre a equipa "${teamName}" e retorne um JSON com "score" de -2 (muito negativo) a +2 (muito positivo). Formato: {"score": <numero>}`;
        try {
            const payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
            const geminiApiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) return { score: 0, signal: 'Neutra' };
            const result = await response.json();
            const score = JSON.parse(result.candidates[0].content.parts[0].text).score;
            const signal = score > 0 ? 'Positiva' : score < 0 ? 'Negativa' : 'Neutra';
            return { score, signal };
        } catch (err) { return { score: 0, signal: 'Neutra' }; }
    };

    const generatePrediction = (teams, homePower, awayPower, analysisFactors) => {
        const homeLambda = Math.max(0.1, homePower / 10);
        const awayLambda = Math.max(0.1, awayPower / 10);

        let homeWinProb = 0, drawProb = 0, awayWinProb = 0;
        for (let i = 0; i <= 6; i++) {
            for (let j = 0; j <= 6; j++) {
                const scoreProb = poisson(homeLambda, i) * poisson(awayLambda, j);
                if (i > j) homeWinProb += scoreProb;
                else if (i === j) drawProb += scoreProb;
                else awayWinProb += scoreProb;
            }
        }
        const totalProb = homeWinProb + drawProb + awayWinProb;
        homeWinProb /= totalProb; drawProb /= totalProb; awayWinProb /= totalProb;

        let outcome = '', probability = 0;
        if (homeWinProb > drawProb && homeWinProb > awayWinProb) {
            outcome = `Vitória ${teams.home.name}`;
            probability = homeWinProb;
        } else if (awayWinProb > homeWinProb && awayWinProb > drawProb) {
            outcome = `Vitória ${teams.away.name}`;
            probability = awayWinProb;
        } else {
            outcome = 'Empate';
            probability = drawProb;
        }

        let confidenceScore = 1;
        if (outcome.includes(teams.home.name) && analysisFactors.momentum.home.signal === 'Alta') confidenceScore++;
        if (outcome.includes(teams.away.name) && analysisFactors.momentum.away.signal === 'Alta') confidenceScore++;
        if (analysisFactors.h2hFactor.signal === 'Vantagem Casa' && outcome.includes(teams.home.name)) confidenceScore++;
        if (analysisFactors.h2hFactor.signal === 'Vantagem Visitante' && outcome.includes(teams.away.name)) confidenceScore++;
        if (analysisFactors.homeSentiment.score > 0 && outcome.includes(teams.home.name)) confidenceScore++;
        if (analysisFactors.awaySentiment.score > 0 && outcome.includes(teams.away.name)) confidenceScore++;

        let confidence = 'Baixa';
        if (confidenceScore >= 3) confidence = 'Alta';
        else if (confidenceScore >= 2) confidence = 'Média';

        setPrediction({ outcome, probability: (probability * 100).toFixed(1), confidence });
        setFactors(analysisFactors);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <header className="text-center mb-8">
                <h1 className="text-4xl font-bold text-emerald-400">Centro de Análise Avançada</h1>
                <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
                    Compare estatísticas avançadas e veja a previsão do nosso modelo para cada jogo.
                </p>
            </header>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="league-select" className="block mb-2 text-sm font-medium text-gray-300">Selecione a Competição</label>
                        <select 
                            id="league-select" 
                            value={selectedLeague}
                            onChange={(e) => setSelectedLeague(e.target.value)}
                            disabled={!apiKey || leagues.length === 0}
                            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full p-2.5 disabled:opacity-50"
                        >
                            <option value="">-- Escolha uma competição --</option>
                            {leagues.map(l => (
                                <option key={l.league.id} value={l.league.id}>{l.country.name} - {l.league.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="fixture-select" className="block mb-2 text-sm font-medium text-gray-300">Selecione o Jogo</label>
                        <select 
                            id="fixture-select" 
                            value={selectedFixtureId}
                            onChange={(e) => setSelectedFixtureId(e.target.value)}
                            disabled={!selectedLeague || fixtures.length === 0}
                            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full p-2.5 disabled:opacity-50"
                        >
                            <option value="">-- Escolha um jogo --</option>
                            {fixtures.map(f => (
                                <option key={f.fixture.id} value={f.fixture.id}>{f.teams.home.name} vs {f.teams.away.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loading && <p className="text-center text-lg text-emerald-400">A processar análise avançada...</p>}
            {error && <div className="bg-yellow-500/20 text-yellow-400 p-3 rounded-md mb-8">{error}</div>}

            {!loading && selectedFixtureId && (
                <div className="space-y-6">
                    <PredictionGauge prediction={prediction} />
                    
                    {factors && (
                        <div className="bg-gray-800 p-4 rounded-lg">
                             <h3 className="text-lg font-bold text-white mb-3 text-center">Fatores da Análise</h3>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <AnalysisFactor title="Ataque" homeValue={factors.homeStats.offensiveStrength} awayValue={factors.awayStats.offensiveStrength} />
                                <AnalysisFactor title="Defesa" homeValue={factors.homeStats.defensiveStrength} awayValue={factors.awayStats.defensiveStrength} higherIsBetter={false} />
                                <AnalysisFactor title="Forma" homeValue={factors.momentum.home.points} awayValue={factors.momentum.away.points} />
                                <AnalysisFactor title="Moral" homeValue={factors.homeSentiment.score} awayValue={factors.awaySentiment.score} />
                             </div>
                        </div>
                    )}

                    {contextData && <LineupAnalysisCard lineups={contextData.lineups} injuries={contextData.injuries} teamNames={contextData.teamNames} />}
                </div>
            )}
        </div>
    );
}
