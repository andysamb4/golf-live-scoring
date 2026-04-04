import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Tournament, GameState, GameType } from '../types';
import { calculateScores, calculateStablefordPointsForHole } from '../services/scoringService';
import { syncTournamentToFirestore, subscribeToTournament } from '../services/tournamentService';
import { TrophyIcon } from './icons/TrophyIcon';

interface GroupScoringScreenProps {
  tournament: Tournament;
  groupIndex: number;
  onBack: () => void;
}

const GroupScoringScreen: React.FC<GroupScoringScreenProps> = ({ tournament: initialTournament, groupIndex, onBack }) => {
  const [tournament, setTournament] = useState(initialTournament);
  const [currentHole, setCurrentHole] = useState(0);
  const unsubRef = useRef<(() => void) | null>(null);

  const group = tournament.groups[groupIndex];
  const holeData = tournament.course.holes[currentHole];

  // Build a scores object for this group from tournament.scores
  const groupScores: { [playerId: string]: (number | null)[] } = useMemo(() => {
    const tournamentScores = tournament.scores?.[groupIndex] ?? {};
    const result: { [playerId: string]: (number | null)[] } = {};
    group.players.forEach(p => {
      result[p.id] = tournamentScores[p.id] ?? Array(18).fill(null);
    });
    return result;
  }, [tournament.scores, groupIndex, group.players]);

  // Build a virtual GameState so we can reuse calculateScores
  const virtualGameState: GameState = useMemo(() => ({
    id: `${tournament.joinCode}-G${groupIndex + 1}`,
    players: group.players,
    course: tournament.course,
    gameType: tournament.gameType,
    scores: groupScores,
    currentHole,
    status: 'playing',
  }), [tournament, groupIndex, group.players, groupScores, currentHole]);

  const calculatedScores = useMemo(() => calculateScores(virtualGameState), [virtualGameState]);

  // Subscribe to real-time tournament updates so we see other groups' changes
  useEffect(() => {
    unsubRef.current = subscribeToTournament(
      tournament.joinCode,
      (updated) => setTournament(updated),
      (err) => console.error('Tournament subscription error:', err),
    );
    return () => { unsubRef.current?.(); };
  }, [tournament.joinCode]);

  const handleScoreChange = async (playerId: string, scoreStr: string) => {
    const score = scoreStr === '' ? null : parseInt(scoreStr, 10);
    if (score !== null && (isNaN(score) || score < 1 || score > 20)) return;

    // Build the updated scores for this group
    const updatedGroupScores = { ...groupScores };
    updatedGroupScores[playerId] = [...updatedGroupScores[playerId]];
    updatedGroupScores[playerId][currentHole] = score;

    // Merge into tournament scores
    const allScores = { ...(tournament.scores ?? {}) };
    allScores[groupIndex] = updatedGroupScores;

    // Optimistic local update
    setTournament(prev => ({ ...prev, scores: allScores }));

    // Sync to Firestore
    try {
      await syncTournamentToFirestore(tournament.joinCode, { scores: allScores });
    } catch (err) {
      console.error('Failed to sync group scores:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-gray-400 hover:text-white px-4 py-2 bg-dark-slate rounded">
          &larr; Back
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold text-light-green">{tournament.name}</h2>
          <p className="text-sm text-gray-400">Group {groupIndex + 1} • {group.teeTime}</p>
        </div>
        <div className="w-20"></div>
      </div>

      {/* Group code banner */}
      <div className="bg-green-900 border border-green-600 p-3 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2 text-green-300 text-sm font-semibold">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          Live &middot; Code: <span className="font-mono">{group.groupCode}</span>
        </div>
        <span className="text-green-400 text-xs">Scores syncing in real-time</span>
      </div>

      {/* Hole navigation */}
      <div className="bg-medium-slate p-4 rounded-lg shadow-lg flex justify-between items-center">
        <button
          onClick={() => setCurrentHole(h => Math.max(0, h - 1))}
          disabled={currentHole === 0}
          className="px-4 py-2 bg-light-slate rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &larr; Prev
        </button>
        <div className="text-center">
          <p className="text-xl font-bold text-light-green">Hole {holeData.hole}</p>
          <p className="text-sm text-gray-300">Par {holeData.par} &bull; SI {holeData.strokeIndex}</p>
        </div>
        <button
          onClick={() => setCurrentHole(h => Math.min(17, h + 1))}
          disabled={currentHole === 17}
          className="px-4 py-2 bg-light-slate rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next &rarr;
        </button>
      </div>

      {/* Score entry */}
      <div className="bg-medium-slate p-6 rounded-lg shadow-lg">
        <h3 className="text-2xl font-semibold mb-4 text-center">Enter Scores</h3>
        <div className="space-y-4">
          {group.players.map(player => {
            const grossScore = groupScores[player.id]?.[currentHole];
            const stablefordPts = tournament.gameType === GameType.Stableford && grossScore
              ? calculateStablefordPointsForHole(grossScore, holeData, player, tournament.course)
              : null;
            return (
              <div key={player.id} className="grid grid-cols-3 items-center gap-2">
                <span className="font-semibold truncate col-span-1">
                  {player.name} <span className="text-sm text-gray-400">(PH: {player.playingHandicap ?? player.handicap})</span>
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={grossScore || ''}
                    onChange={e => handleScoreChange(player.id, e.target.value)}
                    className="w-full p-2 text-center bg-dark-slate border border-light-slate rounded-md text-xl font-bold focus:ring-2 focus:ring-forest-green focus:outline-none"
                  />
                  {stablefordPts !== null && (
                    <span className={`text-sm font-bold whitespace-nowrap ${stablefordPts >= 3 ? 'text-green-400' : stablefordPts === 2 ? 'text-light-green' : stablefordPts === 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                      ({stablefordPts}pt{stablefordPts !== 1 ? 's' : ''})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mini leaderboard */}
      <div className="bg-medium-slate p-6 rounded-lg shadow-lg">
        <h3 className="text-2xl font-semibold mb-4 text-center flex items-center justify-center gap-2">
          <TrophyIcon className="h-6 w-6 text-light-green" />Group Leaderboard
        </h3>
        <div className="space-y-2">
          {calculatedScores.map((score, index) => (
            <div key={score.playerId} className={`p-3 rounded-md flex justify-between items-center ${index === 0 ? 'bg-green-900' : 'bg-dark-slate'}`}>
              <div className="flex items-center">
                <span className="font-bold text-lg w-6">{index + 1}.</span>
                <span className="truncate">{score.playerName}</span>
              </div>
              <div className="text-right">
                {tournament.gameType === 'Match Play' ? (
                  <>
                    <span className={`font-bold text-xl ${score.total > 0 ? 'text-light-green' : score.total < 0 ? 'text-red-400' : 'text-gray-300'}`}>{score.matchStatus}</span>
                    <span className="text-xs text-gray-400 block">Thru {score.through}</span>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-xl text-light-green">{score.total}</span>
                    <span className="text-xs text-gray-400 ml-1">({tournament.gameType === 'Medal' ? 'Strokes' : 'Pts'})</span>
                    <span className="text-xs text-gray-400 block">Thru {score.through}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GroupScoringScreen;
