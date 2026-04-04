import React, { useMemo } from 'react';
import { GameState } from '../types';
import { calculateScores } from '../services/scoringService';
import Scorecard from './Scorecard';
import { TrophyIcon } from './icons/TrophyIcon';

interface SpectatorScreenProps {
  gameState: GameState;
  isLive?: boolean;
  onBack?: () => void;
  hasActiveGame?: boolean;
}

const SpectatorScreen: React.FC<SpectatorScreenProps> = ({ gameState, isLive = false, onBack, hasActiveGame = false }) => {
    const calculatedScores = useMemo(() => calculateScores(gameState), [gameState]);
    const isMatchPlay = gameState.gameType === 'Match Play';
    const scoreLabel = isMatchPlay ? '' : gameState.gameType === 'Medal' ? 'Strokes' : gameState.gameType === 'Skins' ? 'Skins' : 'Points';

    return (
        <div className="space-y-8">
            {onBack && (
              <div className="flex items-center justify-between">
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-light-slate hover:bg-gray-500 text-white rounded-lg transition-colors"
                >
                  &larr; {hasActiveGame ? 'Back to My Game' : 'Back'}
                </button>
              </div>
            )}
            {isLive ? (
              <div className="bg-green-900 border-l-4 border-green-400 text-green-100 p-4 rounded-lg" role="status">
                <p className="font-bold flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  Live Scorecard
                </p>
                <p>Scores update automatically as players enter them. {gameState.status === 'finished' ? 'This round has finished.' : `Currently on hole ${gameState.currentHole + 1}.`}</p>
              </div>
            ) : (
              <div className="bg-yellow-900 border-l-4 border-yellow-400 text-yellow-100 p-4 rounded-lg" role="alert">
                <p className="font-bold">Spectator View</p>
                <p>You are viewing a shared snapshot of a game. This page does not update in real-time. Ask the player for a new link for the latest scores.</p>
              </div>
            )}
            
            <div className="text-center bg-medium-slate p-4 rounded-lg shadow-lg">
                <h2 className="text-3xl font-bold text-light-green">{gameState.course.name}</h2>
                <p className="text-lg text-gray-300">{gameState.gameType} Leaderboard</p>
                <p className="text-sm text-gray-400 mt-2">Game ID: <span className="font-mono bg-dark-slate px-2 py-1 rounded">{gameState.id}</span></p>
            </div>

            <div className="bg-medium-slate p-6 rounded-lg shadow-lg">
                <h3 className="text-2xl font-semibold mb-4 text-center flex items-center justify-center gap-2">
                <TrophyIcon className="h-6 w-6 text-light-green"/>
                Rankings
                </h3>
                <div className="space-y-3">
                {calculatedScores.map((score, index) => (
                    <div
                    key={score.playerId}
                    className={`p-4 rounded-lg flex justify-between items-center transition-all duration-300 ${index === 0 ? 'bg-dark-green border-2 border-light-green' : 'bg-dark-slate'}`}
                    >
                    <div className="flex items-center gap-4">
                        <span className={`text-2xl font-bold w-8 text-center ${index === 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                        {index + 1}
                        </span>
                        <div>
                        <p className="text-xl font-bold">{score.playerName}</p>
                        <p className="text-sm text-gray-400">Thru: {score.through}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        {isMatchPlay ? (
                          <p className={`text-3xl font-bold ${score.total > 0 ? 'text-light-green' : score.total < 0 ? 'text-red-400' : 'text-gray-300'}`}>{score.matchStatus}</p>
                        ) : (
                          <>
                            <p className="text-3xl font-bold text-light-green">{score.total}</p>
                            <p className="text-sm text-gray-400">{scoreLabel}</p>
                          </>
                        )}
                    </div>
                    </div>
                ))}
                </div>
            </div>
            
            <div className="bg-medium-slate p-2 md:p-6 rounded-lg shadow-lg">
                <h3 className="text-2xl font-semibold mb-4 text-center">Full Scorecard</h3>
                <Scorecard gameState={gameState} />
            </div>
        </div>
    );
};

export default SpectatorScreen;
