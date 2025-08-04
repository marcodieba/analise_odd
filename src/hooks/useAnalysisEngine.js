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

export const useAnalysisEngine = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const apiKey = import.meta.env.VITE_API_FOOTBALL_KEY;

    const apiFetch = useCallback(async (endpoint, isCritical = true) => {
        const cacheKey = endpoint;
        const cachedData = await getCache(cacheKey);
        if (cachedData) return cachedData;
        setLoading(true);
        if (isCritical) setError('');
        try {
            const response = await fetch(`https://${API_HOST}/${endpoint}`, {
                method: 'GET',
                headers: { 'x-rapidapi-host': API_HOST, 'x-rapidapi-key': apiKey },
            });
            const data = await response.json();
            if (data.errors && Object.keys(data.errors).length > 0) {
                const errorKey = Object.keys(data.errors)[0];
                throw new Error(`${errorKey}: ${data.errors[errorKey]}`);
            }
            const responseData = data.response || [];
            await setCache(cacheKey, responseData);
            return responseData;
        } catch (err) {
            if (isCritical) setError(`Erro na API ao buscar ${endpoint}: ${err.message}.`);
            return [];
        } finally {
            setLoading(false);
        }
    }, [apiKey]);

    const fetchLeagueContext = useCallback(async (leagueId) => {
        const cacheKey = `league-context-${leagueId}`;
        const cached = await getCache(cacheKey);
        if (cached) return cached;
        const leagueData = await apiFetch(`v3/leagues?id=${leagueId}&season=${PREVIOUS_SEASON}`);
        let context = { homeAvg: 1.4, awayAvg: 1.1, goal: 1.0, home: 1.0 };
        if (leagueData && leagueData.length > 0) {
            const seasonData = leagueData[0].seasons.find(s => s.year === PREVIOUS_SEASON);
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
    
    const fetchTeamData = useCallback(async (teamId, leagueId) => {
        const [seasonalStatsData, last10Fixtures, leagueStandings] = await Promise.all([
            apiFetch(`v3/teams/statistics?season=${CURRENT_SEASON}&team=${teamId}&league=${leagueId}`),
            apiFetch(`v3/fixtures?team=${teamId}&last=10`),
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

    const runFullAnalysis = useCallback(async (fixture, leagueContext) => {
        const { teams, league, fixture: { id: fixtureId } } = fixture;
        const fixtureName = `${teams.home.name} vs ${teams.away.name}`;
        
        try {
            const [homeData, awayData, oddsByBookmaker, h2hData] = await Promise.all([
                fetchTeamData(teams.home.id, league.id), 
                fetchTeamData(teams.away.id, league.id), 
                fetchOdds(fixtureId),
                apiFetch(`v3/fixtures/headtohead?h2h=${teams.home.id}-${teams.away.id}&last=5`)
            ]);

            const baseReturn = { fixtureName, valuableBets: [], topThreeScores: [] };
            if (!homeData || !awayData || Object.keys(oddsByBookmaker).length === 0) {
                return { ...baseReturn, error: "Faltam dados estatísticos ou de odds para uma análise completa." };
            }

            const homeAttackStrength = homeData.seasonal.goalsForHome / leagueContext.homeAvg;
            const homeDefenseStrength = homeData.seasonal.goalsAgainstHome / leagueContext.awayAvg;
            const awayAttackStrength = awayData.seasonal.goalsForAway / leagueContext.awayAvg;
            const awayDefenseStrength = awayData.seasonal.goalsAgainstAway / leagueContext.homeAvg;

            const homeAttackTrend = homeData.seasonal.goalsForHome > 0 ? homeData.recent.goalsForHome / homeData.seasonal.goalsForHome : 1;
            const awayAttackTrend = awayData.seasonal.goalsForAway > 0 ? awayData.recent.goalsForAway / awayData.seasonal.goalsForAway : 1;

            let formBasedHomeXG = homeAttackStrength * awayDefenseStrength * leagueContext.homeAvg * homeAttackTrend;
            let formBasedAwayXG = awayAttackStrength * homeDefenseStrength * leagueContext.awayAvg * awayAttackTrend;

            const eloDiff = homeData.eloScore - awayData.eloScore;
            const eloModifier = 1 + (eloDiff / 4000);

            formBasedHomeXG *= eloModifier;
            formBasedAwayXG /= eloModifier;

            let h2hHomeGoals = formBasedHomeXG, h2hAwayGoals = formBasedAwayXG;
            if (h2hData && h2hData.length > 2) {
                let h2hHg = 0, h2hAg = 0;
                h2hData.forEach(m => {
                    h2hHg += m.teams.home.id === teams.home.id ? m.goals.home : m.goals.away;
                    h2hAg += m.teams.away.id === teams.away.id ? m.goals.away : m.goals.home;
                });
                h2hHomeGoals = h2hHg / h2hData.length;
                h2hAwayGoals = h2hAg / h2hData.length;
            }

            const homeExpectedGoals = Math.max(0.1, (formBasedHomeXG * 0.8) + (h2hHomeGoals * 0.2));
            const awayExpectedGoals = Math.max(0.1, (formBasedAwayXG * 0.8) + (h2hAwayGoals * 0.2));

            const maxGoals = 8;
            const scoreProbs = Array.from({ length: maxGoals + 1 }, (_, i) => 
                Array.from({ length: maxGoals + 1 }, (_, j) => poisson(homeExpectedGoals, i) * poisson(awayExpectedGoals, j))
            );
            
            const allScoreProbs = [];
            for (let i = 0; i <= maxGoals; i++) for (let j = 0; j <= maxGoals; j++) allScoreProbs.push({ score: `${i}-${j}`, prob: scoreProbs[i][j] });
            const topThreeScores = allScoreProbs.sort((a, b) => b.prob - a.prob).slice(0, 3);
            
            const allProbabilities = {};
            let homeWin = 0, draw = 0, awayWin = 0, bttsYes = 0;
            const overUnder = { 0.5: 0, 1.5: 0, 2.5: 0, 3.5: 0, 4.5: 0 };
            for (let i = 0; i <= maxGoals; i++) {
                for (let j = 0; j <= maxGoals; j++) {
                    const p = scoreProbs[i][j];
                    if (i > j) homeWin += p; else if (i === j) draw += p; else awayWin += p;
                    if (i > 0 && j > 0) bttsYes += p;
                    for (const line in overUnder) if (i + j > line) overUnder[line] += p;
                }
            }
            const totalP = homeWin + draw + awayWin;
            allProbabilities['Resultado Final'] = { 'Casa': homeWin / totalP, 'Empate': draw / totalP, 'Visitante': awayWin / totalP };
            allProbabilities['Ambas Marcam'] = { 'Sim': bttsYes, 'Não': 1 - bttsYes };
            for(const line in overUnder) {
                allProbabilities[`Total de Golos ${line}`] = { [`Mais de ${line}`]: overUnder[line], [`Menos de ${line}`]: 1 - overUnder[line] };
            }
            allProbabilities['Dupla Chance'] = { 'Casa ou Empate': (homeWin + draw) / totalP, 'Visitante ou Empate': (awayWin + draw) / totalP, 'Casa ou Visitante': (homeWin + awayWin) / totalP };

            const marketMap = {
                1: { name: 'Resultado Final', map: { 'Home': 'Casa', 'Draw': 'Empate', 'Away': 'Visitante' } },
                8: { name: 'Ambas Marcam', map: { 'Yes': 'Sim', 'No': 'Não' } },
                12: { name: 'Dupla Chance', map: { 'Home/Draw': 'Casa ou Empate', 'Away/Draw': 'Visitante ou Empate', 'Home/Away': 'Casa ou Visitante' } },
                5: { name: 'Total de Golos 2.5', map: { 'Over 2.5': 'Mais de 2.5', 'Under 2.5': 'Menos de 2.5' } },
                2: { name: 'Total de Golos 1.5', map: { 'Over 1.5': 'Mais de 1.5', 'Under 1.5': 'Menos de 1.5' } },
                3: { name: 'Total de Golos 3.5', map: { 'Over 3.5': 'Mais de 3.5', 'Under 3.5': 'Menos de 3.5' } },
                6: { name: 'Total de Golos 4.5', map: { 'Over 4.5': 'Mais de 4.5', 'Under 4.5': 'Menos de 4.5' } },
            };
            
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
            
            return { ...baseReturn, valuableBets, topThreeScores, error: null };

        } catch (e) {
            return { ...baseReturn, error: e.message };
        }
    }, [fetchTeamData, fetchOdds, apiFetch]);
    
    return { loading, error, apiFetch, runFullAnalysis, fetchLeagueContext };
};