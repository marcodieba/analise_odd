// src/components/AnalysisResultCard.jsx

import React, { useState } from 'react';
import H2HAnalysisCard from './H2HAnalysisCard.jsx';
import MomentumAnalysisCard from './MomentumAnalysisCard.jsx';
import LineupAnalysisCard from './LineupAnalysisCard.jsx';
import StyleClashCard from './StyleClashCard.jsx';
import BTTSAnalysisCard from './BTTSAnalysisCard.jsx';
import SentimentAnalysisCard from './SentimentAnalysisCard.jsx';
import TacticalAIAnalysisCard from './TacticalAIAnalysisCard.jsx';
// NOVO: Importa o nosso novo card genérico
import BetSuggestionCard from './BetSuggestionCard.jsx';

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
    
    // Simplifica a busca pela melhor oportunidade de valor para cada mercado
    const findBestValueBet = (marketOutcomes) => {
        const valueBets = Object.values(marketOutcomes || {}).filter(data => data.value > 0.01);
        if (valueBets.length === 0) return null;
        return valueBets.sort((a, b) => b.prob - a.prob)[0];
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
                    {/* Resumo Rápido com o novo componente */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <BetSuggestionCard
                            title="Oportunidade Green"
                            bet={greenAnalysis?.bestBet}
                            onRegister={() => handleRegister(greenAnalysis?.bestBet)}
                            variant="green"
                        />
                        <BetSuggestionCard
                            title="Aposta Mais Provável"
                            bet={highProbAnalysis?.bestBet}
                            onRegister={() => handleRegister(highProbAnalysis?.bestBet)}
                            variant="high-prob"
                        />
                    </div>

                    {/* Análise de Valor por Mercado com o novo componente */}
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4">Análise de Valor por Mercado</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <BetSuggestionCard
                                title="1X2"
                                bet={findBestValueBet(results['1X2'])}
                                onRegister={() => handleRegister(findBestValueBet(results['1X2']))}
                                variant="default"
                            />
                             <BetSuggestionCard
                                title="Dupla Chance"
                                bet={findBestValueBet(results['DoubleChance'])}
                                onRegister={() => handleRegister(findBestValueBet(results['DoubleChance']))}
                                variant="default"
                            />
                             <BetSuggestionCard
                                title="Ambas Marcam"
                                bet={findBestValueBet(results['BTTS'])}
                                onRegister={() => handleRegister(findBestValueBet(results['BTTS']))}
                                variant="default"
                            />
                        </div>
                    </div>

                    {/* Análises Qualitativas e Contextuais (sem alteração) */}
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