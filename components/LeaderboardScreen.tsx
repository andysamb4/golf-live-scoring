import React, { useMemo, useState } from 'react';
import { GameState, View } from '../types';
import { calculateScores } from '../services/scoringService';
import Scorecard from './Scorecard';
import { TrophyIcon } from './icons/TrophyIcon';
import { ShareIcon } from './icons/ShareIcon';
import { encodeGameState } from '../services/shareService';

interface LeaderboardScreenProps {
  gameState: GameState;
  onNavigate: (view: View) => void;
  liveGameCode?: string | null;
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ gameState, onNavigate, liveGameCode }) => {
  const calculatedScores = useMemo(() => calculateScores(gameState), [gameState]);
  const scoreLabel = gameState.gameType === 'Medal' ? 'Strokes' : gameState.gameType === 'Skins' ? 'Skins' : 'Points';
  const [copied, setCopied] = useState(false);
  const [liveCopied, setLiveCopied] = useState(false);

  const handleShare = () => {
    const encodedState = encodeGameState(gameState);
    if (encodedState) {
      const url = `${window.location.origin}${window.location.pathname}#/view/${encodedState}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(err => {
        console.error("Failed to copy URL:", err);
        alert("Could not copy URL to clipboard.");
      });
    }
  };

  const handleShareLive = () => {
    if (liveGameCode) {
      const url = `${window.location.origin}${window.location.pathname}#/live/${liveGameCode}`;
      navigator.clipboard.writeText(url).then(() => {
        setLiveCopied(true);
        setTimeout(() => setLiveCopied(false), 2500);
      }).catch(err => {
        console.error("Failed to copy live URL:", err);
        alert("Could not copy URL to clipboard.");
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center bg-medium-slate p-4 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-light-green">{gameState.course.name}</h2>
        <p className="text-lg text-gray-300">{gameState.gameType} Leaderboard</p>
        <p className="text-sm text-gray-400 mt-2">Game ID: <span className="font-mono bg-dark-slate px-2 py-1 rounded">{gameState.id}</span></p>
      </div>

      {/* Main Leaderboard */}
      <div className="bg-medium-slate p-6 rounded-lg shadow-lg">
        <h3 className="text-2xl font-semibold mb-4 text-center flex items-center justify-center gap-2">
          <TrophyIcon className="h-6 w-6 text-light-green"/>
          Live Rankings
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
                <p className="text-3xl font-bold text-light-green">{score.total}</p>
                <p className="text-sm text-gray-400">{scoreLabel}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
       {/* Live Share Feature */}
      {liveGameCode && (
        <div className="bg-green-900 border border-green-600 p-4 rounded-lg shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-green-300 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              Live Scorecard
            </h3>
            <p className="text-sm text-green-200">Share this link — spectators see scores update in real-time!</p>
            <p className="text-xs text-green-300 mt-1 font-mono">Game Code: {liveGameCode}</p>
          </div>
          <button
              onClick={handleShareLive}
              className="w-full sm:w-auto px-5 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-colors disabled:bg-gray-500"
              disabled={liveCopied}
          >
              <ShareIcon className="w-5 h-5"/>
              <span>{liveCopied ? 'Live Link Copied!' : 'Copy Live Link'}</span>
          </button>
        </div>
      )}

      {/* Snapshot Share Feature */}
      <div className="bg-medium-slate p-4 rounded-lg shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-light-green">Share Snapshot</h3>
            <p className="text-sm text-gray-400">Copy a link to a static snapshot of the current leaderboard.</p>
          </div>
          <button
              onClick={handleShare}
              className="w-full sm:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-colors disabled:bg-gray-500"
              disabled={copied}
          >
              <ShareIcon className="w-5 h-5"/>
              <span>{copied ? 'Link Copied!' : 'Copy Snapshot Link'}</span>
          </button>
      </div>

      {/* Full Scorecard */}
      <div className="bg-medium-slate p-2 md:p-6 rounded-lg shadow-lg">
         <h3 className="text-2xl font-semibold mb-4 text-center">Full Scorecard</h3>
        <Scorecard gameState={gameState} />
      </div>

      <button
        onClick={() => onNavigate('scoring')}
        className="w-full p-3 bg-light-slate hover:bg-gray-500 text-white font-bold rounded-lg shadow-lg"
      >
        &larr; Back to Score Entry
      </button>
    </div>
  );
};

export default LeaderboardScreen;
