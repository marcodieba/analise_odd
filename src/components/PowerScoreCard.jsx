// src/components/PowerScoreCard.jsx

import React from 'react';

const safeNumber = (val, fallback = 0) => (isNaN(Number(val)) ? fallback : Number(val));

const ScoreBar = ({ label, score, weight, color = 'bg-emerald-500' }) => {
    // Normaliza a pontuação para uma barra visualmente apelativa
    const normalize = (val, max) => (val / max) * 100;
    let percentage = 0;
    if (label.includes('ELO')) percentage = normalize(safeNumber(score), 2500);
    else if (label.includes('Forma')) percentage = Math.min(100, Math.abs(safeNumber(score)) / 2);
    else percentage = Math.min(100, Math.abs(safeNumber(score)));

    return (
        <div>
            <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>{label} <span className="text-gray-500">({weight}%)</span></span>
                <span className="font-bold">
                  {isNaN(score) ? '0.0%' : (safeNumber(score) * 100).toFixed(1) + '%'}
                </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
                <div 
                    className={`${color} h-2 rounded-full`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};

const PowerScoreCard = ({ analysisResult }) => {
    if (!analysisResult || !analysisResult.powerScores) {
        return null;
    }

    const { home, away } = analysisResult.powerScores;
    const fixtureName = analysisResult.fixtureName.split(' vs ');

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4 text-center">📊 Power Score Detalhado</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* Coluna Casa */}
                <div>
                    <h4 className="font-semibold text-center text-emerald-400 mb-2 truncate">{fixtureName[0]}</h4>
                    <div className="space-y-3">
                        <ScoreBar label="Força Base (ELO)" score={safeNumber(home?.eloScore)} weight={40} color="bg-blue-500" />
                        <ScoreBar label="Forma Recente" score={safeNumber(home?.weightedFormScore)} weight={25} color="bg-yellow-500" />
                        <ScoreBar label="Ataque (Casa)" score={safeNumber(home?.homeAttack)} weight={15} color="bg-green-500" />
                        <ScoreBar label="H2H Factor" score={safeNumber(home?.h2hFactor)} weight={10} color="bg-purple-500" />
                        <ScoreBar label="Eficiência" score={safeNumber(home?.homeEfficiency)} weight={10} color="bg-pink-500" />
                        <div className="text-center pt-2 border-t border-gray-700">
                            <p className="text-xs text-gray-400">Score Ofensivo Total</p>
                            <p className="text-2xl font-bold text-white">
                              {isNaN(home?.offensiveScore) ? '0' : Math.round(safeNumber(home?.offensiveScore))}
                            </p>
                        </div>
                    </div>
                </div>
                {/* Coluna Visitante */}
                <div>
                     <h4 className="font-semibold text-center text-emerald-400 mb-2 truncate">{fixtureName[1]}</h4>
                     <div className="space-y-3">
                        <ScoreBar label="Força Base (ELO)" score={safeNumber(away?.eloScore)} weight={40} color="bg-blue-500" />
                        <ScoreBar label="Forma Recente" score={safeNumber(away?.weightedFormScore)} weight={25} color="bg-yellow-500" />
                        <ScoreBar label="Ataque (Fora)" score={safeNumber(away?.awayAttack) * 100} weight={15} color="bg-green-500" />
                        <ScoreBar label="H2H Factor" score={safeNumber(away?.h2hFactor) * 100} weight={10} color="bg-purple-500" />
                        <ScoreBar label="Eficiência" score={safeNumber(away?.awayEfficiency)} weight={10} color="bg-pink-500" />
                        <div className="text-center pt-2 border-t border-gray-700">
                            <p className="text-xs text-gray-400">Score Ofensivo Total</p>
                            <p className="text-2xl font-bold text-white">
                              {isNaN(away?.offensiveScore) ? '0' : Math.round(safeNumber(away?.offensiveScore))}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PowerScoreCard;