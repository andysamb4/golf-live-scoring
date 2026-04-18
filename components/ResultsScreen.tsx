import React, { useMemo } from 'react';
import { GameState } from '../types';
import { calculateScores } from '../services/scoringService';
import Scorecard from './Scorecard';
import { TrophyIcon } from './icons/TrophyIcon';

interface ResultsScreenProps {
  gameState: GameState;
  onDone: () => void;
  doneLabel?: string;
}

const POSITION_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

const ResultsScreen: React.FC<ResultsScreenProps> = ({ gameState, onDone, doneLabel = 'Done' }) => {
  const calculatedScores = useMemo(() => calculateScores(gameState), [gameState]);
  const isMatchPlay = gameState.gameType === 'Match Play';
  const scoreLabel = isMatchPlay ? '' : gameState.gameType === 'Medal' ? 'Strokes' : gameState.gameType === 'Skins' ? 'Skins' : 'Points';

  const finishedDate = gameState.finishedAt
    ? new Date(gameState.finishedAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const winner = calculatedScores[0];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center bg-medium-slate p-6 rounded-lg shadow-lg">
        <p className="text-sm text-gray-400 uppercase tracking-widest mb-1">Final Results</p>
        <h2 className="text-3xl font-bold text-light-green">{gameState.course.name}</h2>
        <p className="text-lg text-gray-300">{gameState.gameType}</p>
        <p className="text-sm text-gray-500 mt-2">{finishedDate}</p>
      </div>

      {/* Winner callout */}
      {winner && (
        <div className="bg-dark-green border-2 border-light-green rounded-lg p-6 text-center shadow-lg">
          <TrophyIcon className="h-10 w-10 text-yellow-400 mx-auto mb-2" />
          <p className="text-sm text-green-300 uppercase tracking-widest">Winner</p>
          <p className="text-4xl font-bold text-white mt-1">{winner.playerName}</p>
          {isMatchPlay ? (
            <p className="text-2xl text-light-green mt-1">{winner.matchStatus}</p>
          ) : (
            <p className="text-2xl text-light-green mt-1">
              {winner.total} {scoreLabel}
            </p>
          )}
        </div>
      )}

      {/* Full leaderboard */}
      <div className="bg-medium-slate p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-center">Final Standings</h3>
        <div className="space-y-3">
          {calculatedScores.map((score, index) => (
            <div
              key={score.playerId}
              className={`p-4 rounded-lg flex justify-between items-center ${index === 0 ? 'bg-dark-green border border-light-green' : 'bg-dark-slate'}`}
            >
              <div className="flex items-center gap-4">
                <span className={`text-xl font-bold w-8 text-center ${index === 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {POSITION_LABELS[index] ?? `${index + 1}th`}
                </span>
                <div>
                  <p className="text-lg font-bold">{score.playerName}</p>
                  <p className="text-sm text-gray-400">Thru {score.through}</p>
                </div>
              </div>
              <div className="text-right">
                {isMatchPlay ? (
                  <p className={`text-2xl font-bold ${score.total > 0 ? 'text-light-green' : score.total < 0 ? 'text-red-400' : 'text-gray-300'}`}>
                    {score.matchStatus}
                  </p>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-light-green">{score.total}</p>
                    <p className="text-xs text-gray-400">{scoreLabel}</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full scorecard */}
      <div className="bg-medium-slate p-2 md:p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-center">Full Scorecard</h3>
        <Scorecard gameState={gameState} />
      </div>

      <button
        onClick={onDone}
        className="w-full p-4 bg-light-green hover:bg-green-500 text-dark-slate font-bold text-lg rounded-lg shadow-lg transition-colors"
      >
        {doneLabel}
      </button>
    </div>
  );
};

export default ResultsScreen;
