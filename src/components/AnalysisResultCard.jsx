import React, { useState } from 'react';
import ResultMetric from './ResultMetric.jsx';
import H2HAnalysisCard from './H2HAnalysisCard.jsx';
import MomentumAnalysisCard from './MomentumAnalysisCard.jsx';
import LineupAnalysisCard from './LineupAnalysisCard.jsx';
import StyleClashCard from './StyleClashCard.jsx';
import BTTSAnalysisCard from './BTTSAnalysisCard.jsx';
import SentimentAnalysisCard from './SentimentAnalysisCard.jsx';
import TacticalAIAnalysisCard from './TacticalAIAnalysisCard.jsx';
import MarketOpportunityCard from './MarketOpportunityCard.jsx';
import GreenAnalysisCard from './GreenAnalysisCard.jsx';
import HighProbabilityCard from './HighProbabilityCard.jsx';

const AnalysisResultCard = ({ analysis, onRegisterBet }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { fixtureName, error } = analysis;

    if (error) {
        return (
            <div className="bg-gray-800 border border-red-500/30 p-4 rounded-lg">
                <p className="font-bold text-white">{fixtureName}</p>
                <p className="text-sm text-red-400 mt-1">{error}</p>
            </div>
        );
    }
    
    const {
        h2hSignal, momentumData, contextData, styleClash,
        bttsAnalysis, sentimentAnalysis, tacticalAnalysis, 
        greenAnalysis, highProbAnalysis, results
    } = analysis.fullData;

    if (!results) return null; // Não renderiza se não houver resultados calculados

    const handleRegister = (betData) => {
        onRegisterBet({
            fixtureId: analysis.fixtureId,
            fixture: fixtureName,
            ...betData,
        });
    };

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left"
            >
                <span className="font-bold text-lg text-white">{fixtureName}</span>
                <span className={`transform transition-transform duration-200 text-emerald-400 ${isOpen ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </button>
            
            {isOpen && (
                <div className="p-4 border-t border-gray-700 space-y-6">
                    {/* Resumo Rápido */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <GreenAnalysisCard analysis={greenAnalysis} onRegister={() => handleRegister({
                            market: greenAnalysis?.bestBet?.outcome,
                            odd: greenAnalysis?.bestBet?.odd,
                            stake: (greenAnalysis?.bestBet?.kellyStake || 0) * 100
                        })} />
                        <HighProbabilityCard analysis={highProbAnalysis} onRegister={() => handleRegister({
                            market: highProbAnalysis?.bestBet?.outcome,
                            odd: highProbAnalysis?.bestBet?.odd,
                            stake: (highProbAnalysis?.bestBet?.kellyStake || 0) * 100
                        })} />
                    </div>

                    {/* Análise de Valor por Mercado */}
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4">Análise de Valor por Mercado</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <MarketOpportunityCard marketTitle="1X2" outcomes={results['1X2']} onRegister={(bet) => handleRegister(bet)} />
                            <MarketOpportunityCard marketTitle="Dupla Chance" outcomes={results['DoubleChance']} onRegister={(bet) => handleRegister(bet)} />
                            <MarketOpportunityCard marketTitle="Ambas Marcam" outcomes={results['BTTS']} onRegister={(bet) => handleRegister(bet)} />
                        </div>
                    </div>

                    {/* Análises Qualitativas e Contextuais */}
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4">Contexto e Análises Adicionais</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {contextData && <LineupAnalysisCard lineups={contextData.lineups} injuries={contextData.injuries} teamNames={contextData.teamNames} />}
                            {momentumData && <MomentumAnalysisCard data={momentumData} teamNames={momentumData.teamNames} />}
                            {h2hSignal && <H2HAnalysisCard signal={h2hSignal.signal} message={h2hSignal.message} />}
                            {styleClash && <StyleClashCard analysis={styleClash} />}
                            {sentimentAnalysis && <SentimentAnalysisCard analysis={sentimentAnalysis} />}
                            {tacticalAnalysis.data && <TacticalAIAnalysisCard analysis={tacticalAnalysis} />}
                            {bttsAnalysis && <BTTSAnalysisCard analysis={bttsAnalysis} />}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalysisResultCard;