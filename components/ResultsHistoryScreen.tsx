import React, { useState, useEffect } from 'react';
import { GameState, LiveGameData } from '../types';
import { listFinishedGames } from '../services/liveGameService';
import { calculateScores } from '../services/scoringService';
import { TrophyIcon } from './icons/TrophyIcon';
import ResultsScreen from './ResultsScreen';

interface ResultsHistoryScreenProps {
  onBack: () => void;
}

const liveDataToGameState = (game: LiveGameData): GameState => ({
  id: game.id,
  players: game.players,
  course: game.course,
  gameType: game.gameType,
  scores: game.scores,
  currentHole: game.currentHole,
  status: game.status,
  finishedAt: game.updatedAt,
});

const groupByDate = (games: LiveGameData[]): { label: string; games: LiveGameData[] }[] => {
  const map = new Map<string, LiveGameData[]>();
  for (const game of games) {
    const label = new Date(game.updatedAt).toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(game);
  }
  return Array.from(map.entries()).map(([label, games]) => ({ label, games }));
};

const ResultsHistoryScreen: React.FC<ResultsHistoryScreenProps> = ({ onBack }) => {
  const [games, setGames] = useState<LiveGameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GameState | null>(null);

  useEffect(() => {
    listFinishedGames()
      .then(setGames)
      .catch((err) => {
        console.error('listFinishedGames failed:', err);
        setError(`Could not load results: ${err?.message ?? err}`);
      })
      .finally(() => setLoading(false));
  }, []);

  if (selected) {
    return <ResultsScreen gameState={selected} onDone={() => setSelected(null)} doneLabel="Back to History" />;
  }

  const grouped = groupByDate(games);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="px-4 py-2 bg-light-slate hover:bg-gray-500 text-white rounded-lg transition-colors">
          &larr; Back
        </button>
      </div>

      <div className="text-center bg-medium-slate p-6 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-light-green flex items-center justify-center gap-2">
          <TrophyIcon className="h-7 w-7" /> Results History
        </h2>
        <p className="text-gray-400 mt-2">All completed rounds, newest first</p>
      </div>

      {loading && <div className="text-center py-8 text-gray-400 animate-pulse text-lg">Loading results...</div>}
      {error && <div className="bg-red-900 border border-red-600 p-4 rounded-lg text-red-300 text-center">{error}</div>}

      {!loading && !error && games.length === 0 && (
        <div className="bg-medium-slate p-8 rounded-lg text-center">
          <p className="text-xl text-gray-400">No completed rounds yet</p>
          <p className="text-sm text-gray-500 mt-2">Finished games will appear here</p>
        </div>
      )}

      {grouped.map(({ label, games: dayGames }) => (
        <div key={label}>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 px-1">{label}</p>
          <div className="space-y-3">
            {dayGames.map(game => {
              const gs = liveDataToGameState(game);
              const scores = calculateScores(gs);
              const winner = scores[0];
              return (
                <button
                  key={game.id}
                  onClick={() => setSelected(gs)}
                  className="w-full bg-medium-slate hover:bg-light-slate p-4 rounded-lg shadow-lg transition-colors text-left flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{game.courseName}</p>
                    <p className="text-sm text-gray-400">{game.gameType} &bull; {game.players.length} players</p>
                    {winner && (
                      <p className="text-sm text-light-green mt-0.5">
                        Winner: <span className="font-semibold">{winner.playerName}</span>
                      </p>
                    )}
                  </div>
                  <span className="text-gray-500 ml-4 flex-shrink-0">›</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ResultsHistoryScreen;
