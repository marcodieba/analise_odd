import React from 'react';

const ValueAnalysisCard = ({ market, bookieOdd, fairOdd, value, kellyStake, onRegister }) => {
    const hasValue = value > 0;
    const valueColor = hasValue ? 'text-green-400' : 'text-red-400';
    const bgColor = hasValue ? 'bg-green-500/10' : 'bg-red-500/10';
    const borderColor = hasValue ? 'border-green-500/30' : 'border-red-500/30';

    return (
        <div className={`p-4 rounded-xl border ${borderColor} ${bgColor} flex flex-col space-y-2 transition-all duration-300`}>
            <h3 className="text-lg font-bold text-center text-white">{market}</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-400">Odd da Casa:</span>
                <span className="text-white font-mono text-right">{bookieOdd.toFixed(2)}</span>
                <span className="text-gray-400">Odd Justa:</span>
                <span className="text-white font-mono text-right">{fairOdd.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-600 my-1"></div>
            <div className="text-center">
                <span className="text-gray-400 text-sm">Valor Encontrado (EV)</span>
                <p className={`text-2xl font-bold ${valueColor}`}>
                    {value > 0 ? '+' : ''}{(value * 100).toFixed(2)}%
                </p>
            </div>
            
            {hasValue && (
                <>
                    <div className="border-t border-gray-600 my-1"></div>
                    <div className="text-center bg-cyan-500/10 rounded-md py-1">
                        <span className="text-gray-400 text-sm">Stake Sugerido (Kelly 1/4)</span>
                        <p className="text-xl font-bold text-cyan-300">
                            {(kellyStake * 100).toFixed(2)}%
                        </p>
                    </div>
                    <button 
                        onClick={onRegister}
                        className="w-full mt-2 bg-gray-600 hover:bg-gray-500 text-white text-xs font-bold py-1.5 px-2 rounded-md transition"
                    >
                        Registar Aposta
                    </button>
                </>
            )}
        </div>
    );
};

export default ValueAnalysisCard;
