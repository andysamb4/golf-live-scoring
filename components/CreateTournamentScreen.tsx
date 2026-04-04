import React, { useState } from 'react';
import { Course, GameType, Tournament, TournamentGroup, Player } from '../types';
import { BRAMPTON_HEATH } from '../constants';
import PlayerBulkUpload from './PlayerBulkUpload';
import CourseSelectionModal from './CourseSelectionModal';
import { assignTeeTimes, createGroups, shufflePlayers, generateTournamentCode } from '../services/tournamentService';
import { LocationMarkerIcon } from './icons/LocationMarkerIcon';
import { StarIcon } from './icons/StarIcon';

interface CreateTournamentScreenProps {
  onBack: () => void;
  onTournamentCreated: (tournament: Tournament) => void;
}

const CreateTournamentScreen: React.FC<CreateTournamentScreenProps> = ({ onBack, onTournamentCreated }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [course, setCourse] = useState<Course>(BRAMPTON_HEATH);
  const [gameType, setGameType] = useState<GameType>(GameType.Stableford);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [groups, setGroups] = useState<TournamentGroup[]>([]);
  const [startTime, setStartTime] = useState('08:00');
  const [teeInterval, setTeeInterval] = useState(8);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinCode] = useState(() => generateTournamentCode());

  const handleNextStep1 = () => {
    if (!name.trim()) {
      alert("Please enter a tournament name.");
      return;
    }
    setStep(2);
  };

  const handlePlayersAdded = (newPlayers: Player[]) => {
    setPlayers(prev => [...prev, ...newPlayers]);
  };

  const handleRemovePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const handleNextStep2 = () => {
    if (players.length === 0) {
      alert("Please add at least one player.");
      return;
    }
    // Auto-generate initial grouping when moving to step 3
    generateGroupings();
    setStep(3);
  };

  const generateGroupings = () => {
    const shuffled = shufflePlayers(players);
    const generatedGroups = createGroups(shuffled, 4, joinCode);
    const timesAssigned = assignTeeTimes(generatedGroups, startTime, teeInterval);
    setGroups(timesAssigned);
  };

  const updateSchedule = () => {
    const timesAssigned = assignTeeTimes(groups, startTime, teeInterval);
    setGroups(timesAssigned);
  };

  const handleFinalize = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const tournament: Tournament = {
      id: crypto.randomUUID(),
      joinCode,
      name,
      course,
      gameType,
      groups,
      status: 'upcoming'
    };
    Promise.resolve(onTournamentCreated(tournament)).finally(() => setIsSubmitting(false));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-gray-400 hover:text-white px-4 py-2 bg-dark-slate rounded">
          &larr; Back
        </button>
        <h2 className="text-2xl font-bold text-light-green">Create Tournament (Step {step}/3)</h2>
        <div className="w-20"></div> {/* Spacer for centering */}
      </div>

      {step === 1 && (
        <div className="bg-medium-slate p-6 rounded-lg shadow-lg space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tournament Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Summer Classic 2026"
              className="w-full p-3 bg-dark-slate border border-gray-600 rounded-md focus:border-light-green focus:outline-none"
            />
          </div>

          <div>
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-light-green"><LocationMarkerIcon className="h-5 w-5" /> Course</h3>
            <div className="bg-dark-slate p-4 rounded-md">
              <p className="text-xl font-semibold mb-2">{course.name}</p>
              <button
                onClick={() => setIsCourseModalOpen(true)}
                className="px-4 py-2 bg-light-slate hover:bg-gray-600 rounded-md transition-colors"
              >
                Change Course
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-light-green"><StarIcon className="h-5 w-5"/> Format</h3>
            <div className="grid grid-cols-2 gap-4">
              {[GameType.Medal, GameType.Stableford].map(type => (
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

          <div className="pt-4 text-right">
            <button onClick={handleNextStep1} className="px-6 py-3 bg-forest-green hover:bg-green-700 text-white font-bold rounded-lg transition-transform transform hover:scale-105">
              Next: Add Players &rarr;
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <PlayerBulkUpload onPlayersAdded={handlePlayersAdded} maxPlayers={80} currentCount={players.length} />

          <div className="bg-medium-slate p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-light-green">Registered Players ({players.length})</h3>
            {players.length === 0 ? (
              <p className="text-gray-400 italic">No players added yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-2">
                {players.map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center bg-dark-slate p-2 rounded border border-gray-700">
                    <div>
                      <span className="text-gray-500 mr-2">{idx + 1}.</span>
                      <span className="font-semibold">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm bg-light-slate px-2 py-1 rounded">WHS {p.handicap}</span>
                      <button onClick={() => handleRemovePlayer(p.id)} className="text-red-400 hover:text-red-300">&times;</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4">
             <button onClick={() => setStep(1)} className="px-6 py-3 bg-light-slate hover:bg-gray-600 rounded-lg">
              &larr; Back
            </button>
            <button onClick={handleNextStep2} className="px-6 py-3 bg-forest-green hover:bg-green-700 text-white font-bold rounded-lg transition-transform transform hover:scale-105">
              Next: Groups & Tee Times &rarr;
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-medium-slate p-6 rounded-lg shadow-lg space-y-4">
            <h3 className="text-xl font-semibold text-light-green">Tee Time Settings</h3>
            <div className="flex gap-4 items-end">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Start Time (HH:MM)</label>
                <input 
                  type="time" 
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="p-2 bg-dark-slate border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Interval (Mins)</label>
                <input 
                  type="number" 
                  value={teeInterval}
                  onChange={e => setTeeInterval(parseInt(e.target.value) || 8)}
                  className="w-24 p-2 bg-dark-slate border border-gray-600 rounded text-white"
                  min={1}
                />
              </div>
              <button onClick={updateSchedule} className="px-4 py-2 bg-light-slate hover:bg-gray-600 rounded font-semibold text-sm">
                Apply Schedule
              </button>
              <button 
                onClick={generateGroupings} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold text-sm ml-auto"
              >
                🔀 Re-Randomize Groups
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Note: You can easily adapt these groups manually later.
            </p>
          </div>

          <div className="space-y-4">
            {groups.map((group, index) => (
              <div key={group.id} className="bg-dark-slate border border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-700">
                  <h4 className="font-bold text-lg text-white">Group {index + 1}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Tee Time:</span>
                    <span className="px-3 py-1 bg-forest-green text-white rounded font-bold">{group.teeTime}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {group.players.map(p => (
                    <div key={p.id} className="bg-medium-slate p-2 rounded text-sm text-center">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-gray-400">({p.handicap})</div>
                    </div>
                  ))}
                  {group.players.length < 4 && (
                    <div className="bg-dark-slate border border-dashed border-gray-600 p-2 rounded text-sm text-center flex items-center justify-center text-gray-500 italic">
                      Empty Slot
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4">
             <button onClick={() => setStep(2)} className="px-6 py-3 bg-light-slate hover:bg-gray-600 rounded-lg">
              &larr; Back
            </button>
            <button onClick={handleFinalize} disabled={isSubmitting} className="px-6 py-3 bg-forest-green hover:bg-green-700 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? 'Saving...' : 'Finalize Tournament'}
            </button>
          </div>
        </div>
      )}

      <CourseSelectionModal 
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        onCourseSelect={(c) => {
          setCourse(c);
          setIsCourseModalOpen(false);
        }}
      />
    </div>
  );
};

export default CreateTournamentScreen;
