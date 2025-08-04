import React from 'react';

const PredictionPanel = ({ prediction }) => {
    if (!prediction) {
        return (
            <div className="bg-gray-800 p-6 rounded-lg text-center">
                <p className="text-gray-400">Aguardando dados suficientes para gerar uma previsão...</p>
            </div>
        );
    }

    const { outcome, probability, confidence } = prediction;

    const confidenceConfig = {
        'Alta': { color: 'bg-green-500', text: 'Alta' },
        'Média': { color: 'bg-yellow-500', text: 'Média' },
        'Baixa': { color: 'bg-red-500', text: 'Baixa' },
    };

    const currentConfidence = confidenceConfig[confidence];

    return (
        <div className="bg-gradient-to-br from-emerald-900 to-gray-800 p-6 rounded-lg shadow-lg border border-emerald-500/50">
            <h2 className="text-2xl font-bold text-white text-center mb-4">Previsão do Modelo</h2>
            
            <div className="text-center bg-gray-900/50 p-4 rounded-lg">
                <p className="text-sm text-gray-300">Resultado Mais Provável</p>
                <h3 className="text-4xl font-extrabold text-white my-2">{outcome}</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-700/50 p-3 rounded-lg text-center">
                    <label className="text-xs text-gray-400 uppercase">Probabilidade</label>
                    <p className="text-3xl font-bold text-white">{probability}%</p>
                </div>
                <div className="bg-gray-700/50 p-3 rounded-lg text-center">
                    <label className="text-xs text-gray-400 uppercase">Confiança</label>
                    <div className="flex items-center justify-center mt-2">
                        <span className={`px-3 py-1 text-lg font-bold text-white rounded-full ${currentConfidence.color}`}>
                            {currentConfidence.text}
                        </span>
                    </div>
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">
                A confiança é baseada na convergência entre estatísticas avançadas, forma recente e confronto direto (H2H).
            </p>
        </div>
    );
};

export default PredictionPanel;
