import React from 'react';

// Configuração para os sinais de momentum
const momentumConfig = {
    high: { text: 'Em Alta', color: 'text-green-400', icon: '🟢' },
    stable: { text: 'Estável', color: 'text-yellow-400', icon: '🟡' },
    low: { text: 'Em Baixa', color: 'text-red-400', icon: '🔴' },
};

// Componente para renderizar uma única letra da forma com a cor apropriada
const FormChar = ({ char }) => {
    const color = char === 'V' ? 'bg-green-500' : char === 'D' ? 'bg-red-500' : 'bg-yellow-500';
    return <span className={`w-5 h-5 flex items-center justify-center text-xs font-bold text-white rounded-full ${color}`}>{char}</span>;
};

const MomentumAnalysisCard = ({ data, teamNames }) => {
    if (!data) return null;

    const { home, away } = data;
    const homeMomentum = momentumConfig[home.signal];
    const awayMomentum = momentumConfig[away.signal];

    const MetricRow = ({ title, homeValue, awayValue }) => (
        <div className="flex justify-between items-center py-1.5 border-b border-gray-600/50">
            <span className="w-1/3 text-right pr-4 text-white font-bold">{homeValue}</span>
            <span className="w-1/3 text-center text-gray-400 text-xs uppercase">{title}</span>
            <span className="w-1/3 text-left pl-4 text-white font-bold">{awayValue}</span>
        </div>
    );

    return (
        <div className="bg-gray-700/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
                <h5 className="font-bold text-white w-1/3 text-center text-sm">{teamNames.home}</h5>
                <div className="w-1/3"></div>
                <h5 className="font-bold text-white w-1/3 text-center text-sm">{teamNames.away}</h5>
            </div>

            <MetricRow 
                title="Forma"
                homeValue={<div className="flex justify-end gap-1">{home.form.split('').map((char, i) => <FormChar key={i} char={char} />)}</div>}
                awayValue={<div className="flex justify-start gap-1">{away.form.split('').map((char, i) => <FormChar key={i} char={char} />)}</div>}
            />
            <MetricRow title="Pontos" homeValue={`${home.points} / 15`} awayValue={`${away.points} / 15`} />
            <MetricRow title="Golos (M-S)" homeValue={`${home.goalsFor ?? 0}-${home.goalsAgainst ?? 0}`} awayValue={`${away.goalsFor ?? 0}-${away.goalsAgainst ?? 0}`} />
            <MetricRow title="Momentum" homeValue={<span className={`${homeMomentum.color} text-sm`}>{homeMomentum.icon} {homeMomentum.text}</span>} awayValue={<span className={`${awayMomentum.color} text-sm`}>{awayMomentum.icon} {awayMomentum.text}</span>} />
        </div>
    );
};

export default MomentumAnalysisCard;
