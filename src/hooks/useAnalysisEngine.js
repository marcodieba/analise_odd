// src/hooks/useAnalysisEngine.js

import { useState, useCallback } from 'react';
import { poisson, kellyCriterion } from '../utils/math';
import { getCache, setCache } from '../utils/cache';

const API_HOST = 'api-football-v1.p.rapidapi.com';
const CURRENT_SEASON = new Date().getFullYear();
const PREVIOUS_SEASON = CURRENT_SEASON - 1;

const BOOKMAKERS = [
    { id: 8, name: 'Bet365' }, { id: 6, name: 'Betano' }, { id: 1, name: '10Bet' },
    { id: 11, name: '1xBet' }, { id: 16, name: 'Superbet' }
];

const dlv = (obj, key, def) => {
    let p = 0;
    key = key.split ? key.split('.') : key;
    while (obj && p < key.length) obj = obj[key[p++]];
    return obj === undefined || p < key.length ? def : obj;
};

const safeNumber = (val, fallback = 0) => (isNaN(Number(val)) ? fallback : Number(val));

export const useAnalysisEngine = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const apiKey = import.meta.env.VITE_API_FOOTBALL_KEY;

    const apiFetch = useCallback(async (endpoint, isCritical = true) => {
        if (!apiKey) {
            if (isCritical) setError("Chave da API não configurada no arquivo .env.local do projeto.");
            return [];
        }
        const cacheKey = endpoint;
        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            console.log(`[API-DEBUG][CACHE] Endpoint: ${endpoint}`, cachedData);
            return cachedData;
        }
        setLoading(true);
        if (isCritical) setError('');
        try {
            const response = await fetch(`https://${API_HOST}/${endpoint}`, {
                method: 'GET',
                headers: { 'x-rapidapi-host': API_HOST, 'x-rapidapi-key': apiKey },
            });
            const data = await response.json();
            console.log(`[API-DEBUG][FETCH] Endpoint: ${endpoint}`, data);
            if (data.errors && Object.keys(data.errors).length > 0) {
                const errorKey = Object.keys(data.errors)[0];
                throw new Error(`${errorKey}: ${data.errors[errorKey]}`);
            }
            const responseData = Array.isArray(data.response) ? data.response : [];
            await setCache(cacheKey, responseData);
            return responseData;
        } catch (err) {
            if (isCritical) setError(`Erro na API ao buscar ${endpoint}: ${err.message}.`);
            return [];
        } finally {
            setLoading(false);
        }
    }, [apiKey]);

    // Exemplo para fetchAvailableSeasons (agora desnecessário, pode remover se não usar mais)
    const fetchAvailableSeasons = useCallback(async (leagueId) => {
        return [CURRENT_SEASON];
    }, []);

    // Exemplo para fetchLeagueContext
    const fetchLeagueContext = useCallback(async (leagueId) => {
        if (!leagueId) {
            console.error('[fetchLeagueContext] leagueId inválido:', leagueId);
            return null;
        }
        const cacheKey = `league-context-${leagueId}-${CURRENT_SEASON}`;
        const cached = await getCache(cacheKey);
        if (cached) return cached;
        const leagueData = await apiFetch(`v3/leagues?id=${leagueId}&season=${CURRENT_SEASON}`);
        let context = { homeAvg: 1.4, awayAvg: 1.1, goal: 1.0, home: 1.0 };
        if (leagueData && leagueData.length > 0) {
            const seasonData = leagueData[0].seasons.find(s => s.year === Number(CURRENT_SEASON));
            if (seasonData?.goals?.for?.average?.total && seasonData?.fixtures?.wins?.home) {
                context.homeAvg = parseFloat(seasonData.goals.for.average.home) || 1.4;
                context.awayAvg = parseFloat(seasonData.goals.for.average.away) || 1.1;
                context.goal = 1 + ((parseFloat(seasonData.goals.for.average.total) - 2.7) * 0.1);
                context.home = 1 + ((parseFloat(seasonData.fixtures.wins.home) - 45) * 0.005);
            }
        }
        await setCache(cacheKey, context);
        return context;
    }, [apiFetch]);

    const fetchOdds = useCallback(async (fixtureId) => {
        if (!fixtureId) return {};
        const data = await apiFetch(`v3/odds?fixture=${fixtureId}`);
        const oddsByBookmaker = {};
        if (data && data[0]?.bookmakers) {
            data[0].bookmakers.forEach(bookmaker => {
                const bookmakerInfo = BOOKMAKERS.find(b => b.id === bookmaker.id);
                if (bookmakerInfo) {
                    oddsByBookmaker[bookmakerInfo.name] = {};
                    bookmaker.bets.forEach(bet => {
                        oddsByBookmaker[bookmakerInfo.name][bet.id] = bet.values;
                    });
                }
            });
        }
        return oddsByBookmaker;
    }, [apiFetch]);

    // Exemplo para fetchTeamData
    const fetchTeamData = useCallback(async (teamId, leagueId) => {
        if (!teamId || !leagueId) {
            console.error('[fetchTeamData] Parâmetros inválidos:', teamId, leagueId);
            return null;
        }
        const [seasonalStatsData, last10Fixtures, leagueStandings] = await Promise.all([
            apiFetch(`v3/teams/statistics?season=${CURRENT_SEASON}&team=${teamId}&league=${leagueId}`),
            apiFetch(`v3/fixtures?team=${teamId}&last=10&season=${CURRENT_SEASON}`),
            apiFetch(`v3/standings?league=${leagueId}&season=${CURRENT_SEASON}`)
        ]);

        let eloScore = 1500;
        if (leagueStandings.length > 0) {
            const standings = dlv(leagueStandings, '0.league.standings.0', []);
            const teamRankData = standings.find(t => t.team.id === teamId);
            if (teamRankData) {
                eloScore = 2000 - (teamRankData.rank * 20) + (teamRankData.points * 5);
            }
        }

        let recentMetrics = { goalsForHome: 1.0, goalsAgainstHome: 1.0, goalsForAway: 1.0, goalsAgainstAway: 1.0 };
        if (last10Fixtures && last10Fixtures.length > 0) {
            let hg = 0, ag = 0, gfh = 0, gah = 0, gfa = 0, gaa = 0;
            last10Fixtures.forEach(f => {
                if (f.fixture.status.short !== 'FT') return;
                if (f.teams.home.id === teamId) { hg++; gfh += f.goals.home; gah += f.goals.away; }
                else if (f.teams.away.id === teamId) { ag++; gfa += f.goals.away; gaa += f.goals.home; }
            });
            recentMetrics = {
                goalsForHome: hg > 0 ? gfh / hg : 1.0, goalsAgainstHome: hg > 0 ? gah / hg : 1.0,
                goalsForAway: ag > 0 ? gfa / ag : 1.0, goalsAgainstAway: ag > 0 ? gaa / ag : 1.0,
            };
        }

        let seasonalMetrics = { goalsForHome: 1.4, goalsAgainstHome: 1.1, goalsForAway: 1.1, goalsAgainstAway: 1.4 };
        const gamesPlayedInLeague = dlv(seasonalStatsData, '0.fixtures.played.total', 0);
        if (gamesPlayedInLeague >= 5) {
            const stats = seasonalStatsData[0];
            seasonalMetrics = {
                goalsForHome: parseFloat(dlv(stats, 'goals.for.average.home', '1.4')),
                goalsAgainstHome: parseFloat(dlv(stats, 'goals.against.average.home', '1.1')),
                goalsForAway: parseFloat(dlv(stats, 'goals.for.average.away', '1.1')),
                goalsAgainstAway: parseFloat(dlv(stats, 'goals.against.average.away', '1.4')),
            };
        } else {
            const prevStats = await apiFetch(`v3/teams/statistics?season=${PREVIOUS_SEASON}&team=${teamId}&league=${leagueId}`);
            if (dlv(prevStats, '0.fixtures.played.total', 0) > 0) {
                const stats = prevStats[0];
                seasonalMetrics = {
                    goalsForHome: parseFloat(dlv(stats, 'goals.for.average.home', '1.4')),
                    goalsAgainstHome: parseFloat(dlv(stats, 'goals.against.average.home', '1.1')),
                    goalsForAway: parseFloat(dlv(stats, 'goals.for.average.away', '1.1')),
                    goalsAgainstAway: parseFloat(dlv(stats, 'goals.against.average.away', '1.4')),
                };
            }
        }
        return { eloScore, seasonal: seasonalMetrics, recent: recentMetrics };
    }, [apiFetch]);

    const runFullAnalysis = useCallback(async (fixture, leagueContext, season) => {
        const { teams, league, fixture: { id: fixtureId } } = fixture;
        const fixtureName = `${teams.home.name} vs ${teams.away.name}`;

        try {
            const [homeData, awayData, oddsByBookmaker] = await Promise.all([
                fetchTeamData(teams.home.id, league.id, season),
                fetchTeamData(teams.away.id, league.id, season),
                fetchOdds(fixtureId),
            ]);

            const baseReturn = { fixtureName, fixtureId, valuableBets: [], topThreeScores: [], powerScores: null, prediction: null };

            if (!homeData || !awayData) {
                return { ...baseReturn, error: "Faltam dados estatísticos para uma análise completa." };
            }

            // oddsByBookmaker pode estar vazio, mas a análise segue normalmente
            console.log('[DEBUG] oddsByBookmaker:', oddsByBookmaker);

            // PowerScores completos
            const powerScores = {
                home: {
                    eloScore: safeNumber(homeData.eloScore),
                    weightedFormScore: safeNumber(homeData.recent.goalsForHome),
                    homeAttack: safeNumber(homeData.seasonal.goalsForHome),
                    h2hFactor: 0,
                    homeEfficiency: safeNumber(homeData.seasonal.goalsForHome) / Math.max(1, safeNumber(homeData.seasonal.goalsForHome) + safeNumber(homeData.seasonal.goalsAgainstHome)),
                    offensiveScore: safeNumber(homeData.seasonal.goalsForHome)
                },
                away: {
                    eloScore: safeNumber(awayData.eloScore),
                    weightedFormScore: safeNumber(awayData.recent.goalsForAway),
                    awayAttack: safeNumber(awayData.seasonal.goalsForAway),
                    h2hFactor: 0,
                    awayEfficiency: safeNumber(awayData.seasonal.goalsForAway) / Math.max(1, safeNumber(awayData.seasonal.goalsForAway) + safeNumber(awayData.seasonal.goalsAgainstAway)),
                    offensiveScore: safeNumber(awayData.seasonal.goalsForAway)
                }
            };

            const homeAttackStrength = safeNumber(homeData.seasonal.goalsForHome) / (leagueContext.homeAvg || 1);
            const homeDefenseStrength = safeNumber(homeData.seasonal.goalsAgainstHome) / (leagueContext.awayAvg || 1);
            const awayAttackStrength = safeNumber(awayData.seasonal.goalsForAway) / (leagueContext.awayAvg || 1);
            const awayDefenseStrength = safeNumber(awayData.seasonal.goalsAgainstAway) / (leagueContext.homeAvg || 1);

            const homeAttackTrend = safeNumber(homeData.seasonal.goalsForHome) > 0 ? safeNumber(homeData.recent.goalsForHome) / safeNumber(homeData.seasonal.goalsForHome) : 1;
            const awayAttackTrend = safeNumber(awayData.seasonal.goalsForAway) > 0 ? safeNumber(awayData.recent.goalsForAway) / safeNumber(awayData.seasonal.goalsForAway) : 1;

            let homeExpectedGoals = homeAttackStrength * awayDefenseStrength * (leagueContext.homeAvg || 1) * homeAttackTrend;
            let awayExpectedGoals = awayAttackStrength * homeDefenseStrength * (leagueContext.awayAvg || 1) * awayAttackTrend;

            const eloDiff = safeNumber(homeData.eloScore) - safeNumber(awayData.eloScore);
            const eloModifier = 1 + (eloDiff / 4000);
            homeExpectedGoals *= eloModifier;
            awayExpectedGoals /= eloModifier;

            const maxGoals = 8;
            const scoreProbs = Array.from({ length: maxGoals + 1 }, (_, i) =>
                Array.from({ length: maxGoals + 1 }, (_, j) => poisson(homeExpectedGoals, i) * poisson(awayExpectedGoals, j))
            );

            const allScoreProbs = [];
            for (let i = 0; i <= maxGoals; i++) for (let j = 0; j <= maxGoals; j++) allScoreProbs.push({ score: `${i}-${j}`, prob: scoreProbs[i][j] });
            const topThreeScores = allScoreProbs.sort((a, b) => b.prob - a.prob).slice(0, 3);

            const allProbabilities = {};
            let homeWin = 0, draw = 0, awayWin = 0;
            for (let i = 0; i <= maxGoals; i++) {
                for (let j = 0; j <= maxGoals; j++) {
                    const p = scoreProbs[i][j];
                    if (i > j) homeWin += p; else if (i === j) draw += p; else awayWin += p;
                }
            }
            const totalP = homeWin + draw + awayWin;
            allProbabilities['Resultado Final'] = { 'Casa': homeWin / totalP, 'Empate': draw / totalP, 'Visitante': awayWin / totalP };

            let outcome = '', probability = 0;
            if (homeWin > draw && homeWin > awayWin) {
                outcome = `Vitória ${teams.home.name}`;
                probability = homeWin / totalP;
            } else if (awayWin > homeWin && awayWin > draw) {
                outcome = `Vitória ${teams.away.name}`;
                probability = awayWin / totalP;
            } else {
                outcome = 'Empate';
                probability = draw / totalP;
            }
            const prediction = { outcome, probability: (probability * 100).toFixed(1), confidence: 'Média' };

            const marketMap = { 1: { name: 'Resultado Final', map: { 'Home': 'Casa', 'Draw': 'Empate', 'Away': 'Visitante' } } };
            const valuableBets = [];
            for (const marketId in marketMap) {
                const marketInfo = marketMap[marketId];
                for (const bookmakerName in oddsByBookmaker) {
                    const bookmakerOddsForMarket = oddsByBookmaker[bookmakerName][marketId];
                    if (bookmakerOddsForMarket) {
                        bookmakerOddsForMarket.forEach(val => {
                            const outcomeName = marketInfo.map[val.value];
                            if (outcomeName && allProbabilities[marketInfo.name] && allProbabilities[marketInfo.name][outcomeName] !== undefined) {
                                const prob = allProbabilities[marketInfo.name][outcomeName];
                                const odd = parseFloat(val.odd);
                                const value = (odd * prob) - 1;
                                if (value > 0.01) {
                                    const existingBet = valuableBets.find(b => b.market === marketInfo.name && b.outcome === outcomeName);
                                    if (!existingBet || odd > existingBet.odd) {
                                        if (existingBet) valuableBets.splice(valuableBets.indexOf(existingBet), 1);
                                        valuableBets.push({ fixtureName, market: marketInfo.name, outcome: outcomeName, prob, odd, bookmakerName, value, kellyStake: kellyCriterion(odd, prob) });
                                    }
                                }
                            }
                        });
                    }
                }
            }

            return { ...baseReturn, valuableBets, topThreeScores, powerScores, prediction, error: null };

        } catch (e) {
            return { fixtureName, fixtureId, valuableBets: [], topThreeScores: [], powerScores: null, prediction: null, error: e.message };
        }
    }, [fetchTeamData, fetchOdds, apiFetch]);

    const runBacktest = useCallback(async (alert, startDate, endDate, leagueId, season) => {
        setLoading(true);
        setError('');
        try {
            const leagueContext = await fetchLeagueContext(leagueId, season);
            const fixtures = await apiFetch(
                `v3/fixtures?league=${leagueId}&season=${season}&from=${startDate}&to=${endDate}&status=FT`
            );
            if (!fixtures || fixtures.length === 0) {
                return { triggeredBets: [], totalFixtures: 0, totalProfit: 0, hitRate: 0 };
            }
            const analysisPromises = fixtures.map(fixture => runFullAnalysis(fixture, leagueContext, season));
            const analysisResults = await Promise.all(analysisPromises);

            const triggeredBets = [];
            analysisResults.forEach(result => {
                if (result.error || !result.valuableBets) return;
                result.valuableBets.forEach(bet => {
                    let allRulesMatch = true;
                    if (!alert.ruleData || alert.ruleData.length === 0) {
                        allRulesMatch = false;
                    } else {
                        for (const rule of alert.ruleData) {
                            let ruleMatchesThisBet = false;
                            if (bet.market === rule.market || (bet.market && bet.market.includes(rule.market))) {
                                const outcomeBase = bet.outcome.split(' ')[0];
                                if (rule.outcome.includes(outcomeBase)) {
                                    const metricMap = { 'Valor (EV)': bet.value * 100, 'Probabilidade': bet.prob * 100, 'Odd': bet.odd };
                                    const betValue = metricMap[rule.metric];
                                    if (betValue !== undefined) {
                                        switch (rule.operator) {
                                            case '>': if (betValue > rule.value) ruleMatchesThisBet = true; break;
                                            case '<': if (betValue < rule.value) ruleMatchesThisBet = true; break;
                                            case '>=': if (betValue >= rule.value) ruleMatchesThisBet = true; break;
                                            case '<=': if (betValue <= rule.value) ruleMatchesThisBet = true; break;
                                            case '=': if (betValue === rule.value) ruleMatchesThisBet = true; break;
                                        }
                                    }
                                }
                            }
                            if (!ruleMatchesThisBet) {
                                allRulesMatch = false;
                                break;
                            }
                        }
                    }
                    if (allRulesMatch) {
                        const fixtureData = fixtures.find(f => f.fixture.id === result.fixtureId);
                        if (!fixtureData) return;
                        const { goals } = fixtureData;
                        let isWin = false;
                        if (bet.market === 'Resultado Final') {
                            if (bet.outcome.includes('Casa')) isWin = goals.home > goals.away;
                            else if (bet.outcome.includes('Empate')) isWin = goals.home === goals.away;
                            else if (bet.outcome.includes('Visitante')) isWin = goals.home < goals.away;
                        }
                        triggeredBets.push({ ...bet, isWin });
                    }
                });
            });

            const totalProfit = triggeredBets.reduce((acc, bet) => acc + (bet.isWin ? bet.odd - 1 : -1), 0);
            const wins = triggeredBets.filter(b => b.isWin).length;
            const hitRate = triggeredBets.length > 0 ? (wins / triggeredBets.length) * 100 : 0;

            return { triggeredBets, totalFixtures: fixtures.length, totalProfit, hitRate };

        } catch (e) {
            setError(`Erro durante o backtest: ${e.message}`);
            return null;
        } finally {
            setLoading(false);
        }
    }, [apiFetch, fetchLeagueContext, runFullAnalysis]);

    const fetchFinishedFixtures = useCallback(async (leagueId, season) => {
        if (!leagueId || !season || isNaN(Number(season))) {
            console.error('[fetchFinishedFixtures] leagueId ou season inválido:', leagueId, season);
            return [];
        }
        const fixtures = await apiFetch(`v3/fixtures?league=${leagueId}&season=${season}&status=FT`);
        console.log(`[API-DEBUG][FETCH][FINISHED_FIXTURES] leagueId=${leagueId} season=${season}`, fixtures);
        return fixtures;
    }, [apiFetch]);

    const testApiEndpoints = useCallback(async ({ leagueId, teamId, fixtureId }) => {
        console.log('--- [API TEST] ---');
        if (leagueId) {
            const fixtures = await apiFetch(`v3/fixtures?league=${leagueId}&season=${CURRENT_SEASON}`);
            console.log('[API TEST] Fixtures:', fixtures);

            const standings = await apiFetch(`v3/standings?league=${leagueId}&season=${CURRENT_SEASON}`);
            console.log('[API TEST] Standings:', standings);

            const statistics = await apiFetch(`v3/teams/statistics?season=${CURRENT_SEASON}&team=${teamId}&league=${leagueId}`);
            console.log('[API TEST] Team Statistics:', statistics);
        }
        if (fixtureId) {
            const odds = await apiFetch(`v3/odds?fixture=${fixtureId}`);
            console.log('[API TEST] Odds:', odds);
        }
        if (teamId) {
            const last10 = await apiFetch(`v3/fixtures?team=${teamId}&last=10&season=${CURRENT_SEASON}`);
            console.log('[API TEST] Last 10 Fixtures:', last10);
        }
        console.log('--- [API TEST END] ---');
    }, [apiFetch]);

    return {
        loading,
        error,
        apiFetch,
        runFullAnalysis,
        fetchLeagueContext,
        runBacktest,
        fetchAvailableSeasons,
        fetchFinishedFixtures,
        testApiEndpoints // <-- exporte para uso externo
    };
};