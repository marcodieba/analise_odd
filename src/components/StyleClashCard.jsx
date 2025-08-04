import React from 'react';

// Configuração para os ícones e cores dos alertas de estilo
const styleConfig = {
    alert: { icon: '⚠️', color: 'text-yellow-400' },
    confirm: { icon: '✅', color: 'text-green-400' },
    neutral: { icon: '🔎', color: 'text-cyan-400' },
};

const StyleClashCard = ({ analysis }) => {
    if (!analysis) return null;

    const config = styleConfig[analysis.signal] || styleConfig.neutral;

    return (
        <div className="bg-gray-700/50 p-4 rounded-lg">
            <div className="flex items-start space-x-4">
                <div className="text-2xl mt-1">{config.icon}</div>
                <div>
                    <h4 className={`font-bold ${config.color}`}>{analysis.title}</h4>
                    <p className="text-sm text-gray-400">{analysis.message}</p>
                </div>
            </div>
        </div>
    );
};

export default StyleClashCard;
