import React, { useState, useEffect } from 'react';
import { poisson, kellyCriterion } from '../utils/math.js';

// --- Constantes da API ---
const API_HOST = 'api-football-v1.p.rapidapi.com';
const CURRENT_SEASON = new Date().getFullYear();
const PREVIOUS_SEASON = CURRENT_SEASON - 1;
const BOOKMAKER_ID = 8; // ID para Bet365

// --- Componente da Tabela de Resultados ---
const HunterResultsTable = ({ results }) => {
    const confidenceConfig = {
        high: { icon: '🟢', text: 'Alta' },
        medium: { icon: '🟡', text: 'Média' },
        low: { icon: '🔴', text: 'Baixa' },
    };

    return (
        <div className="bg-gray-800 rounded-lg overflow-x-auto">
            <h2 className="text-2xl font-bold text-white p-6">Alertas Disparados</h2>
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-300 uppercase bg-gray-700">
                    <tr>
                        <th scope="col" className="px-6 py-3">Jogo</th>
                        <th scope="col" className="px-6 py-3">Aposta de Valor</th>
                        <th scope="col" className="px-6 py-3 text-center">Melhor Odd</th>
                        <th scope="col" className="px-6 py-3 text-center">EV</th>
                        <th scope="col" className="px-6 py-3">Alerta Correspondido</th>
                        <th scope="col" className="px-6 py-3 text-center">Confiança</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((res, index) => (
                        <tr key={index} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                            <th scope="row" className="px-6 py-4 font-medium text-white whitespace-nowrap">
                                {res.fixture}
                            </th>
                            <td className="px-6 py-4 font-bold text-white">{res.outcome}</td>
                            <td className="px-6 py-4 text-center font-mono text-white">{res.odd.toFixed(2)}</td>
                            <td className="px-6 py-4 text-center font-mono text-green-400">+{res.value.toFixed(2)}%</td>
                            <td className="px-6 py-4 font-medium text-emerald-300">{res.alertName}</td>
                            <td className="px-6 py-4 text-center text-2xl" title={`Confiança ${confidenceConfig[res.confidence]?.text}`}>
                                {confidenceConfig[res.confidence]?.icon || '⚪'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// --- Componente Principal da Página ---
export default function OddsHunterPage({ alerts }) {
    const apiKey = import.meta.env.VITE_API_FOOTBALL_KEY;
    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [error, setError] = useState('');
    const [leagueContext, setLeagueContext] = useState(null);

    useEffect(() => {
        if (apiKey) fetchLeagues();
    }, [apiKey]);

    useEffect(() => {
        if (selectedLeague) {
            fetchLeagueContext(selectedLeague);
        }
    }, [selectedLeague]);

    const apiFetch = async (endpoint) => {
        try {
            const response = await fetch(`https://${API_HOST}/${endpoint}`, {
                method: 'GET',
                headers: { 'x-rapidapi-host': API_HOST, 'x-rapidapi-key': apiKey },
            });
            const data = await response.json();
            if (data.errors && Object.keys(data.errors).length > 0) throw new Error(JSON.stringify(data.errors));
            if (data.results === 0) return [];
            return data.response;
        } catch (err) {
            console.error(`Erro na API para ${endpoint}:`, err);
            setError(`Erro na API. Verifique a sua chave e a consola.`);
            return null;
        }
    };

    const fetchLeagues = async () => {
        setLoading(true);
        const data = await apiFetch(`v3/leagues?season=${CURRENT_SEASON}`);
        if (data) {
            const sortedLeagues = data.sort((a, b) => {
                if (a.country.name < b.country.name) return -1;
                if (a.country.name > b.country.name) return 1;
                if (a.league.name < b.league.name) return -1;
                if (a.league.name > b.league.name) return 1;
                return 0;
            });
            setLeagues(sortedLeagues);
        }
        setLoading(false);
    };

    const fetchLeagueContext = async (leagueId) => {
        const leagueData = await apiFetch(`v3/leagues?id=${leagueId}&season=${PREVIOUS_SEASON}`);
        if (leagueData && leagueData.length > 0) {
            const seasonData = leagueData[0].seasons.find(s => s.year === PREVIOUS_SEASON);
            if (seasonData?.goals?.for?.average?.total && seasonData?.fixtures?.wins?.home) {
                const leagueAvgGoals = parseFloat(seasonData.goals.for.average.total);
                const homeWinPercentage = parseFloat(seasonData.fixtures.wins.home);
                const goalCoefficient = 1 + ((leagueAvgGoals - 2.7) * 0.1);
                const homeAdvantageCoefficient = 1 + ((homeWinPercentage - 45) * 0.005);
                setLeagueContext({
                    goal: Math.max(0.9, Math.min(1.1, goalCoefficient)),
                    home: Math.max(0.95, Math.min(1.05, homeAdvantageCoefficient)),
                });
                return;
            }
        }
        setLeagueContext({ goal: 1.0, home: 1.0 });
    };

    const fetchOdds = async (fixtureId) => {
        const data = await apiFetch(`v3/odds?fixture=${fixtureId}&bookmaker=${BOOKMAKER_ID}`);
        const newOdds = { '1X2': null, 'DoubleChance': null, 'OverUnder': null, 'BTTS': null };

        if (data && data.length > 0) {
            const bookmaker = data[0].bookmakers[0];
            const matchWinner = bookmaker.bets.find(b => b.id === 1);
            if (matchWinner) {
                newOdds['1X2'] = {
                    'Casa (1)': parseFloat(matchWinner.values.find(v => v.value === 'Home')?.odd),
                    'Empate (X)': parseFloat(matchWinner.values.find(v => v.value === 'Draw')?.odd),
                    'Visitante (2)': parseFloat(matchWinner.values.find(v => v.value === 'Away')?.odd)
                };
            }
            // Adicionar busca para outros mercados se necessário para os alertas
        }
        return newOdds;
    };

    const fetchStats = async (homeId, awayId, leagueId) => {
        const currentHomeStats = await apiFetch(`v3/teams/statistics?season=${CURRENT_SEASON}&team=${homeId}&league=${leagueId}`);
        const currentAwayStats = await apiFetch(`v3/teams/statistics?season=${CURRENT_SEASON}&team=${awayId}&league=${leagueId}`);
        if (!currentHomeStats || !currentAwayStats) return null;

        const gamesPlayed = currentHomeStats.fixtures.played.total;
        const calculateStrengths = (teamData, leagueAvgs, location) => {
            const goalsFor = teamData?.goals?.for?.average?.[location];
            const goalsAgainst = teamData?.goals?.against?.average?.[location];
            const leagueAvgFor = location === 'home' ? leagueAvgs.home : leagueAvgs.away;
            const leagueAvgAgainst = location === 'home' ? leagueAvgs.away : leagueAvgs.home;
            if (!goalsFor || !goalsAgainst || !leagueAvgFor || !leagueAvgAgainst) return { attack: 1, defenseRaw: 1 };
            const attack = parseFloat(goalsFor) / leagueAvgFor;
            const defenseRaw = parseFloat(goalsAgainst) / leagueAvgAgainst;
            return { attack, defenseRaw };
        };

        if (gamesPlayed >= 10) {
            const leagueData = await apiFetch(`v3/leagues?id=${leagueId}&season=${CURRENT_SEASON}`);
            const leagueAvgs = {
                home: parseFloat(leagueData?.[0]?.seasons?.[0]?.goals?.for?.average?.home ?? 1.4),
                away: parseFloat(leagueData?.[0]?.seasons?.[0]?.goals?.for?.average?.away ?? 1.1)
            };
            const homeS = calculateStrengths(currentHomeStats, leagueAvgs, 'home');
            const awayS = calculateStrengths(currentAwayStats, leagueAvgs, 'away');
            return { homeAttack: homeS.attack, homeDefense: 1 / homeS.defenseRaw, awayAttack: awayS.attack, awayDefense: 1 / awayS.defenseRaw, leagueHomeAvg: leagueAvgs.home, leagueAwayAvg: leagueAvgs.away };
        } else {
            const previousHomeStats = await apiFetch(`v3/teams/statistics?season=${PREVIOUS_SEASON}&team=${homeId}&league=${leagueId}`);
            const previousAwayStats = await apiFetch(`v3/teams/statistics?season=${PREVIOUS_SEASON}&team=${awayId}&league=${leagueId}`);
            if (!previousHomeStats || !previousAwayStats) {
                const leagueData = await apiFetch(`v3/leagues?id=${leagueId}&season=${CURRENT_SEASON}`);
                const leagueAvgs = { home: parseFloat(leagueData?.[0]?.seasons?.[0]?.goals?.for?.average?.home ?? 1.4), away: parseFloat(leagueData?.[0]?.seasons?.[0]?.goals?.for?.average?.away ?? 1.1) };
                const homeS = calculateStrengths(currentHomeStats, leagueAvgs, 'home');
                const awayS = calculateStrengths(currentAwayStats, leagueAvgs, 'away');
                return { homeAttack: homeS.attack, homeDefense: 1 / homeS.defenseRaw, awayAttack: awayS.attack, awayDefense: 1 / awayS.defenseRaw, leagueHomeAvg: leagueAvgs.home, leagueAwayAvg: leagueAvgs.away };
            } else {
                const prevLeagueData = await apiFetch(`v3/leagues?id=${leagueId}&season=${PREVIOUS_SEASON}`);
                const prevLeagueAvgs = { home: parseFloat(prevLeagueData?.[0]?.seasons?.[0]?.goals?.for?.average?.home ?? 1.4), away: parseFloat(prevLeagueData?.[0]?.seasons?.[0]?.goals?.for?.average?.away ?? 1.1) };
                const prevHomeS = calculateStrengths(previousHomeStats, prevLeagueAvgs, 'home');
                const prevAwayS = calculateStrengths(previousAwayStats, prevLeagueAvgs, 'away');
                const currentHomeS = calculateStrengths(currentHomeStats, prevLeagueAvgs, 'home');
                const currentAwayS = calculateStrengths(currentAwayStats, prevLeagueAvgs, 'away');
                const homeWeight = gamesPlayed > 0 ? 0.3 : 0;
                const prevWeight = 1 - homeWeight;
                const finalHomeAttack = (prevHomeS.attack * prevWeight) + (currentHomeS.attack * homeWeight);
                const finalHomeDefenseRaw = (prevHomeS.defenseRaw * prevWeight) + (currentHomeS.defenseRaw * homeWeight);
                const finalAwayAttack = (prevAwayS.attack * prevWeight) + (currentAwayS.attack * homeWeight);
                const finalAwayDefenseRaw = (prevAwayS.defenseRaw * prevWeight) + (currentAwayS.defenseRaw * homeWeight);
                return { homeAttack: finalHomeAttack, homeDefense: 1 / finalHomeDefenseRaw, awayAttack: finalAwayAttack, awayDefense: 1 / finalAwayDefenseRaw, leagueHomeAvg: prevLeagueAvgs.home, leagueAwayAvg: prevLeagueAvgs.away };
            }
        }
    };

    const calculateValue = (stats, odds) => {
        if (!stats || !odds || !odds['1X2'] || !leagueContext) return null;
        let homeExpectedGoals = (stats.homeAttack / stats.awayDefense) * stats.leagueHomeAvg;
        let awayExpectedGoals = (stats.awayAttack / stats.homeDefense) * stats.leagueAwayAvg;

        const coeffs = leagueContext;
        homeExpectedGoals *= coeffs.goal;
        awayExpectedGoals *= coeffs.goal;
        if (coeffs.home > 1.0) {
            homeExpectedGoals *= coeffs.home;
            awayExpectedGoals /= coeffs.home;
        }

        const maxGoals = 6;
        const homeGoalProbs = Array.from({ length: maxGoals + 1 }, (_, i) => poisson(homeExpectedGoals, i));
        const awayGoalProbs = Array.from({ length: maxGoals + 1 }, (_, i) => poisson(awayExpectedGoals, i));
        let homeWinProb = 0, drawProb = 0, awayWinProb = 0;
        for (let i = 0; i <= maxGoals; i++) {
            for (let j = 0; j <= maxGoals; j++) {
                const scoreProb = homeGoalProbs[i] * awayGoalProbs[j];
                if (i > j) homeWinProb += scoreProb;
                else if (i === j) drawProb += scoreProb;
                else awayWinProb += scoreProb;
            }
        }
        const totalProb = homeWinProb + drawProb + awayWinProb;
        const finalHomeProb = homeWinProb / totalProb;
        const finalDrawProb = drawProb / totalProb;
        const finalAwayProb = awayWinProb / totalProb;
        
        const allResults = {
            '1X2': {
                'Casa (1)': { prob: finalHomeProb, odd: odds['1X2']?.['Casa (1)'] },
                'Empate (X)': { prob: finalDrawProb, odd: odds['1X2']?.['Empate (X)'] },
                'Visitante (2)': { prob: finalAwayProb, odd: odds['1X2']?.['Visitante (2)'] }
            }
        };
        for (const market in allResults) {
            for (const outcome in allResults[market]) {
                const { prob, odd } = allResults[market][outcome];
                if (prob && odd) {
                    allResults[market][outcome].value = (odd / (1 / prob)) - 1;
                    allResults[market][outcome].kellyStake = kellyCriterion(odd, prob);
                }
            }
        }
        return allResults;
    };

    const checkAlerts = (bet, activeAlerts) => {
        for (const alert of activeAlerts) {
            let allRulesMatch = true;
            for (const rule of alert.ruleData) {
                if (bet.market !== rule.market || !bet.outcome.includes(rule.outcome.split(' ')[0])) {
                    allRulesMatch = false;
                    break;
                }
                const metricMap = {
                    'Odd': bet.odd,
                    'Valor (EV)': bet.value * 100,
                    'Kelly Stake': bet.kellyStake * 100,
                    'Probabilidade': bet.prob * 100,
                };
                const betValue = metricMap[rule.metric];
                
                if (betValue === undefined) { allRulesMatch = false; break; }

                let ruleMatches = false;
                switch (rule.operator) {
                    case '>': if (betValue > rule.value) ruleMatches = true; break;
                    case '<': if (betValue < rule.value) ruleMatches = true; break;
                    case '>=': if (betValue >= rule.value) ruleMatches = true; break;
                    case '<=': if (betValue <= rule.value) ruleMatches = true; break;
                    case '=': if (betValue === rule.value) ruleMatches = true; break;
                    default: break;
                }
                
                if (!ruleMatches) {
                    allRulesMatch = false;
                    break;
                }
            }
            if (allRulesMatch) {
                return alert.name;
            }
        }
        return null;
    };

    const handleHuntOdds = async () => {
        if (!selectedLeague) return;
        setLoading(true);
        setResults([]);
        setError('');

        const activeAlerts = alerts.filter(a => a.active);
        if (activeAlerts.length === 0) {
            setError("Não há alertas ativos. Por favor, crie e ative um alerta na página 'Alertas'.");
            setLoading(false);
            return;
        }

        const fixtures = await apiFetch(`v3/fixtures?league=${selectedLeague}&season=${CURRENT_SEASON}&status=NS`);
        if (!fixtures || fixtures.length === 0) {
            setError("Não foram encontrados jogos futuros para esta liga.");
            setLoading(false);
            return;
        }

        const analysisPromises = fixtures.map(fixture => analyzeSingleFixture(fixture));
        const allOpportunities = (await Promise.all(analysisPromises)).flat().filter(Boolean);

        const triggeredAlerts = [];
        allOpportunities.forEach(opp => {
            const alertName = checkAlerts(opp, activeAlerts);
            if (alertName) {
                triggeredAlerts.push({ ...opp, alertName });
            }
        });

        triggeredAlerts.sort((a, b) => b.value - a.value);
        setResults(triggeredAlerts);
        setLoading(false);
    };

    const analyzeSingleFixture = async (fixture) => {
        const { teams, league, fixture: { id: fixtureId } } = fixture;
        const homeId = teams.home.id;
        const awayId = teams.away.id;

        const [statsData, oddsData, h2hResults, homeMomentum, awayMomentum] = await Promise.all([
            fetchStats(homeId, awayId, league.id),
            fetchOdds(fixtureId),
            apiFetch(`v3/fixtures/headtohead?h2h=${homeId}-${awayId}&last=5`, false),
            apiFetch(`v3/fixtures?team=${homeId}&last=5&league=${league.id}`, false),
            apiFetch(`v3/fixtures?team=${awayId}&last=5&league=${league.id}`, false)
        ]);

        if (!statsData || !oddsData) return null;

        const calculatedResults = calculateValue(statsData, oddsData);
        if (!calculatedResults) return null;
        
        const opportunities = [];
        const market1X2 = calculatedResults['1X2'];
        if (market1X2) {
            for (const outcome in market1X2) {
                const data = market1X2[outcome];
                if (data.value > 0) {
                    let confidence = 'medium';
                    if (h2hResults && homeMomentum && awayMomentum) {
                        const h2hSignal = analyzeH2H(h2hResults, { '1X2': market1X2 });
                        const momentumData = analyzeMomentum(homeMomentum, awayMomentum, fixture);
                        
                        let confidenceScore = 0;
                        if (h2hSignal?.signal === 'confirm') confidenceScore++;
                        if (h2hSignal?.signal === 'alert') confidenceScore--;

                        const team = outcome.includes('Casa') ? 'home' : (outcome.includes('Visitante') ? 'away' : null);
                        if (team) {
                            if (momentumData?.[team]?.signal === 'high') confidenceScore++;
                            if (momentumData?.[team]?.signal === 'low') confidenceScore--;
                        }

                        if (confidenceScore > 0) confidence = 'high';
                        if (confidenceScore < 0) confidence = 'low';
                    }

                    opportunities.push({
                        fixture: `${teams.home.name} vs ${teams.away.name}`,
                        market: '1X2',
                        outcome: outcome,
                        confidence: confidence,
                        ...data
                    });
                }
            }
        }
        return opportunities;
    };

    const analyzeH2H = (h2hFixtures, calculatedResults) => {
        if (!h2hFixtures || h2hFixtures.length === 0) return { signal: 'neutral' };
        
        let bestBet = null;
        let maxEv = 0.01;
        const market1X2 = calculatedResults['1X2'];
        const valueHome = market1X2['Casa (1)']?.value;
        const valueDraw = market1X2['Empate (X)']?.value;
        const valueAway = market1X2['Visitante (2)']?.value;

        if (valueHome > maxEv) { maxEv = valueHome; bestBet = 'Home'; }
        if (valueDraw > maxEv) { maxEv = valueDraw; bestBet = 'Draw'; }
        if (valueAway > maxEv) { maxEv = valueAway; bestBet = 'Away'; }

        if (!bestBet) return { signal: 'neutral' };

        let winsForBet = 0;
        h2hFixtures.forEach(f => {
            const isDraw = f.teams.home.winner === null && f.teams.away.winner === null;
            if (bestBet === 'Home' && f.teams.home.winner) winsForBet++;
            if (bestBet === 'Away' && f.teams.away.winner) winsForBet++;
            if (bestBet === 'Draw' && isDraw) winsForBet++;
        });

        const winRatio = winsForBet / h2hFixtures.length;
        if (winRatio >= 0.6) return { signal: 'confirm' };
        if (winRatio <= 0.2) return { signal: 'alert' };
        return { signal: 'neutral' };
    };

    const analyzeMomentum = (homeFixtures, awayFixtures, fixture) => {
        const processFixtures = (fixtures, teamId) => {
            let points = 0;
            fixtures.forEach(f => {
                const isWinner = (f.teams.home.id === teamId && f.teams.home.winner) || (f.teams.away.id === teamId && f.teams.away.winner);
                const isDraw = f.teams.home.winner === null && f.teams.away.winner === null;
                if (isWinner) points += 3;
                if (isDraw) points += 1;
            });
            if (points >= 10) return { signal: 'high' };
            if (points <= 5) return { signal: 'low' };
            return { signal: 'stable' };
        };
        return {
            home: processFixtures(homeFixtures, fixture.teams.home.id),
            away: processFixtures(awayFixtures, fixture.teams.away.id)
        };
    };

    return (
        <div className="max-w-7xl mx-auto">
             <header className="text-center mb-8">
                <h1 className="text-4xl font-bold text-emerald-400">Caçador de Odds</h1>
                <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
                    Selecione uma liga para escanear todos os jogos futuros e encontrar as oportunidades que correspondem aos seus alertas ativos.
                </p>
            </header>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label htmlFor="league-select" className="block mb-2 text-sm font-medium text-gray-300">Selecione a Competição</label>
                        <select 
                            id="league-select" 
                            value={selectedLeague}
                            onChange={(e) => setSelectedLeague(e.target.value)}
                            disabled={!apiKey || apiKey === 'SUA_CHAVE_API_AQUI' || leagues.length === 0}
                            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full p-2.5 disabled:opacity-50"
                        >
                            <option value="">-- Escolha uma competição --</option>
                            {leagues.map(l => (
                                <option key={l.league.id} value={l.league.id}>{l.country.name} - {l.league.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <button 
                            onClick={handleHuntOdds}
                            disabled={!selectedLeague || loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'A Caçar...' : 'Caçar Conforme Meus Alertas'}
                        </button>
                    </div>
                </div>
            </div>

            {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-md mb-8">{error}</div>}
            
            {loading && <p className="text-center text-lg text-emerald-400">A analisar todos os jogos da liga, isto pode demorar um pouco...</p>}

            {!loading && results.length > 0 && <HunterResultsTable results={results} />}
            
            {!loading && results.length === 0 && !error && (
                <div className="text-center text-gray-500 py-16">
                    <p>Os alertas disparados pela sua caça aparecerão aqui.</p>
                </div>
            )}
        </div>
    );
}
