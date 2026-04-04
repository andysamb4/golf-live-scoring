import React, { useState } from 'react';
import { Tournament } from '../types';
import { fetchTournamentByCode } from '../services/tournamentService';

interface JoinTournamentScreenProps {
  onBack: () => void;
  onTournamentJoined: (tournament: Tournament) => void;
  onGroupCodeEntered: (tournament: Tournament, groupIndex: number) => void;
}

const JoinTournamentScreen: React.FC<JoinTournamentScreenProps> = ({ onBack, onTournamentJoined, onGroupCodeEntered }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter a code.');
      return;
    }

    setLoading(true);
    setError(null);

    // Check if this is a group code (e.g. ABC12345-G2)
    const groupMatch = trimmed.match(/^([A-Z0-9]{8})-G(\d+)$/);

    try {
      const joinCode = groupMatch ? groupMatch[1] : trimmed;
      const tournament = await fetchTournamentByCode(joinCode);

      if (!tournament) {
        setError('Tournament not found. Check the code and try again.');
        setLoading(false);
        return;
      }

      if (groupMatch) {
        const groupIndex = parseInt(groupMatch[2], 10) - 1; // G1 → index 0
        if (groupIndex < 0 || groupIndex >= tournament.groups.length) {
          setError(`Group ${groupMatch[2]} does not exist in this tournament.`);
          setLoading(false);
          return;
        }
        onGroupCodeEntered(tournament, groupIndex);
      } else {
        onTournamentJoined(tournament);
      }
    } catch (err) {
      console.error('Failed to fetch tournament:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-gray-400 hover:text-white px-4 py-2 bg-dark-slate rounded">
          &larr; Back
        </button>
        <h2 className="text-2xl font-bold text-light-green">Join Tournament</h2>
        <div className="w-20"></div>
      </div>

      <div className="bg-medium-slate p-6 rounded-lg shadow-lg space-y-6">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Enter Tournament or Group Code</label>
          <input
            type="text"
            value={code}
            onChange={e => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="e.g. ABC12345 or ABC12345-G2"
            className="w-full p-4 text-center text-2xl font-mono tracking-widest bg-dark-slate border border-gray-600 rounded-lg focus:border-light-green focus:outline-none uppercase"
            maxLength={13}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {error && (
          <div className="bg-red-900 border border-red-600 p-3 rounded-lg text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !code.trim()}
          className="w-full py-4 bg-forest-green hover:bg-green-700 text-white font-bold text-lg rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Looking up...' : 'Join'}
        </button>

        <div className="text-center text-sm text-gray-400 space-y-2">
          <p><strong>Tournament code</strong> (8 chars) — view the full tournament</p>
          <p><strong>Group code</strong> (e.g. ABC12345-G2) — enter scores for your group</p>
        </div>
      </div>
    </div>
  );
};

export default JoinTournamentScreen;
