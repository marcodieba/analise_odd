// src/components/OpportunitiesRankingCard.jsx
import React from 'react';
import { kellyCriterion } from '../utils/math';

const normalizeBetShape = (b) => {
  // try to standardize different shapes (valuableBets, greenSuggestions, old structure)
  // result: { market, outcome, prob, odd?, value?, kellyStake? }
  if (!b) return null;
  if (b.prob !== undefined && (b.odd !== undefined || b.value !== undefined || b.kellyStake !== undefined)) {
    return {
      market: b.market ?? b[0] ?? 'Resultado Final',
      outcome: b.outcome ?? b.value ?? b[1] ?? '—',
      prob: Number(b.prob ?? 0),
      odd: b.odd ? Number(b.odd) : (b.value && b.prob ? (1 / b.prob) : null),
      value: b.value ?? (b.odd && b.prob ? (b.odd * b.prob - 1) : 0),
      kellyStake: b.kellyStake ?? (b.odd && b.prob ? kellyCriterion(Number(b.odd), Number(b.prob), 0.25) : 0)
    };
  }
  // greenSuggestions shape: {market, outcome, prob, kelly}
  if (b.market && b.outcome && b.prob !== undefined) {
    return {
      market: b.market,
      outcome: b.outcome,
      prob: Number(b.prob),
      odd: b.odd ? Number(b.odd) : (b.prob > 0 ? Number((1 / b.prob).toFixed(2)) : null),
      value: b.value ?? (b.prob > 0 ? ((1 / b.prob) * b.prob - 1) : 0),
      kellyStake: b.kelly ?? (b.prob > 0 ? kellyCriterion((1 / b.prob), b.prob, 0.25) : 0)
    };
  }
  return {
    market: b.market ?? 'Resultado Final',
    outcome: b.outcome ?? '—',
    prob: Number(b.prob ?? 0),
    odd: b.odd ? Number(b.odd) : (b.prob > 0 ? Number((1 / b.prob).toFixed(2)) : null),
    value: b.value ?? 0,
    kellyStake: b.kellyStake ?? 0
  };
};

const OpportunitiesRankingCard = ({ analysis, greenSuggestions, onRegister, fixtureName, fixtureId }) => {
  const raw = analysis && analysis.length ? analysis : (greenSuggestions && greenSuggestions.length ? greenSuggestions : []);
  const bets = raw.map(normalizeBetShape).filter(Boolean);

  if (!bets || bets.length === 0) {
    return (
      <div className="bg-gray-700/50 p-6 rounded-lg text-center">
        <h3 className="text-xl font-bold text-white">Ranking de Oportunidades</h3>
        <p className="text-gray-400 mt-2">Nenhuma oportunidade encontrada.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-700/50 p-6 rounded-lg">
      <h3 className="text-xl font-bold text-white mb-4 text-center">🏆 Ranking de Oportunidades</h3>
      <div className="space-y-3">
        {bets.map((bet, index) => (
          <div key={index} className={`p-4 rounded-lg border ${index === 0 ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-gray-800/40 border-gray-600/30'}`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-gray-300">{bet.market}</span>
                <p className="font-bold text-lg text-white">{bet.outcome}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-400">{(bet.prob * 100).toFixed(1)}%</p>
                <p className="text-xs text-gray-400">Probabilidade</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
              <div>
                <p className="text-gray-400">Odd</p>
                <p className="font-mono text-white text-base">{bet.odd ? Number(bet.odd).toFixed(2) : '—'}</p>
              </div>
              <div>
                <p className="text-gray-400">Valor (EV)</p>
                <p className="font-mono text-green-400 text-base">{(Number(bet.value || 0) * 100).toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-gray-400">Stake (Kelly 1/4)</p>
                <p className="font-mono text-cyan-300 text-base">{((bet.kellyStake ?? 0) * 100).toFixed(2)}%</p>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => onRegister && onRegister({
                  fixtureId,
                  fixture: fixtureName,
                  market: bet.market,
                  outcome: bet.outcome,
                  odd: bet.odd ? Number(bet.odd) : null,
                  stake: (bet.kellyStake ?? 0) * 100
                })}
                className="w-full bg-gray-600 hover:bg-gray-500 text-white text-xs font-bold py-2 px-2 rounded-md transition"
              >
                Registar Aposta
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OpportunitiesRankingCard;
