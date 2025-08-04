import React from 'react';

const ResultMetric = ({ label, value }) => (
    <div className="bg-gray-700/50 p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <span className="text-sm text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-2xl font-bold text-white">{value}</span>
    </div>
);

export default ResultMetric;