// src/hooks/useAnalysisEngine.js
import { useState, useCallback } from 'react';
import { kellyCriterion } from '../utils/math';
import { apiFetch as centralizedApiFetch } from '../utils/apiService';

const CURRENT_SEASON = new Date().getFullYear();

// Funções utilitárias
const dlv = (obj, key, def) => {
  let p = 0;
  key = key && key.split ? key.split('.') : key;
  while (obj && p < key.length) obj = obj[key[p++]];
  return obj === undefined || p < key.length ? def : obj;
};
const safeNumber = (val, fallback = 0) => (isNaN(Number(val)) ? fallback : Number(val));
const normalize = (val, min, max) => (max === min ? 0.5 : Math.max(0, Math.min(1, (val - min) / (max - min))));

const factorial = (n) => {
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
};
const poisson = (lambda, k) => (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);

const dixonColesFactor = (x, y, lambda, mu, rho) => {
  if (x === 0 && y === 0) return Math.max(0, 1 - lambda * mu * rho);
  if (x === 0 && y === 1) return 1 + lambda * rho;
  if (x === 1 && y === 0) return 1 + mu * rho;
  if (x === 1 && y === 1) return Math.max(0, 1 - rho);
  return 1;
};

const applyHybridAdjustmentToWeights = (weights, context) => {
  const w = { ...weights };
  if (context.rankDiff > 6) w.elo += 0.03;
  if (context.homeIsStrong) w.strength += 0.02;
  if (context.awayBadForm) w.form += 0.02;
  const total = Object.values(w).reduce((s, v) => s + v, 0);
  Object.keys(w).forEach(k => { w[k] = w[k] / total; });
  return w;
};

// --- Hook principal ---
export const useAnalysisEngine = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiFetch = useCallback(async (endpoint, isCritical = true) => {
    try {
      setLoading(true);
      if (isCritical) setError('');
      const data = await centralizedApiFetch(endpoint);
      return data;
    } catch (e) {
      if (isCritical) {
        setError(`Erro na análise: ${e.message}`);
      }
      return []; 
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLeagueContext = useCallback(async (leagueId) => {
    const league = await apiFetch(`v3/leagues?id=${leagueId}&season=${CURRENT_SEASON}`);
    return league;
  }, [apiFetch]);

  const fetchRawDataForModel = useCallback(async (teamId, leagueId) => {
    const [seasonalStatsData, last10Fixtures, leagueStandings] = await Promise.all([
      apiFetch(`v3/teams/statistics?season=${CURRENT_SEASON}&team=${teamId}&league=${leagueId}`),
      apiFetch(`v3/fixtures?team=${teamId}&last=10&season=${CURRENT_SEASON}`),
      apiFetch(`v3/standings?league=${leagueId}&season=${CURRENT_SEASON}`)
    ]);

    let eloScore = 1500;
    try {
      const standings = dlv(leagueStandings, '0.league.standings.0', []);
      const teamRow = standings.find(r => r.team.id === teamId);
      if (teamRow) eloScore = 2000 - (teamRow.rank * 25) + (teamRow.points * 5);
    } catch (_) { /* fallback */ }

    let weightedFormScore = 0;
    let recentTotalGoals = 0;
    let recentFixturesCount = 0;

    if (Array.isArray(last10Fixtures) && last10Fixtures.length > 0) {
      const weights = [1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55];
      const sorted = last10Fixtures.slice().sort((a,b) => new Date(b.fixture.date) - new Date(a.fixture.date));
      sorted.slice(0,10).forEach((f, idx) => {
        if (f.fixture?.status?.short !== 'FT') return;
        const isHome = f.teams.home.id === teamId;
        const isWin = (isHome && f.teams.home.winner) || (!isHome && f.teams.away.winner);
        const isDraw = f.teams.home.winner === null && f.teams.away.winner === null;
        const res = isWin ? 1 : (isDraw ? 0.5 : 0);
        weightedFormScore += res * (weights[idx] ?? 0.5);
        recentTotalGoals += (f.goals.home || 0) + (f.goals.away || 0);
        recentFixturesCount++;
      });
    }
    
    const recentAvgGoals = recentFixturesCount > 0 ? recentTotalGoals / recentFixturesCount : 2.5;

    const stats = dlv(seasonalStatsData, '0', {});
    const gfHome = safeNumber(dlv(stats, 'goals.for.average.home', 1.2), 1.2);
    const gaHome = safeNumber(dlv(stats, 'goals.against.average.home', 1.2), 1.2);
    const gfAway = safeNumber(dlv(stats, 'goals.for.average.away', 1.0), 1.0);
    const gaAway = safeNumber(dlv(stats, 'goals.against.average.away', 1.0), 1.0);
    const totalGoals = safeNumber(dlv(stats, 'goals.for.total.total', 0), 0);
    const shotsOn = safeNumber(dlv(stats, 'shots.on.total', 0), 0);

    const firstHalfGoalsFor = safeNumber(dlv(stats, 'goals.for.minute.0-15.total', 0), 0) +
                              safeNumber(dlv(stats, 'goals.for.minute.16-30.total', 0), 0) +
                              safeNumber(dlv(stats, 'goals.for.minute.31-45.total', 0), 0);
    const firstHalfRatio = totalGoals > 0 ? firstHalfGoalsFor / totalGoals : 0.42;

    const cornersHome = safeNumber(dlv(stats, 'corners.average.home', 4.5));
    const cornersAway = safeNumber(dlv(stats, 'corners.average.away', 4.2));
    const shotsOnHome = safeNumber(dlv(stats, 'shots.on.average.home', 5.2));
    const shotsOnAway = safeNumber(dlv(stats, 'shots.on.average.away', 4.7));

    const strength = {
      home: { attack: gfHome, defense: gaHome },
      away: { attack: gfAway, defense: gaAway }
    };

    const efficiency = shotsOn > 0 ? (totalGoals / shotsOn) : 0.12;

    const rank = (() => {
      try {
        const table = dlv(leagueStandings, '0.league.standings.0', []);
        const row = table.find(r => r.team.id === teamId) || {};
        return row.rank ?? 99;
      } catch (_) { return 99; }
    })();

    return {
      elo: eloScore,
      form: weightedFormScore,
      strength,
      efficiency,
      firstHalfGoalsRatio: firstHalfRatio,
      corners: { home: cornersHome, away: cornersAway, total: cornersHome + cornersAway },
      shotsOnGoal: { home: shotsOnHome, away: shotsOnAway, total: shotsOnHome + shotsOnAway },
      rank,
      recentAvgGoals: recentAvgGoals
    };
  }, [apiFetch]);

  const fetchOdds = useCallback(async (fixtureId) => {
    if (!fixtureId) return {};
    const data = await apiFetch(`v3/odds?fixture=${fixtureId}`);
    const oddsByBookmaker = {};
    if (Array.isArray(data) && data[0]?.bookmakers) {
      data[0].bookmakers.forEach(book => {
        oddsByBookmaker[book.name ?? book.bookmaker?.name ?? book.bookmaker?.title ?? `bm${book.id}`] = book.bets ?? book.bets;
      });
    }
    return oddsByBookmaker;
  }, [apiFetch]);

  const runFullAnalysis = useCallback(async (fixture) => {
    if (!fixture || !fixture.teams || !fixture.league) {
      return { fixtureName: 'Dados insuficientes', error: 'Fixture incompleto para análise.' };
    }
    const teams = fixture.teams;
    const league = fixture.league;
    const fixtureId = fixture.fixture?.id ?? fixture.id ?? null;
    const fixtureName = `${teams.home.name} vs ${teams.away.name}`;

    try {
      setLoading(true);

      const [homeRaw, awayRaw, h2hRaw, oddsData] = await Promise.all([
        fetchRawDataForModel(teams.home.id, league.id),
        fetchRawDataForModel(teams.away.id, league.id),
        apiFetch(`v3/fixtures/headtohead?h2h=${teams.home.id}-${teams.away.id}&last=6`, false),
        fetchOdds(fixtureId)
      ]);

      const h2hMatches = Array.isArray(h2hRaw) ? h2hRaw : [];
      const homeWinsH2H = h2hMatches.filter(m => (m.teams.home.id === teams.home.id && m.teams.home.winner) || (m.teams.away.id === teams.home.id && m.teams.away.winner)).length;
      const awayWinsH2H = h2hMatches.filter(m => (m.teams.home.id === teams.away.id && m.teams.home.winner) || (m.teams.away.id === teams.away.id && m.teams.away.winner)).length;
      const h2hFactor = h2hMatches.length ? (homeWinsH2H - awayWinsH2H) / h2hMatches.length : 0;

      let weights = { elo: 0.30, form: 0.20, strength: 0.20, efficiency: 0.20, h2h: 0.10 };

      const context = {
        rankDiff: Math.abs((homeRaw.rank ?? 99) - (awayRaw.rank ?? 99)),
        homeIsStrong: homeRaw.strength?.home?.attack > 1.6,
        awayBadForm: (awayRaw.form ?? 0) < 3.5
      };
      weights = applyHybridAdjustmentToWeights(weights, context);

      const expectedHomeEloProb = 1 / (1 + Math.pow(10, ((awayRaw.elo ?? 1500) - (homeRaw.elo ?? 1500)) / 400));

      const normHome = {
        elo: expectedHomeEloProb,
        form: normalize(homeRaw.form ?? 0, 0, 10),
        strength: normalize((homeRaw.strength.home.attack / Math.max(0.1, awayRaw.strength.away.defense)), 0, 5),
        efficiency: normalize(homeRaw.efficiency ?? 0, 0, 0.5),
        h2h: normalize(h2hFactor, -1, 1)
      };
      const normAway = {
        elo: 1 - expectedHomeEloProb,
        form: normalize(awayRaw.form ?? 0, 0, 10),
        strength: normalize((awayRaw.strength.away.attack / Math.max(0.1, homeRaw.strength.home.defense)), 0, 5),
        efficiency: normalize(awayRaw.efficiency ?? 0, 0, 0.5),
        h2h: normalize(-h2hFactor, -1, 1)
      };

      const homeIFT = (normHome.elo * weights.elo) + (normHome.form * weights.form) + (normHome.strength * weights.strength) + (normHome.efficiency * weights.efficiency) + (normHome.h2h * weights.h2h);
      const awayIFT = (normAway.elo * weights.elo) + (normAway.form * weights.form) + (normAway.strength * weights.strength) + (normAway.efficiency * weights.efficiency) + (normAway.h2h * weights.h2h);
      
      const h2hTotalGoals = h2hMatches.reduce((sum, match) => sum + (match.goals.home || 0) + (match.goals.away || 0), 0);
      const h2hAvgGoals = h2hMatches.length > 0 ? h2hTotalGoals / h2hMatches.length : null;

      const combinedRecentAvgGoals = (homeRaw.recentAvgGoals + awayRaw.recentAvgGoals) / 2;

      let totalExpectedGoals;
      if (h2hAvgGoals !== null) {
          totalExpectedGoals = (h2hAvgGoals * 0.6) + (combinedRecentAvgGoals * 0.4);
      } else {
          totalExpectedGoals = combinedRecentAvgGoals;
      }
      
      const homeOffensiveShare = homeRaw.strength.home.attack / (homeRaw.strength.home.attack + awayRaw.strength.away.attack);
      const homeXG = totalExpectedGoals * homeOffensiveShare;
      const awayXG = totalExpectedGoals * (1 - homeOffensiveShare);

      const rho = 0.06;

      const maxGoals = 8;
      const rawMatrix = Array.from({ length: maxGoals + 1 }, (_, i) =>
        Array.from({ length: maxGoals + 1 }, (_, j) => {
          const base = poisson(homeXG, i) * poisson(awayXG, j);
          const dc = dixonColesFactor(i, j, homeXG, awayXG, rho);
          return base * dc;
        })
      );

      let sum = 0;
      for (let i = 0; i <= maxGoals; i++) for (let j = 0; j <= maxGoals; j++) sum += rawMatrix[i][j];
      if (sum <= 0) sum = 1;
      const matrix = rawMatrix.map(row => row.map(v => v / sum));

      let homeWin_fromGoals = 0, draw_fromGoals = 0, awayWin_fromGoals = 0, over25 = 0, bttsYes = 0;
      const correctScores = {};
      for (let i = 0; i <= maxGoals; i++) {
        for (let j = 0; j <= maxGoals; j++) {
          const p = matrix[i][j];
          if (i > j) homeWin_fromGoals += p;
          else if (i === j) draw_fromGoals += p;
          else awayWin_fromGoals += p;
          if (i + j > 2.5) over25 += p;
          if (i > 0 && j > 0) bttsYes += p;
          correctScores[`${i}-${j}`] = p;
        }
      }

      // *** INÍCIO DA NOVA LÓGICA HÍBRIDA PARA O VENCEDOR ***
      
      // 1. Probabilidade baseada na Força Geral (IFT)
      const totalIFT = homeIFT + awayIFT;
      const homeWin_fromIFT = homeIFT / totalIFT;
      const awayWin_fromIFT = awayIFT / totalIFT;
      // Heurística para o empate: a probabilidade de empate é maior quando as forças são mais próximas
      const draw_fromIFT = 1 - Math.abs(homeWin_fromIFT - awayWin_fromIFT);

      // 2. Média Ponderada (50% Golos, 50% IFT)
      const finalHomeWin = (homeWin_fromGoals * 0.5) + (homeWin_fromIFT * 0.5);
      const finalAwayWin = (awayWin_fromGoals * 0.5) + (awayWin_fromIFT * 0.5);
      const finalDraw = (draw_fromGoals * 0.5) + (draw_fromIFT * 0.5);

      // 3. Renormalizar para garantir que a soma seja 1 (100%)
      const finalTotal = finalHomeWin + finalAwayWin + finalDraw;
      const homeWin = finalHomeWin / finalTotal;
      const draw = finalDraw / finalTotal;
      const awayWin = finalAwayWin / finalTotal;

      // *** FIM DA NOVA LÓGICA HÍBRIDA ***


      const calculateLineProbability = (lambda, line) => {
        let underProb = 0;
        for (let k = 0; k <= Math.floor(line); k++) {
          underProb += poisson(lambda, k);
        }
        return {
          over: 1 - underProb,
          under: underProb,
        };
      };

      const expectedCorners = (homeRaw.corners?.total ?? 8) * 0.5 + (awayRaw.corners?.total ?? 8) * 0.5;
      const cornerProbs = calculateLineProbability(expectedCorners, 9.5);

      const expectedShotsOnGoal = (homeRaw.shotsOnGoal?.total ?? 8) * 0.5 + (awayRaw.shotsOnGoal?.total ?? 8) * 0.5;
      const shotsOnGoalProbs = calculateLineProbability(expectedShotsOnGoal, 9.5);

      const probabilities = {
        'Resultado Final': { 'Casa': homeWin, 'Empate': draw, 'Visitante': awayWin },
        'Total de Golos': { 'Mais de 2.5': over25, 'Menos de 2.5': 1 - over25 },
        'Ambas Marcam': { 'Sim': bttsYes, 'Não': 1 - bttsYes },
        'Placar Exato': correctScores,
        'Total de Cantos': { 'Mais de 9.5': cornerProbs.over, 'Menos de 9.5': cornerProbs.under },
        'Total de Chutes ao Gol': { 'Mais de 9.5': shotsOnGoalProbs.over, 'Menos de 9.5': shotsOnGoalProbs.under }
      };

      const greenSuggestions = [];
      for (const [market, outcomes] of Object.entries(probabilities)) {
        let bestOutcome = null, bestProb = -1;
        for (const [outcome, prob] of Object.entries(outcomes)) {
          if (prob > bestProb) { bestOutcome = outcome; bestProb = prob; }
        }
        if (bestOutcome) greenSuggestions.push({ market, outcome: bestOutcome, prob: bestProb });
      }
      greenSuggestions.sort((a,b) => b.prob - a.prob);
      
      const mainResult = greenSuggestions.find(s => 
        s.market === 'Resultado Final' && s.prob > 0.4
      );

      const orderedSuggestions = mainResult
        ? [mainResult, ...greenSuggestions.filter(s => s !== mainResult)]
        : greenSuggestions;

      const allValuableBets = [];
      try {
        for (const bmName in oddsData) {
          const bm = oddsData[bmName];
          const bets = Array.isArray(bm) ? bm : Object.values(bm);
          for (const bet of bets) {
            const values = bet.values ?? bet;
            if (!Array.isArray(values)) continue;
            for (const val of values) {
              const label = (val.value ?? '').toString();
              let marketName = null, outcomeLabel = null;
              
              if (bet.id === 1 || (bet.name || bet.bet_name) === "Match Winner") {
                  marketName = 'Resultado Final';
                  if (label === '1' || label === 'Home') outcomeLabel = 'Casa';
                  else if (label === 'X' || label === 'Draw') outcomeLabel = 'Empate';
                  else if (label === '2' || label === 'Away') outcomeLabel = 'Visitante';
              } 
              else if (bet.id === 5 || (bet.name || bet.bet_name) === "Goals Over/Under") {
                  marketName = 'Total de Golos';
                  if (label === 'Over 2.5') outcomeLabel = 'Mais de 2.5';
                  else if (label === 'Under 2.5') outcomeLabel = 'Menos de 2.5';
              } 
              else if (bet.id === 8 || (bet.name || bet.bet_name) === "Both Teams To Score") {
                  marketName = 'Ambas Marcam';
                  if (label === 'Yes') outcomeLabel = 'Sim';
                  else if (label === 'No') outcomeLabel = 'Não';
              }
              else if (bet.id === 10 || (bet.name || bet.bet_name) === "Corners Over/Under") {
                  marketName = 'Total de Cantos';
                  if (label.includes('Over') && val.handicap === '9.5') outcomeLabel = 'Mais de 9.5';
                  else if (label.includes('Under') && val.handicap === '9.5') outcomeLabel = 'Menos de 9.5';
              }

              if (!marketName || !outcomeLabel) continue;

              const odd = Number(val.odd ?? val.price ?? val.odds);
              if (!odd || odd <= 1.01) continue;

              const modelProb = probabilities?.[marketName]?.[outcomeLabel];
              if (modelProb === undefined) continue;
              
              const ev = (odd * modelProb) - 1;
              if (ev > 0.03) {
                allValuableBets.push({
                  fixtureName,
                  fixtureId,
                  market: marketName,
                  outcome: outcomeLabel,
                  prob: modelProb,
                  odd,
                  bookmakerName: bmName,
                  value: ev,
                  kellyStake: kellyCriterion(odd, modelProb)
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao processar odds:', e.message);
      }
      
      const bestOddsMap = {};
      for (const bet of allValuableBets) {
          const key = `${bet.market}-${bet.outcome}`;
          if (!bestOddsMap[key] || bet.odd > bestOddsMap[key].odd) {
              bestOddsMap[key] = bet;
          }
      }
      const valuableBets = Object.values(bestOddsMap);

      valuableBets.sort((a,b) => (b.value ?? 0) - (a.value ?? 0));

      const narrative = (() => {
        const diff = homeIFT - awayIFT;
        if (diff > 0.2) return { title: `Favorito: ${teams.home.name}`, summary: `${teams.home.name} com vantagem segundo IFT e forma.` };
        if (diff < -0.2) return { title: `Favorito: ${teams.away.name}`, summary: `${teams.away.name} apresenta melhor situação segundo IFT.` };
        return { title: 'Confronto equilibrado', summary: 'Sem favorito claro segundo o modelo híbrido.' };
      })();

      const powerScores = {
        weights,
        home: { IFT: homeIFT, raw: homeRaw, norm: normHome, h2hRaw: h2hFactor },
        away: { IFT: awayIFT, raw: awayRaw, norm: normAway, h2hRaw: -h2hFactor }
      };

      return {
        fixtureName,
        fixtureId,
        greenSuggestions: orderedSuggestions,
        narrative,
        mainPrediction: { home_win_prob: homeWin, draw_prob: draw, away_win_prob: awayWin, home_xg: homeXG, away_xg: awayXG },
        powerScores,
        correctScores,
        valuableBets
      };
    } catch (err) {
      console.error('Erro runFullAnalysis:', err);
      setError(`Erro na análise completa: ${err.message}`);
      return { fixtureName, error: err?.message ?? String(err) };
    } finally {
      setLoading(false);
    }
  }, [apiFetch, fetchRawDataForModel, fetchOdds]);

  return { loading, error, apiFetch, runFullAnalysis, fetchLeagueContext, fetchRawDataForModel };
};