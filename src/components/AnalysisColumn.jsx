import React, { useContext } from 'react';
import { AnalysisContext } from '../context/AnalysisContext';
import GreenAnalysisCard from './GreenAnalysisCard.jsx';
import HighProbabilityCard from './HighProbabilityCard.jsx';
import LineupAnalysisCard from './LineupAnalysisCard.jsx';

const AnalysisColumn = ({ onRegisterBet }) => {
    const { analysisState } = useContext(AnalysisContext);
    const { results, greenAnalysis, highProbAnalysis, contextData, selectedFixtureId, fixtures } = analysisState;

    const fixtureName = selectedFixtureId
        ? fixtures.find(f => f.fixture.id.toString() === selectedFixtureId)?.teams.home.name + ' vs ' + fixtures.find(f => f.fixture.id.toString() === selectedFixtureId)?.teams.away.name
        : '';

    return (
        <div className="space-y-4 mt-6">
            {results && (
                <>
                    <GreenAnalysisCard analysis={greenAnalysis} onRegister={() => {
                        if (greenAnalysis && greenAnalysis.bestBet) {
                            onRegisterBet({
                                fixtureId: parseInt(selectedFixtureId),
                                fixture: fixtureName,
                                market: greenAnalysis.bestBet.outcome,
                                odd: greenAnalysis.bestBet.odd,
                                stake: greenAnalysis.bestBet.kellyStake * 100,
                            });
                        }
                    }} />
                    <HighProbabilityCard analysis={highProbAnalysis} onRegister={() => {
                        if (highProbAnalysis && highProbAnalysis.bestBet) {
                            onRegisterBet({
                                fixtureId: parseInt(selectedFixtureId),
                                fixture: fixtureName,
                                market: highProbAnalysis.bestBet.outcome,
                                odd: highProbAnalysis.bestBet.odd,
                                stake: (highProbAnalysis.bestBet.kellyStake || 0) * 100,
                            });
                        }
                    }} />
                </>
            )}
            {contextData && (
                <div>
                    <h3 className="text-lg font-semibold text-emerald-400 mb-2">Contexto do Jogo</h3>
                    <LineupAnalysisCard lineups={contextData.lineups} injuries={contextData.injuries} teamNames={contextData.teamNames} />
                </div>
            )}
        </div>
    );
};

export default AnalysisColumn;