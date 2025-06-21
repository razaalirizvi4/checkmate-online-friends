
import React from 'react';
import ChessGame from '../components/ChessGame';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Chess Master
          </h1>
          <p className="text-slate-300 text-xl">Play chess online with friends</p>
        </div>
        <ChessGame />
      </div>
    </div>
  );
};

export default Index;
