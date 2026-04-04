import React from 'react';
import { Tournament } from '../types';

interface TournamentHubScreenProps {
  tournaments: Tournament[];
  onBack: () => void;
  onCreateTournament: () => void;
  onViewTournament: (tournamentId: string) => void;
  onDeleteTournament: (tournamentId: string) => void;
}

const TournamentHubScreen: React.FC<TournamentHubScreenProps> = ({
  tournaments,
  onBack,
  onCreateTournament,
  onViewTournament,
  onDeleteTournament
}) => {

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-gray-400 hover:text-white px-4 py-2 bg-dark-slate rounded">
          &larr; Back
        </button>
        <h2 className="text-2xl font-bold text-light-green">Tournament Hub</h2>
        <div className="w-20"></div> {/* Spacer for centering */}
      </div>

      <div className="bg-medium-slate p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">My Tournaments</h3>
          <button 
            onClick={onCreateTournament}
            className="px-4 py-2 bg-forest-green hover:bg-green-700 text-white font-bold rounded-lg shadow"
          >
            + Create New
          </button>
        </div>

        {tournaments.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-dark-slate rounded-lg border border-gray-700">
            <p className="mb-2 text-lg">No tournaments created yet.</p>
            <p className="text-sm">Host a large-scale event with groupings and tee times.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tournaments.map(tournament => (
              <div key={tournament.id} className="bg-dark-slate p-4 rounded-lg flex justify-between items-center border border-gray-700">
                <div>
                  <h4 className="font-bold text-lg text-white">{tournament.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">Join Code:</span>
                    <span className="font-mono text-sm font-bold text-light-green bg-dark-slate px-2 py-0.5 rounded">{tournament.joinCode}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{tournament.course.name} • {tournament.gameType}</p>
                  <p className="text-xs mt-1">
                    <span className="px-2 py-1 bg-light-slate rounded-full">
                      {tournament.groups.reduce((acc, g) => acc + g.players.length, 0)} Players
                    </span>
                    <span className="px-2 py-1 bg-light-slate rounded-full ml-2">{tournament.groups.length} Groups</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                        if (window.confirm("Are you sure you want to delete this tournament?")) {
                            onDeleteTournament(tournament.id);
                        }
                    }}
                    className="px-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-500"
                  >
                    Delete
                  </button>
                  <button 
                    onClick={() => onViewTournament(tournament.id)}
                    className="px-4 py-2 bg-light-green text-dark-slate font-bold rounded hover:bg-green-400"
                  >
                    Manage
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentHubScreen;
