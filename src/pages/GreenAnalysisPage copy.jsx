import React, { useState, useEffect } from 'react';
import { poisson, kellyCriterion } from '../utils/math.js';

// --- Constantes da API ---
const API_HOST = 'api-football-v1.p.rapidapi.com';
const CURRENT_SEASON = new Date().getFullYear();
const PREVIOUS_SEASON = CURRENT_SEASON - 1;
const BOOKMAKER_ID = 8; // ID para Bet365

// --- Componente da Tabela de Resultados ---
const GreenResultsTable = ({ results }) => (
    <div className="bg-gray-800 rounded-lg overflow-x-auto">
        <h2 className="text-2xl font-bold text-white p-6">Oportunidades "Green" Encontradas</h2>
        <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-300 uppercase bg-gray-700">
                <tr>
                    <th scope="col" className="px-6 py-3">Jogo</th>
                    <th scope="col" className="px-6 py-3">Aposta Mais Segura com Valor</th>
                    <th scope="col" className="px-6 py-3 text-center">Prob.</th>
                    <th scope="col" className="px-6 py-3 text-center">Odd</th>
                    <th scope="col" className="px-6 py-3 text-center">Valor (EV)</th>
                </tr>
            </thead>
            <tbody>
                {results.map((res, index) => (
                    <tr key={index} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                        <th scope="row" className="px-6 py-4 font-medium text-white whitespace-nowrap">
                            {res.fixtureName}
                        </th>
                        <td className="px-6 py-4 font-bold text-white">{res.bestBet.outcome}</td>
                        <td className="px-6 py-4 text-center font-mono text-emerald-300">{(res.bestBet.prob * 100).toFixed(1)}%</td>
                        <td className="px-6 py-4 text-center font-mono text-white">{res.bestBet.odd.toFixed(2)}</td>
                        <td className="px-6 py-4 text-center font-mono text-green-400">+{res.bestBet.value.toFixed(2)}%</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

// --- Componente Principal da Página ---
export default function GreenAnalysisPage() {
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
        const newOdds = { '1X2': null, 'DoubleChance': null, 'OverUnder': null, 'BTTS': null, 'Safety': {} };
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
            const doubleChance = bookmaker.bets.find(b => b.id === 12);
            if (doubleChance) {
                newOdds['DoubleChance'] = {
                    'Casa ou Empate (1X)': parseFloat(doubleChance.values.find(v => v.value === 'Home/Draw')?.odd),
                    'Empate ou Visitante (X2)': parseFloat(doubleChance.values.find(v => v.value === 'Draw/Away')?.odd),
                };
            }
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
        
        const prob1X = finalHomeProb + finalDrawProb;
        const probX2 = finalAwayProb + finalDrawProb;

        const allResults = {
            '1X2': {
                'Casa (1)': { prob: finalHomeProb, odd: odds['1X2']?.['Casa (1)'] },
                'Empate (X)': { prob: finalDrawProb, odd: odds['1X2']?.['Empate (X)'] },
                'Visitante (2)': { prob: finalAwayProb, odd: odds['1X2']?.['Visitante (2)'] }
            },
            'DoubleChance': {
                'Casa ou Empate (1X)': { prob: prob1X, odd: odds['DoubleChance']?.['Casa ou Empate (1X)'] },
                'Empate ou Visitante (X2)': { prob: probX2, odd: odds['DoubleChance']?.['Empate ou Visitante (X2)'] },
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

    const handleAnalyzeLeague = async () => {
        if (!selectedLeague) return;
        setLoading(true);
        setResults([]);
        setError('');

        const fixtures = await apiFetch(`v3/fixtures?league=${selectedLeague}&season=${CURRENT_SEASON}&status=NS`);
        if (!fixtures || fixtures.length === 0) {
            setError("Não foram encontrados jogos futuros para esta liga.");
            setLoading(false);
            return;
        }

        const analysisPromises = fixtures.map(fixture => analyzeSingleFixtureForGreen(fixture));
        const allGreenBets = (await Promise.all(analysisPromises)).filter(Boolean);

        allGreenBets.sort((a, b) => b.bestBet.prob - a.bestBet.prob);
        setResults(allGreenBets);
        setLoading(false);
    };

    const analyzeSingleFixtureForGreen = async (fixture) => {
        const { teams, league, fixture: { id: fixtureId } } = fixture;
        const homeId = teams.home.id;
        const awayId = teams.away.id;

        const [statsData, oddsData] = await Promise.all([
            fetchStats(homeId, awayId, league.id),
            fetchOdds(fixtureId)
        ]);

        if (!statsData || !oddsData) return null;

        const calculatedResults = calculateValue(statsData, oddsData);
        if (!calculatedResults) return null;
        
        let bestGreenBet = null;
        let highestProb = 0;

        const allBets = Object.entries(calculatedResults)
            .flatMap(([market, outcomes]) => 
                Object.entries(outcomes).map(([outcome, data]) => ({ market, outcome, ...data }))
            );

        allBets.forEach(bet => {
            if (bet.value > 0 && bet.prob > highestProb) {
                highestProb = bet.prob;
                bestGreenBet = bet;
            }
        });

        if (bestGreenBet) {
            return {
                fixtureName: `${teams.home.name} vs ${teams.away.name}`,
                bestBet: bestGreenBet
            };
        }
        return null;
    };

    return (
        <div className="max-w-7xl mx-auto">
             <header className="text-center mb-8">
                <h1 className="text-4xl font-bold text-emerald-400">Análise Green</h1>
                <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
                    Selecione uma liga para encontrar a aposta com a maior probabilidade de acerto (e com valor positivo) para cada jogo.
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
                            disabled={!apiKey || leagues.length === 0}
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
                            onClick={handleAnalyzeLeague}
                            disabled={!selectedLeague || loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'A Analisar...' : 'Analisar Competição'}
                        </button>
                    </div>
                </div>
            </div>

            {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-md mb-8">{error}</div>}
            
            {loading && <p className="text-center text-lg text-emerald-400">A analisar todos os jogos da liga, isto pode demorar um pouco...</p>}

            {!loading && results.length > 0 && <GreenResultsTable results={results} />}
            
            {!loading && results.length === 0 && !error && (
                <div className="text-center text-gray-500 py-16">
                    <p>Os resultados da sua análise aparecerão aqui.</p>
                </div>
            )}
        </div>
    );
}
