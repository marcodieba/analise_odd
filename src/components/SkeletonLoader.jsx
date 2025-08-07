import React from 'react';

const SkeletonCard = () => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
        <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            <div className="h-10 bg-gray-700 rounded w-1/2 mt-4"></div>
        </div>
    </div>
);

const SkeletonLoader = () => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SkeletonCard />
                <SkeletonCard />
            </div>
            <div className="space-y-4">
                <div className="h-8 bg-gray-800 rounded w-1/3"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="h-32 bg-gray-800 rounded-lg"></div>
                    <div className="h-32 bg-gray-800 rounded-lg"></div>
                    <div className="h-32 bg-gray-800 rounded-lg"></div>
                </div>
            </div>
            <div className="space-y-4">
                <div className="h-8 bg-gray-800 rounded w-1/3"></div>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="h-40 bg-gray-800 rounded-lg"></div>
                    <div className="h-40 bg-gray-800 rounded-lg"></div>
                </div>
            </div>
        </div>
    );
};

export default SkeletonLoader;