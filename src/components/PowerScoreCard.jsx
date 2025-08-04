// src/components/PowerScoreCard.jsx

import React from 'react';

const ScoreBar = ({ label, score, weight, color = 'bg-emerald-500' }) => {
    const maxScore = 2000; // Valor de referência para a barra
    const percentage = Math.min(100, (Math.abs(score) / maxScore) * 100 * (5 / weight)); // Ajuste para visualização

    return (
        <div>
            <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>{label} <span className="text-gray-500">({weight}%)</span></span>
                <span className="font-bold">{Math.round(score)}</span>
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

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4 text-center">📊 Power Score Detalhado</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* Coluna Casa */}
                <div>
                    <h4 className="font-semibold text-center text-emerald-400 mb-2">{analysisResult.fixtureName.split(' vs ')[0]}</h4>
                    <div className="space-y-3">
                        <ScoreBar label="Força Base (ELO)" score={home.eloScore} weight={40} color="bg-blue-500" />
                        <ScoreBar label="Forma Recente" score={home.weightedFormScore} weight={25} color="bg-yellow-500" />
                        <ScoreBar label="Ataque (Casa)" score={home.homeAttack * 100} weight={15} color="bg-green-500" />
                        <ScoreBar label="H2H Factor" score={home.h2hFactor * 100} weight={10} color="bg-purple-500" />
                        <ScoreBar label="Eficiência" score={home.homeEfficiency} weight={10} color="bg-pink-500" />
                        <div className="text-center pt-2 border-t border-gray-700">
                            <p className="text-xs text-gray-400">Score Ofensivo Total</p>
                            <p className="text-2xl font-bold text-white">{Math.round(home.offensiveScore)}</p>
                        </div>
                    </div>
                </div>
                {/* Coluna Visitante */}
                <div>
                     <h4 className="font-semibold text-center text-emerald-400 mb-2">{analysisResult.fixtureName.split(' vs ')[1]}</h4>
                     <div className="space-y-3">
                        <ScoreBar label="Força Base (ELO)" score={away.eloScore} weight={40} color="bg-blue-500" />
                        <ScoreBar label="Forma Recente" score={away.weightedFormScore} weight={25} color="bg-yellow-500" />
                        <ScoreBar label="Ataque (Fora)" score={away.awayAttack * 100} weight={15} color="bg-green-500" />
                        <ScoreBar label="H2H Factor" score={away.h2hFactor * 100} weight={10} color="bg-purple-500" />
                        <ScoreBar label="Eficiência" score={away.awayEfficiency} weight={10} color="bg-pink-500" />
                        <div className="text-center pt-2 border-t border-gray-700">
                            <p className="text-xs text-gray-400">Score Ofensivo Total</p>
                            <p className="text-2xl font-bold text-white">{Math.round(away.offensiveScore)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PowerScoreCard;