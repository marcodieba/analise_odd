import React, { useContext } from 'react';
import { AnalysisContext } from '../context/AnalysisContext';
import ResultMetric from './ResultMetric.jsx';
import MarketOpportunityCard from './MarketOpportunityCard.jsx';
import SentimentAnalysisCard from './SentimentAnalysisCard.jsx';
import BTTSAnalysisCard from './BTTSAnalysisCard.jsx';
import TacticalAIAnalysisCard from './TacticalAIAnalysisCard.jsx';
import H2HAnalysisCard from './H2HAnalysisCard.jsx';
import MomentumAnalysisCard from './MomentumAnalysisCard.jsx';

const ValuePanel = ({ onRegisterBet }) => {
    const { analysisState } = useContext(AnalysisContext);
    const { 
        results, error, sentimentAnalysis, bttsAnalysis, 
        tacticalAnalysis, h2hSignal, momentumData, 
        selectedFixtureId, fixtures
    } = analysisState;

    const fixtureName = selectedFixtureId
        ? fixtures.find(f => f.fixture.id.toString() === selectedFixtureId)?.teams.home.name + ' vs ' + fixtures.find(f => f.fixture.id.toString() === selectedFixtureId)?.teams.away.name
        : '';
        
    return (
        <>
            <h2 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">Análise de Valor por Mercado</h2>
            {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-md">{error}</div>}
            {results && (
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold text-emerald-400 mb-2">Golos Esperados (xG)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <ResultMetric label="xG Time da Casa" value={results.expectedGoals.home.toFixed(2)} />
                            <ResultMetric label="xG Time Visitante" value={results.expectedGoals.away.toFixed(2)} />
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <MarketOpportunityCard
                            marketTitle="1X2"
                            outcomes={results['1X2']}
                            onRegister={(betData) => onRegisterBet({ fixtureId: parseInt(selectedFixtureId), fixture: fixtureName, ...betData })}
                        />
                        <MarketOpportunityCard
                            marketTitle="Dupla Chance"
                            outcomes={results['DoubleChance']}
                            onRegister={(betData) => onRegisterBet({ fixtureId: parseInt(selectedFixtureId), fixture: fixtureName, ...betData })}
                        />
                         <MarketOpportunityCard
                            marketTitle="Ambas Marcam"
                            outcomes={results['BTTS']}
                            onRegister={(betData) => onRegisterBet({ fixtureId: parseInt(selectedFixtureId), fixture: fixtureName, ...betData })}
                        />
                    </div>
                    
                    <div className="space-y-4">
                        {sentimentAnalysis && (
                            <div>
                                <h3 className="text-lg font-semibold text-emerald-400 mb-2 mt-4">Moral da Equipa (Análise I.A.)</h3>
                                <SentimentAnalysisCard analysis={sentimentAnalysis} />
                            </div>
                        )}
                        {bttsAnalysis && (
                            <div>
                                <h3 className="text-lg font-semibold text-emerald-400 mb-2 mt-4">Análise Detalhada "Ambas Marcam"</h3>
                                <BTTSAnalysisCard analysis={bttsAnalysis} />
                            </div>
                        )}
                        {tacticalAnalysis.data && (
                            <div>
                                <h3 className="text-lg font-semibold text-emerald-400 mb-2 mt-4">Análise Tática (I.A.)</h3>
                                <TacticalAIAnalysisCard analysis={tacticalAnalysis} />
                            </div>
                        )}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {h2hSignal && (
                                <div>
                                    <h3 className="text-lg font-semibold text-emerald-400 mb-2 mt-4">Confronto Direto (H2H)</h3>
                                    <H2HAnalysisCard signal={h2hSignal.signal} message={h2hSignal.message} />
                                </div>
                            )}
                            {momentumData && (
                                <div>
                                    <h3 className="text-lg font-semibold text-emerald-400 mb-2 mt-4">Análise de Forma</h3>
                                    <MomentumAnalysisCard data={momentumData} teamNames={momentumData.teamNames} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ValuePanel;