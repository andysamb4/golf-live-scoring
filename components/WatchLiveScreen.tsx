import React, { useState, useEffect } from 'react';
import { LiveGameData } from '../types';
import { listLiveGames } from '../services/liveGameService';
import { TrophyIcon } from './icons/TrophyIcon';

interface WatchLiveScreenProps {
  onBack: () => void;
}

/** Derive the leading player name and score summary from a live game */
const getLeader = (game: LiveGameData): { name: string; through: number } => {
  const isStableford = game.gameType === 'Stableford';
  let bestName = '';
  let bestScore = isStableford ? -Infinity : Infinity;
  let bestThrough = 0;

  for (const player of game.players) {
    const holes = game.scores[player.id] ?? [];
    let total = 0;
    let through = 0;
    for (let i = 0; i < holes.length; i++) {
      if (holes[i] != null) {
        total += holes[i]!;
        through++;
      }
    }
    const isBetter = isStableford ? total > bestScore : total < bestScore;
    if (through > 0 && (bestName === '' || isBetter)) {
      bestName = player.name;
      bestScore = total;
      bestThrough = through;
    }
  }

  return { name: bestName || game.players[0]?.name || 'Unknown', through: bestThrough };
};

const WatchLiveScreen: React.FC<WatchLiveScreenProps> = ({ onBack }) => {
  const [games, setGames] = useState<LiveGameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listLiveGames();
      setGames(result);
    } catch (err) {
      console.error('Failed to load live games:', err);
      setError('Could not load live games. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGames(); }, []);

  const handleWatch = (gameId: string) => {
    window.location.hash = `#/live/${gameId}`;
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-light-slate hover:bg-gray-500 text-white rounded-lg transition-colors"
        >
          &larr; Back
        </button>
        <button
          onClick={fetchGames}
          className="px-4 py-2 bg-light-slate hover:bg-gray-500 text-white rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="text-center bg-medium-slate p-6 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-light-green flex items-center justify-center gap-2">
          <TrophyIcon className="h-7 w-7" /> Watch Live Games
        </h2>
        <p className="text-gray-400 mt-2">Tap a game to watch scores update in real-time</p>
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-400 animate-pulse text-lg">Loading live games...</div>
      )}

      {error && (
        <div className="bg-red-900 border border-red-600 p-4 rounded-lg text-red-300 text-center">
          {error}
        </div>
      )}

      {!loading && !error && games.length === 0 && (
        <div className="bg-medium-slate p-8 rounded-lg shadow-lg text-center">
          <p className="text-xl text-gray-400">No live games right now</p>
          <p className="text-sm text-gray-500 mt-2">Games will appear here when someone starts a round</p>
        </div>
      )}

      {!loading && games.length > 0 && (
        <div className="space-y-3">
          {games.map(game => {
            const leader = getLeader(game);
            return (
              <button
                key={game.id}
                onClick={() => handleWatch(game.id)}
                className="w-full bg-medium-slate hover:bg-light-slate p-4 rounded-lg shadow-lg transition-colors text-left flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    <span className="font-bold text-lg text-white truncate">{game.courseName}</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    {game.gameType} &bull; {game.players.length} players &bull; Hole {game.currentHole + 1}
                  </p>
                  <p className="text-sm text-light-green mt-1">
                    Leading: <span className="font-semibold">{leader.name}</span>
                    <span className="text-gray-400 ml-1">(thru {leader.through})</span>
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <span className="font-mono text-xs bg-dark-slate px-2 py-1 rounded text-gray-300">{game.id}</span>
                  <p className="text-xs text-gray-500 mt-1">Tap to watch</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WatchLiveScreen;
