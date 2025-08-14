// src/components/PowerScoreCard.jsx
import React from 'react';

const ScoreBar = ({ label, rawValue, normalizedValue, weight, color }) => {
  const percentage = Math.max(5, Math.min(100, (normalizedValue ?? 0) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-300 mb-1">
        <span>{label} <span className="text-gray-500">({(weight ?? 0).toFixed ? (weight * 100).toFixed(0) + '%' : `${weight}`})</span></span>
        <span className="font-bold font-mono">{rawValue ?? '—'}</span>
      </div>
      <div className="w-full bg-gray-600 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const PowerScoreCard = ({ analysisResult }) => {
  // backward/forward compatibility: analysisResult.powerScores or direct powerScores prop
  const powerScores = analysisResult?.powerScores ?? analysisResult ?? null;
  if (!powerScores || !powerScores.home || !powerScores.away) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg">
        <p className="text-gray-400">Dados de IFT indisponíveis.</p>
      </div>
    );
  }

  const { home, away, weights } = powerScores;
  // ensure fixtureName extraction
  const fixtureName = analysisResult?.fixtureName?.split?.(' vs ') || ['Casa', 'Visitante'];

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <h3 className="text-lg font-bold text-white mb-4 text-center">📊 Índice de Força do Time (IFT)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {/* Casa */}
        <div>
          <h4 className="font-semibold text-center text-emerald-400 mb-2 truncate">{fixtureName[0]}</h4>
          <div className="space-y-3">
            <ScoreBar
              label="ELO Rating"
              rawValue={Math.round(home?.raw?.elo ?? 0)}
              normalizedValue={home?.norm?.elo ?? (home?.raw?.elo ? (home.raw.elo/2000) : 0)}
              weight={weights?.elo ?? 0}
              color="bg-blue-500"
            />
            <ScoreBar
              label="Forma Recente"
              rawValue={((home?.raw?.form ?? 0)).toFixed(2)}
              normalizedValue={home?.norm?.form ?? 0}
              weight={weights?.form ?? 0}
              color="bg-yellow-500"
            />
            <ScoreBar
              label="Força (Casa)"
              rawValue={`${(home?.raw?.strength?.home?.attack ?? 0).toFixed(2)}/${(home?.raw?.strength?.home?.defense ?? 0).toFixed(2)}`}
              normalizedValue={home?.norm?.strength ?? 0}
              weight={weights?.strength ?? 0}
              color="bg-green-500"
            />
            <ScoreBar
              label="Eficiência"
              rawValue={`${(((home?.raw?.efficiency ?? 0)) * 100).toFixed(1)}%`}
              normalizedValue={home?.norm?.efficiency ?? 0}
              weight={weights?.efficiency ?? 0}
              color="bg-pink-500"
            />
            <ScoreBar
              label="Fator H2H"
              rawValue={(home?.h2hRaw ?? 0).toFixed(2)}
              normalizedValue={home?.norm?.h2h ?? 0}
              weight={weights?.h2h ?? 0}
              color="bg-purple-500"
            />

            <div className="text-center pt-2 border-t border-gray-700">
              <p className="text-xs text-gray-400">IFT Final</p>
              <p className="text-3xl font-bold text-white">
                {(home?.IFT ?? 0).toFixed(3)}
              </p>
            </div>
          </div>
        </div>

        {/* Visitante */}
        <div>
          <h4 className="font-semibold text-center text-emerald-400 mb-2 truncate">{fixtureName[1]}</h4>
          <div className="space-y-3">
            <ScoreBar
              label="ELO Rating"
              rawValue={Math.round(away?.raw?.elo ?? 0)}
              normalizedValue={away?.norm?.elo ?? (away?.raw?.elo ? (away.raw.elo/2000) : 0)}
              weight={weights?.elo ?? 0}
              color="bg-blue-500"
            />
            <ScoreBar
              label="Forma Recente"
              rawValue={((away?.raw?.form ?? 0)).toFixed(2)}
              normalizedValue={away?.norm?.form ?? 0}
              weight={weights?.form ?? 0}
              color="bg-yellow-500"
            />
            <ScoreBar
              label="Força (Fora)"
              rawValue={`${(away?.raw?.strength?.away?.attack ?? 0).toFixed(2)}/${(away?.raw?.strength?.away?.defense ?? 0).toFixed(2)}`}
              normalizedValue={away?.norm?.strength ?? 0}
              weight={weights?.strength ?? 0}
              color="bg-green-500"
            />
            <ScoreBar
              label="Eficiência"
              rawValue={`${(((away?.raw?.efficiency ?? 0)) * 100).toFixed(1)}%`}
              normalizedValue={away?.norm?.efficiency ?? 0}
              weight={weights?.efficiency ?? 0}
              color="bg-pink-500"
            />
            <ScoreBar
              label="Fator H2H"
              rawValue={(away?.h2hRaw ?? 0).toFixed(2)}
              normalizedValue={away?.norm?.h2h ?? 0}
              weight={weights?.h2h ?? 0}
              color="bg-purple-500"
            />

            <div className="text-center pt-2 border-t border-gray-700">
              <p className="text-xs text-gray-400">IFT Final</p>
              <p className="text-3xl font-bold text-white">
                {(away?.IFT ?? 0).toFixed(3)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pesos aplicados */}
      <div className="mt-4 text-sm text-gray-300">
        <div className="font-semibold mb-2">Pesos Híbridos Aplicados</div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(weights || {}).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="capitalize">{k}</span>
              <span>{(v * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PowerScoreCard;
