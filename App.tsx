import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, GameSettings, LiveGameData, View } from './types';
import SetupScreen from './components/SetupScreen';
import ScoringScreen from './components/ScoringScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import GroupManagementScreen from './components/GroupManagementScreen';
import WatchLiveScreen from './components/WatchLiveScreen';
import { GolfFlagIcon } from './components/icons/GolfFlagIcon';
import { decodeGameState } from './services/shareService';
import SpectatorScreen from './components/SpectatorScreen';
import { createLiveGame, syncGameToFirestore, subscribeToLiveGame } from './services/liveGameService';
import { applyGroupGameResult } from './services/groupService';
import { calculateScores } from './services/scoringService';

const STORAGE_KEY_GAME = 'golf_active_game';
const STORAGE_KEY_CODE = 'golf_live_code';
const STORAGE_KEY_VIEW = 'golf_view';

const loadFromStorage = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const saveToStorage = (key: string, value: unknown) => {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded – ignore */ }
};

export type SyncStatus = 'synced' | 'local-only' | 'syncing' | 'error';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(() => loadFromStorage<GameState>(STORAGE_KEY_GAME));
  const [spectatorGameState, setSpectatorGameState] = useState<GameState | null>(null);
  const [liveGameCode, setLiveGameCode] = useState<string | null>(() => loadFromStorage<string>(STORAGE_KEY_CODE));
  const [liveSpectatorData, setLiveSpectatorData] = useState<LiveGameData | null>(null);
  const [liveSpectatorError, setLiveSpectatorError] = useState<string | null>(null);
  const [view, setView] = useState<View>(() => loadFromStorage<View>(STORAGE_KEY_VIEW) ?? 'setup');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => loadFromStorage<string>(STORAGE_KEY_CODE) ? 'synced' : 'local-only');
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const liveGameCodeRef = useRef<string | null>(liveGameCode);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;

      // Clean up any existing live subscription
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      if (hash.startsWith('#/live/')) {
        // Real-time live game spectator
        const gameCode = hash.substring(7); // length of '#/live/'
        setSpectatorGameState(null);
        setLiveSpectatorError(null);
        setGameState(null);

        unsubscribeRef.current = subscribeToLiveGame(
          gameCode,
          (data) => {
            setLiveSpectatorData(data);
            setLiveSpectatorError(null);
          },
          (error) => {
            setLiveSpectatorError(error);
            setLiveSpectatorData(null);
          },
        );
      } else if (hash.startsWith('#/view/')) {
        // Static snapshot spectator (legacy)
        setLiveSpectatorData(null);
        setLiveSpectatorError(null);
        const encodedState = hash.substring(7);
        const decoded = decodeGameState(encodedState);
        if (decoded) {
          setSpectatorGameState(decoded);
          setGameState(null);
        } else {
          alert("The shared link is invalid or corrupted.");
          window.location.hash = '';
          setSpectatorGameState(null);
        }
      } else {
        setSpectatorGameState(null);
        setLiveSpectatorData(null);
        setLiveSpectatorError(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check on initial load

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);


  // Keep ref in sync so callbacks always see the latest code
  useEffect(() => { liveGameCodeRef.current = liveGameCode; }, [liveGameCode]);

  // Persist gameState, liveGameCode, and view to localStorage
  useEffect(() => { saveToStorage(STORAGE_KEY_GAME, gameState); }, [gameState]);
  useEffect(() => { saveToStorage(STORAGE_KEY_CODE, liveGameCode); }, [liveGameCode]);
  useEffect(() => { saveToStorage(STORAGE_KEY_VIEW, view); }, [view]);

  // On mount: if we have a restored game but no liveGameCode, attempt cloud sync
  useEffect(() => {
    if (gameState && !liveGameCode && gameState.status === 'playing') {
      setSyncStatus('local-only');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetrySync = useCallback(async () => {
    if (!gameState || liveGameCode) return;
    setSyncStatus('syncing');
    try {
      const code = await createLiveGame(gameState);
      setLiveGameCode(code);
      setSyncStatus('synced');
    } catch (err) {
      console.error('Retry sync failed:', err);
      setSyncStatus('error');
    }
  }, [gameState, liveGameCode]);

  const handleStartGame = useCallback(async (settings: GameSettings) => {
    const initialScores: { [playerId:string]: (number | null)[] } = {};
    settings.players.forEach(p => {
      initialScores[p.id] = Array(18).fill(null);
    });

    const newGameState: GameState = {
      ...settings,
      id: `GME-${Date.now().toString().slice(-6)}`,
      scores: initialScores,
      currentHole: 0,
      status: 'playing',
    };

    setGameState(newGameState);
    setView('scoring');
    window.location.hash = '';

    // Create the live game in Firestore
    setSyncStatus('syncing');
    try {
      const code = await createLiveGame(newGameState);
      setLiveGameCode(code);
      setSyncStatus('synced');
    } catch (err) {
      console.error('Failed to create live game:', err);
      setSyncStatus('error');
    }
  }, []);

  const handleUpdateScore = useCallback((playerId: string, holeIndex: number, score: number | null) => {
    setGameState(prev => {
      if (!prev) return null;
      const newScores = { ...prev.scores };
      newScores[playerId] = [...newScores[playerId]];
      newScores[playerId][holeIndex] = score;
      const updated = { ...prev, scores: newScores };

      // Sync to Firestore in the background (use ref for latest code)
      const code = liveGameCodeRef.current;
      if (code) {
        syncGameToFirestore(code, updated).catch(err =>
          console.error('Failed to sync score:', err)
        );
      }

      return updated;
    });
  }, []);
  
  const handleNavigate = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const handleEndGame = useCallback(async () => {
    // Apply group handicap adjustments if this was a group game
    if (gameState?.groupId) {
      const scores = calculateScores(gameState);
      const finishingOrder = scores.map(s => s.playerName);
      const updatedGroup = await applyGroupGameResult(gameState.groupId, gameState.course.name, finishingOrder);
      if (updatedGroup) {
        const adjustmentsSummary = finishingOrder.map((name, i) => {
          const adj = updatedGroup.members.find(m => m.name === name);
          const record = updatedGroup.gameHistory[updatedGroup.gameHistory.length - 1];
          const change = record.adjustments[name];
          return `${i + 1}. ${name}: ${change >= 0 ? '+' : ''}${change} (now ${adj?.groupHandicap ?? '?'})`;
        }).join('\n');
        alert(`Group handicaps updated!\n\n${adjustmentsSummary}`);
      }
    }
    setGameState(null);
    setLiveGameCode(null);
    setSyncStatus('local-only');
    setView('setup');
  }, [gameState]);

  const handleManageGroups = useCallback(() => {
    setView('groups');
  }, []);

  // Sync currentHole changes to Firestore
  const handleSetGameState: typeof setGameState = useCallback((action) => {
    setGameState(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      const code = liveGameCodeRef.current;
      if (next && code && prev && next.currentHole !== prev.currentHole) {
        syncGameToFirestore(code, next).catch(err =>
          console.error('Failed to sync hole change:', err)
        );
      }
      return next;
    });
  }, []);

  const renderContent = () => {
    // Real-time live spectator
    if (liveSpectatorData) {
      const liveGameState: GameState = {
        id: liveSpectatorData.id,
        players: liveSpectatorData.players,
        course: liveSpectatorData.course,
        gameType: liveSpectatorData.gameType,
        scores: liveSpectatorData.scores,
        currentHole: liveSpectatorData.currentHole,
        status: liveSpectatorData.status,
      };
      return <SpectatorScreen gameState={liveGameState} isLive />;
    }

    // Live spectator error
    if (liveSpectatorError) {
      return (
        <div className="bg-red-900 border-l-4 border-red-400 text-red-100 p-6 rounded-lg" role="alert">
          <p className="font-bold text-xl">Game Not Found</p>
          <p className="mt-2">{liveSpectatorError}</p>
        </div>
      );
    }

    // Static snapshot spectator (legacy)
    if (spectatorGameState) {
      return <SpectatorScreen gameState={spectatorGameState} />;
    }

    switch (view) {
      case 'scoring':
        if (gameState) {
          return <ScoringScreen gameState={gameState} onUpdateScore={handleUpdateScore} onNavigate={handleNavigate} setGameState={handleSetGameState} onEndGame={handleEndGame} liveGameCode={liveGameCode} syncStatus={syncStatus} onRetrySync={handleRetrySync} />;
        }
        return <SetupScreen onStartGame={handleStartGame} onManageGroups={handleManageGroups} />;
      case 'leaderboard':
        if (gameState) {
          return <LeaderboardScreen gameState={gameState} onNavigate={handleNavigate} liveGameCode={liveGameCode} />;
        }
        return <SetupScreen onStartGame={handleStartGame} onManageGroups={handleManageGroups} />;
      case 'groups':
        return <GroupManagementScreen onBack={() => setView('setup')} />;
      case 'watch':
        return <WatchLiveScreen onBack={() => setView('setup')} />;
      case 'setup':
      default:
        return <SetupScreen onStartGame={handleStartGame} onManageGroups={handleManageGroups} onWatchLive={() => setView('watch')} />;
    }
  };

  return (
    <div className="min-h-screen bg-dark-slate text-off-white font-sans">
      <header className="bg-dark-green p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-center">
            <GolfFlagIcon className="h-8 w-8 mr-3 text-light-green"/>
            <h1 className="text-3xl font-bold tracking-wider">Golf Live Scoring</h1>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6">
        {renderContent()}
      </main>
      <footer className="text-center p-4 text-gray-400 text-sm mt-8">
        <p>Built for the modern golfer. &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default App;
