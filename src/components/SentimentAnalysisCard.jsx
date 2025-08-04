import React from 'react';

const SentimentAnalysisCard = ({ analysis }) => {
    if (!analysis) return null;

    const getSentimentConfig = (score) => {
        if (score >= 3) return { text: 'Positivo', color: 'text-green-400', icon: '😊' };
        if (score <= -3) return { text: 'Negativo', color: 'text-red-400', icon: '😟' };
        return { text: 'Neutro', color: 'text-yellow-400', icon: '😐' };
    };

    const renderTeamAnalysis = (teamData, teamName) => {
        if (!teamData) return <p className="text-gray-500 text-sm">A aguardar análise...</p>;
        if (teamData.error) return <p className="text-red-500 text-sm">{teamData.error}</p>;

        const config = getSentimentConfig(teamData.score);

        return (
            <div>
                <h5 className="font-bold text-white text-center mb-2">{teamName}</h5>
                <div className="bg-gray-900/50 p-3 rounded-lg text-center">
                    <p className={`text-3xl font-bold ${config.color}`}>{config.icon} {teamData.score}</p>
                    <p className="text-xs text-gray-400 mt-1">{config.text}</p>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center italic">"{teamData.summary}"</p>
            </div>
        );
    };

    return (
        <div className="bg-gray-700/50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderTeamAnalysis(analysis.home, analysis.teamNames.home.name)}
                {renderTeamAnalysis(analysis.away, analysis.teamNames.away.name)}
            </div>
        </div>
    );
};

export default SentimentAnalysisCard;
