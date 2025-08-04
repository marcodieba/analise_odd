import React from 'react';

const TacticalAIAnalysisCard = ({ analysis }) => {
    // Estado de Carregamento
    if (analysis.loading) {
        return (
            <div className="bg-gray-700/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-emerald-400 mb-2">Análise Tática (I.A.)</h3>
                <p className="text-gray-400 text-sm">A I.A. está a analisar os confrontos diretos...</p>
            </div>
        );
    }

    // Estado de Erro ou Sem Análise
    if (analysis.error || !analysis.data) {
        return (
             <div className="bg-gray-700/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-emerald-400 mb-2">Análise Tática (I.A.)</h3>
                <p className="text-yellow-400 text-sm">Não foi possível realizar a análise tática.</p>
            </div>
        );
    }
    
    const { title, summary, prediction_btts, prediction_goals } = analysis.data;

    return (
        <div className="bg-gray-700/50 p-4 rounded-lg space-y-3">
            <h3 className="text-lg font-semibold text-emerald-400">Análise Tática (I.A.)</h3>
            <div>
                <h4 className="font-bold text-white">Padrão Identificado:</h4>
                <p className="text-sm text-gray-300 italic">"{title}"</p>
            </div>
            <div>
                <h4 className="font-bold text-white">Resumo Tático:</h4>
                <p className="text-sm text-gray-400">{summary}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center pt-2">
                <div className="bg-gray-900/40 p-2 rounded-md">
                    <p className="text-xs text-gray-400">Previsão BTTS (I.A.)</p>
                    <p className="font-bold text-white">{prediction_btts}</p>
                </div>
                 <div className="bg-gray-900/40 p-2 rounded-md">
                    <p className="text-xs text-gray-400">Previsão Golos (I.A.)</p>
                    <p className="font-bold text-white">{prediction_goals}</p>
                </div>
            </div>
        </div>
    );
};

export default TacticalAIAnalysisCard;
