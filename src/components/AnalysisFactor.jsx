import React from 'react';

const AnalysisFactor = ({ title, homeValue, awayValue, higherIsBetter = true }) => {
    let homeColor = 'text-gray-400';
    let awayColor = 'text-gray-400';
    let signal = 'Equilibrado';

    if (homeValue > awayValue) {
        homeColor = higherIsBetter ? 'text-green-400' : 'text-red-400';
        awayColor = higherIsBetter ? 'text-red-400' : 'text-green-400';
        signal = 'Vantagem Casa';
    } else if (awayValue > homeValue) {
        homeColor = higherIsBetter ? 'text-red-400' : 'text-green-400';
        awayColor = higherIsBetter ? 'text-green-400' : 'text-red-400';
        signal = 'Vantagem Visitante';
    }

    return (
        <div className="bg-gray-700/50 p-3 rounded-lg text-center">
            <h4 className="text-sm font-bold text-white mb-2">{title}</h4>
            <div className="flex justify-between items-center">
                <span className={`font-mono text-lg font-bold ${homeColor}`}>{homeValue.toFixed(2)}</span>
                <span className={`font-mono text-lg font-bold ${awayColor}`}>{awayValue.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{signal}</p>
        </div>
    );
};

export default AnalysisFactor;
