import React from 'react';
import { Player, Course, TeeSet } from '../types';
import { calculatePlayingHandicap } from '../services/scoringService';
import { TrashIcon } from './icons/TrashIcon';

interface PlayerSetupCardProps {
  player: Player;
  playerNumber: number;
  course: Course;
  onPlayerChange: (player: Player) => void;
  onRemove?: (id: string) => void;
}

/** Resolve a display colour from a tee name like "Men Yellow" or "Ladies Red" */
const TEE_COLOURS: Record<string, string> = {
  white: '#FFFFFF', yellow: '#FACC15', red: '#EF4444',
  blue: '#3B82F6', black: '#374151', gold: '#F59E0B',
  green: '#22C55E', silver: '#9CA3AF',
};
const teeColour = (name: string): string => {
  const words = name.toLowerCase().split(/\s+/).reverse();
  for (const w of words) if (TEE_COLOURS[w]) return TEE_COLOURS[w];
  return '#6B7280';
};

/** Find which tee in the list matches the course's active slope/rating (used to detect current default) */
const findCourseTeeIdx = (course: Course): number => {
  if (!course.teeSets) return -1;
  return course.teeSets.findIndex(
    ts => ts.slopeRating === course.slopeRating && ts.courseRating === course.courseRating
  );
};

const PlayerSetupCard: React.FC<PlayerSetupCardProps> = ({
  player, playerNumber, course, onPlayerChange, onRemove,
}) => {
  const effectiveTee: TeeSet | undefined = player.selectedTee;
  const playingHandicap = calculatePlayingHandicap(player.handicap, course, effectiveTee);
  const teeSets = course.teeSets ?? [];
  const courseDefaultIdx = findCourseTeeIdx(course);

  /** Which index is currently active for this player */
  const activeTeeIdx = effectiveTee
    ? teeSets.findIndex(ts => ts.name === effectiveTee.name)
    : courseDefaultIdx;

  const handleTeeSelect = (ts: TeeSet, idx: number) => {
    // If the player clicks the course-default tee, clear their override
    const isDefault = idx === courseDefaultIdx;
    onPlayerChange({
      ...player,
      selectedTee: isDefault ? undefined : ts,
    });
  };

  return (
    <div className="bg-dark-slate p-4 rounded-lg space-y-3">
      {/* Name + Handicap row */}
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0 w-8 h-8 bg-light-slate rounded-full flex items-center justify-center font-bold text-off-white">
          {playerNumber}
        </div>
        <div className="flex-grow grid grid-cols-2 gap-4">
          <input
            type="text"
            value={player.name}
            onChange={(e) => onPlayerChange({ ...player, name: e.target.value })}
            placeholder="Player Name"
            className="w-full p-2 bg-medium-slate border border-light-slate rounded-md focus:ring-2 focus:ring-forest-green focus:outline-none"
          />
          <input
            type="number"
            value={player.handicap}
            onChange={(e) => onPlayerChange({ ...player, handicap: parseFloat(e.target.value) || 0 })}
            placeholder="Handicap Index"
            step="0.1"
            min="0"
            max="54"
            className="w-full p-2 bg-medium-slate border border-light-slate rounded-md focus:ring-2 focus:ring-forest-green focus:outline-none"
          />
        </div>
        {onRemove && (
          <button
            onClick={() => onRemove(player.id)}
            className="flex-shrink-0 text-red-400 hover:text-red-600"
            aria-label={`Remove Player ${playerNumber}`}
          >
            <TrashIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Per-player tee selector — only shown when the course has multiple tee sets */}
      {teeSets.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap pl-12">
          <span className="text-xs text-gray-500 shrink-0">Tee:</span>
          {teeSets.map((ts, i) => {
            const col = teeColour(ts.name);
            const isActive = i === activeTeeIdx;
            return (
              <button
                key={i}
                onClick={() => handleTeeSelect(ts, i)}
                title={`Slope: ${ts.slopeRating ?? '?'} | CR: ${ts.courseRating ?? '?'}`}
                style={{
                  borderColor: col,
                  color: isActive ? (col === '#FFFFFF' ? '#000' : '#000') : col,
                  background: isActive ? col : 'transparent',
                }}
                className="px-2 py-0.5 rounded-full text-xs font-bold border-2 transition-all"
              >
                {ts.name}
              </button>
            );
          })}
          {player.selectedTee && (
            <span className="text-xs text-amber-400 font-semibold ml-1">
              ← custom
            </span>
          )}
        </div>
      )}

      {/* Handicap summary row */}
      <div className="flex items-center justify-between px-10 text-sm">
        <span className="text-gray-400">Handicap Index: {player.handicap}</span>
        <span className="text-light-green font-semibold">Playing Handicap: {playingHandicap}</span>
      </div>
    </div>
  );
};

export default PlayerSetupCard;
