import React, { useState, useMemo, useCallback } from 'react';
import { GameState, View, Player } from '../types';
import { calculateScores } from '../services/scoringService';
import { isSpeechRecognitionSupported, startListening, parseSpokenScore } from '../services/speechService';
import { TrophyIcon } from './icons/TrophyIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';

interface ScoringScreenProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  onUpdateScore: (playerId: string, holeIndex: number, score: number | null) => void;
  onNavigate: (view: View) => void;
  onEndGame: () => void;
  liveGameCode?: string | null;
}

type ListeningState = {
  isListening: boolean;
  playerId: string | null;
  statusText: string;
  error: string | null;
};

const ScoringScreen: React.FC<ScoringScreenProps> = ({ gameState, setGameState, onUpdateScore, onNavigate, onEndGame, liveGameCode }) => {
  const [currentHole, setCurrentHole] = useState(gameState.currentHole);
  const [listeningState, setListeningState] = useState<ListeningState>({ isListening: false, playerId: null, statusText: '', error: null });
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const speechSupported = isSpeechRecognitionSupported();
  
  const calculatedScores = useMemo(() => calculateScores(gameState), [gameState]);
  const holeData = gameState.course.holes[currentHole];

  const handleScoreChange = (playerId: string, scoreStr: string) => {
    const score = scoreStr === '' ? null : parseInt(scoreStr, 10);
    if (score === null || (!isNaN(score) && score >= 1 && score <= 20)) {
      onUpdateScore(playerId, currentHole, score);
    }
  };

  const handleToggleListening = async (player: Player) => {
      if (listeningState.isListening) return; // Already listening for someone else

      setListeningState({ isListening: true, playerId: player.id, statusText: `Listening for ${player.name}...`, error: null });
      
      try {
          await startListening(
              (transcript) => {
                  setListeningState(prev => ({ ...prev, statusText: `Heard: "${transcript}"` }));
                  const score = parseSpokenScore(transcript, holeData);
                  if (score !== null) {
                      onUpdateScore(player.id, currentHole, score);
                  } else {
                       setListeningState(prev => ({ ...prev, error: `Couldn't understand "${transcript}". Please try again.` }));
                  }
              },
              (error) => {
                  setListeningState({ isListening: false, playerId: null, statusText: '', error });
              },
              () => {
                  setTimeout(() => {
                    setListeningState({ isListening: false, playerId: null, statusText: '', error: null });
                  }, 2000);
              }
          );
      } catch (err) {
           setListeningState({ isListening: false, playerId: null, statusText: '', error: 'Failed to start microphone.' });
      }
  };

  const handleNextHole = () => {
    if (currentHole < 17) {
      const nextHole = currentHole + 1;
      setCurrentHole(nextHole);
      setGameState(prev => prev ? { ...prev, currentHole: nextHole } : null);
    }
  };

  const handlePrevHole = () => {
    if (currentHole > 0) {
      const prevHole = currentHole - 1;
      setCurrentHole(prevHole);
       setGameState(prev => prev ? { ...prev, currentHole: prevHole } : null);
    }
  };

  return (
    <div className="space-y-6">
      {liveGameCode && (
        <div className="bg-green-900 border border-green-600 p-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-300 text-sm font-semibold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            Live &middot; Code: <span className="font-mono">{liveGameCode}</span>
          </div>
          <span className="text-green-400 text-xs">Scores syncing in real-time</span>
        </div>
      )}
      <div className="bg-medium-slate p-4 rounded-lg shadow-lg flex justify-between items-center">
        <button onClick={handlePrevHole} disabled={currentHole === 0} className="px-4 py-2 bg-light-slate rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
          &larr; Prev
        </button>
        <div className="text-center">
          <p className="text-xl font-bold text-light-green">Hole {holeData.hole}</p>
          <p className="text-sm text-gray-300">Par {holeData.par} &bull; SI {holeData.strokeIndex}</p>
        </div>
        <button onClick={handleNextHole} disabled={currentHole === 17} className="px-4 py-2 bg-light-slate rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
          Next &rarr;
        </button>
      </div>

      <div className="bg-medium-slate p-6 rounded-lg shadow-lg">
        <h3 className="text-2xl font-semibold mb-4 text-center">Enter Scores</h3>
        <div className="space-y-4">
          {gameState.players.map(player => (
            <div key={player.id} className="grid grid-cols-4 items-center gap-2">
              <span className="font-semibold truncate col-span-2">{player.name} <span className="text-sm text-gray-400">(PH: {player.playingHandicap ?? player.handicap})</span></span>
              <input
                type="number"
                min="1"
                value={gameState.scores[player.id][currentHole] || ''}
                onChange={(e) => handleScoreChange(player.id, e.target.value)}
                className="w-full p-2 text-center bg-dark-slate border border-light-slate rounded-md text-xl font-bold focus:ring-2 focus:ring-forest-green focus:outline-none"
              />
              {speechSupported && (
                  <button 
                    onClick={() => handleToggleListening(player)}
                    disabled={listeningState.isListening}
                    className={`p-2 rounded-md flex justify-center items-center transition-colors
                        ${listeningState.isListening && listeningState.playerId === player.id ? 'bg-red-500 animate-pulse' : 'bg-light-slate'} 
                        disabled:opacity-50 disabled:cursor-not-allowed`}
                    aria-label={`Record score for ${player.name}`}
                  >
                      <MicrophoneIcon className="h-6 w-6"/>
                  </button>
              )}
            </div>
          ))}
        </div>
        {(listeningState.isListening || listeningState.error) && (
            <div className="mt-4 text-center p-3 rounded-md bg-dark-slate">
                {listeningState.error ? (
                    <p className="text-red-400">{listeningState.error}</p>
                ) : (
                    <p className="text-light-green">{listeningState.statusText}</p>
                )}
            </div>
        )}
      </div>
      
       <div className="bg-medium-slate p-6 rounded-lg shadow-lg">
        <h3 className="text-2xl font-semibold mb-4 text-center flex items-center justify-center gap-2"><TrophyIcon className="h-6 w-6 text-light-green"/>Leaderboard</h3>
        <div className="space-y-2">
            {calculatedScores.map((score, index) => (
                <div key={score.playerId} className={`p-3 rounded-md flex justify-between items-center ${index === 0 ? 'bg-green-900' : 'bg-dark-slate'}`}>
                    <div className="flex items-center">
                        <span className="font-bold text-lg w-6">{index + 1}.</span>
                        <span className="truncate">{score.playerName}</span>
                    </div>
                    <div className="text-right">
                        <span className="font-bold text-xl text-light-green">{score.total}</span>
                         <span className="text-xs text-gray-400 ml-1">({gameState.gameType === 'Medal' ? 'Strokes' : 'Pts'})</span>
                         <span className="text-xs text-gray-400 block">Thru {score.through}</span>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onNavigate('leaderboard')}
          className="flex-1 p-3 bg-forest-green hover:bg-green-700 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105"
        >
          View Full Leaderboard & Scorecard
        </button>
        <button
          onClick={() => setShowEndConfirm(true)}
          className="px-4 py-3 bg-red-800 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg transition-colors flex items-center gap-2 flex-shrink-0"
          aria-label="End game"
        >
          🏁 End
        </button>
      </div>
      {/* End-game confirmation overlay */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-medium-slate border border-red-700 rounded-xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5">
            <div className="text-5xl">⛳</div>
            <h2 className="text-2xl font-bold text-white">End the Round?</h2>
            <p className="text-gray-400 text-sm">
              All scores will be lost. This cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-3 bg-light-slate hover:bg-gray-500 text-white font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onEndGame}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
              >
                Yes, End Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoringScreen;
