
// Fix: Implemented the SetupScreen component to allow game configuration.
import React, { useState, useEffect } from 'react';
import { Player, GameSettings, GameType, Course, TeeSet, Group } from '../types';
import { SAMPLE_COURSE } from '../constants';
import PlayerSetupCard from './PlayerSetupCard';
import { calculatePlayingHandicap } from '../services/scoringService';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { LocationMarkerIcon } from './icons/LocationMarkerIcon';
import { StarIcon } from './icons/StarIcon';
import CourseSelectionModal from './CourseSelectionModal';
import { loadGroups } from '../services/groupService';

/** Resolve the display colour for a tee name (e.g. "Men Yellow" → yellow) */
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

/** Apply a tee set's data onto a course object */
const applyTee = (course: Course, tee: TeeSet): Course => ({
  ...course,
  holes: tee.holes,
  slopeRating: tee.slopeRating,
  courseRating: tee.courseRating,
});

interface SetupScreenProps {
  onStartGame: (settings: GameSettings) => void;
  onManageGroups: () => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onStartGame, onManageGroups }) => {
  const [players, setPlayers] = useState<Player[]>([
    { id: `PLY-${Date.now()}`, name: 'Player 1', handicap: 18 },
    { id: `PLY-${Date.now() + 1}`, name: 'Player 2', handicap: 10 },
  ]);
  const [gameType, setGameType] = useState<GameType>(GameType.Stableford);
  const [course, setCourse] = useState<Course>(SAMPLE_COURSE);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);

  // Group game state
  const [isGroupGame, setIsGroupGame] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedMemberNames, setSelectedMemberNames] = useState<Set<string>>(new Set());
  const [groupsLoading, setGroupsLoading] = useState(false);

  useEffect(() => {
    loadGroups().then(setGroups).catch(console.error);
  }, []);

  const selectedGroup = groups.find(g => g.id === selectedGroupId) ?? null;

  const handleGroupToggle = async (on: boolean) => {
    setIsGroupGame(on);
    if (on) {
      setGroupsLoading(true);
      try {
        const refreshed = await loadGroups();
        setGroups(refreshed);
        if (!selectedGroupId && refreshed.length > 0) {
          handleSelectGroup(refreshed[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setGroupsLoading(false);
      }
    } else {
      setSelectedGroupId(null);
      setSelectedMemberNames(new Set());
      // Reset to default players
      setPlayers([
        { id: `PLY-${Date.now()}`, name: 'Player 1', handicap: 18 },
        { id: `PLY-${Date.now() + 1}`, name: 'Player 2', handicap: 10 },
      ]);
    }
  };

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    const group = groups.find(g => g.id === groupId);
    if (group) {
      // Select all members by default
      setSelectedMemberNames(new Set(group.members.map(m => m.name)));
      // Build players from group members using group handicap
      setPlayers(group.members.map((m, i) => ({
        id: `PLY-${Date.now() + i}`,
        name: m.name,
        handicap: m.groupHandicap,
      })));
    }
  };

  const handleToggleMember = (memberName: string) => {
    setSelectedMemberNames(prev => {
      const next = new Set(prev);
      if (next.has(memberName)) {
        if (next.size <= 2) return prev; // minimum 2 players
        next.delete(memberName);
      } else {
        next.add(memberName);
      }
      // Rebuild players list from selected members
      if (selectedGroup) {
        const selectedMembers = selectedGroup.members.filter(m => next.has(m.name));
        setPlayers(selectedMembers.map((m, i) => ({
          id: `PLY-${Date.now() + i}`,
          name: m.name,
          handicap: m.groupHandicap,
        })));
      }
      return next;
    });
  };

  const handlePlayerChange = (updatedPlayer: Player) => {
    setPlayers(prevPlayers =>
      prevPlayers.map(p => (p.id === updatedPlayer.id ? updatedPlayer : p))
    );
  };

  const handleAddPlayer = () => {
    if (players.length < 4) { // Let's cap at 4 for simplicity
      const newPlayer: Player = {
        id: `PLY-${Date.now()}`,
        name: `Player ${players.length + 1}`,
        handicap: 0,
      };
      setPlayers(prev => [...prev, newPlayer]);
    }
  };

  const handleRemovePlayer = (id: string) => {
    if (players.length > 1) { // Must have at least one player
      setPlayers(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleCourseSelected = (newCourse: Course) => {
    setCourse(newCourse);
    // Clear all player tee overrides when a new course is chosen
    setPlayers(prev => prev.map(p => ({ ...p, selectedTee: undefined })));
    setIsCourseModalOpen(false);
  };

  const handleTeeChange = (tee: TeeSet) => {
    setCourse(prev => applyTee(prev, tee));
    // Clear player overrides so they default to the newly selected course tee
    setPlayers(prev => prev.map(p => ({ ...p, selectedTee: undefined })));
  };
  
  const handleStart = () => {
    const validPlayers = players.filter(p => p.name.trim() !== '').map(p => ({
      ...p,
      playingHandicap: calculatePlayingHandicap(p.handicap, course),
    }));
    if (validPlayers.length > 0) {
      onStartGame({
        players: validPlayers,
        course,
        gameType,
        groupId: isGroupGame && selectedGroupId ? selectedGroupId : undefined,
      });
    } else {
      alert("Please enter at least one player's name.");
    }
  };

  const totalPar = course.holes.reduce((acc, h) => acc + h.par, 0);

  return (
    <>
      <div className="space-y-8 max-w-2xl mx-auto">
        <div className="bg-medium-slate p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-center text-light-green flex items-center justify-center gap-2">
              <LocationMarkerIcon className="h-6 w-6" /> Course Selection
          </h2>
          <div className="bg-dark-slate p-4 rounded-md text-center space-y-3">
            <div>
              <p className="text-xl font-semibold">{course.name}</p>
              <p className="text-sm text-gray-400">{course.holes.length} Holes • Par {totalPar}</p>
              {(course.slopeRating || course.courseRating) && (
                <p className="text-xs text-gray-500 mt-1">
                  {course.slopeRating && <span>Slope: {course.slopeRating}</span>}
                  {course.slopeRating && course.courseRating && <span className="mx-1">•</span>}
                  {course.courseRating && <span>CR: {course.courseRating}</span>}
                </p>
              )}
            </div>

            {/* Inline tee selector — only shown when the course has multiple tee sets */}
            {course.teeSets && course.teeSets.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">🏌️ Select Tees</p>
                <div className="flex gap-2 flex-wrap justify-center">
                  {course.teeSets.map((ts, i) => {
                    const col = teeColour(ts.name);
                    const isActive =
                      ts.slopeRating === course.slopeRating &&
                      ts.courseRating === course.courseRating;
                    return (
                      <button
                        key={i}
                        onClick={() => handleTeeChange(ts)}
                        style={{
                          borderColor: col,
                          color: isActive ? '#000' : col,
                          background: isActive ? col : 'transparent',
                        }}
                        className="px-3 py-1 rounded-full text-xs font-bold border-2 transition-all"
                      >
                        {ts.name}
                        {(ts.slopeRating || ts.courseRating) && (
                          <span className="ml-1 opacity-70 font-normal">
                            {ts.courseRating ? `CR ${ts.courseRating}` : `S ${ts.slopeRating}`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
                onClick={() => setIsCourseModalOpen(true)}
                className="w-full md:w-auto px-4 py-2 bg-light-slate hover:bg-gray-600 rounded-md transition-colors"
            >
                Find New Course
            </button>
          </div>
        </div>

        {/* Group Game Section */}
        <div className="bg-medium-slate p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-center text-light-green flex items-center justify-center gap-2">
            <UserGroupIcon className="h-6 w-6" /> Group Game
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Play as a handicap group?</span>
              <button
                onClick={() => handleGroupToggle(!isGroupGame)}
                className={`relative w-14 h-7 rounded-full transition-colors ${isGroupGame ? 'bg-forest-green' : 'bg-light-slate'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${isGroupGame ? 'translate-x-7' : ''}`} />
              </button>
            </div>

            {isGroupGame && (
              <>
                {groupsLoading ? (
                  <div className="text-center py-4 text-gray-400 animate-pulse">Loading groups…</div>
                ) : groups.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">
                    <p className="mb-2">No groups created yet.</p>
                    <button
                      onClick={onManageGroups}
                      className="px-4 py-2 bg-forest-green hover:bg-green-700 text-white font-bold rounded-md"
                    >
                      Create a Group
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Select Group</label>
                      <div className="flex gap-2">
                        <select
                          value={selectedGroupId ?? ''}
                          onChange={e => handleSelectGroup(e.target.value)}
                          className="flex-1 p-3 bg-dark-slate border border-gray-600 rounded-md text-off-white focus:border-light-green focus:outline-none"
                        >
                          {groups.map(g => (
                            <option key={g.id} value={g.id}>{g.name} ({g.members.length} members)</option>
                          ))}
                        </select>
                        <button
                          onClick={onManageGroups}
                          className="px-3 py-2 bg-light-slate hover:bg-gray-600 rounded-md text-sm"
                          title="Manage Groups"
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    {selectedGroup && (
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Playing this round (tap to toggle)</label>
                        <div className="flex flex-wrap gap-2">
                          {selectedGroup.members.map(m => {
                            const isSelected = selectedMemberNames.has(m.name);
                            return (
                              <button
                                key={m.name}
                                onClick={() => handleToggleMember(m.name)}
                                className={`px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                                  isSelected
                                    ? 'bg-forest-green text-white'
                                    : 'bg-dark-slate text-gray-500 border border-gray-600'
                                }`}
                              >
                                {m.name}
                                <span className="ml-1 opacity-70 text-xs">({m.groupHandicap})</span>
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedMemberNames.size} player{selectedMemberNames.size !== 1 ? 's' : ''} selected &bull;
                          Min 2 required
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-medium-slate p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-center text-light-green flex items-center justify-center gap-2">
              <StarIcon className="h-6 w-6"/> Game Format
          </h2>
          <div className="grid grid-cols-3 gap-2 md:gap-4">
              {Object.values(GameType).map(type => (
                  <button
                      key={type}
                      onClick={() => setGameType(type)}
                      className={`p-3 rounded-md font-semibold transition-all ${
                          gameType === type
                          ? 'bg-forest-green text-white shadow-lg'
                          : 'bg-dark-slate hover:bg-light-slate'
                      }`}
                  >
                      {type}
                  </button>
              ))}
          </div>
        </div>

        {/* Manual Players section — hidden when group game is active */}
        {!isGroupGame && (
          <div className="bg-medium-slate p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-center text-light-green flex items-center justify-center gap-2">
                <UserGroupIcon className="h-6 w-6"/> Players
            </h2>
            <div className="space-y-4 mb-4">
              {players.map((player, index) => (
                <PlayerSetupCard
                  key={player.id}
                  player={player}
                  playerNumber={index + 1}
                  course={course}
                  onPlayerChange={handlePlayerChange}
                  onRemove={players.length > 1 ? handleRemovePlayer : undefined}
                />
              ))}
            </div>
            {players.length < 4 && (
                <button
                    onClick={handleAddPlayer}
                    className="w-full p-2 bg-light-slate hover:bg-gray-600 rounded-md"
                >
                    + Add Player
                </button>
            )}
          </div>
        )}

        <button
          onClick={handleStart}
          className="w-full p-4 bg-forest-green hover:bg-green-700 text-white font-bold text-xl rounded-lg shadow-lg transition-transform transform hover:scale-105"
        >
          Start Game
        </button>
      </div>
      <CourseSelectionModal 
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        onCourseSelect={handleCourseSelected}
      />
    </>
  );
};

export default SetupScreen;
