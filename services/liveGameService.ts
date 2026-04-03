import { doc, setDoc, onSnapshot, updateDoc, Unsubscribe, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebaseService';
import { GameState, LiveGameData } from '../types';

/** Generate a short, memorable game code */
const generateGameCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/** Convert a GameState into the Firestore document shape */
const gameStateToLiveData = (gameState: GameState): LiveGameData => ({
  id: gameState.id,
  courseName: gameState.course.name,
  gameType: gameState.gameType,
  status: gameState.status,
  currentHole: gameState.currentHole,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  players: gameState.players,
  course: gameState.course,
  scores: gameState.scores,
});

/** Create a new live game in Firestore and return its code */
export const createLiveGame = async (gameState: GameState): Promise<string> => {
  const gameCode = generateGameCode();
  const liveData = gameStateToLiveData(gameState);
  liveData.id = gameCode;

  const docRef = doc(db, 'games', gameCode);
  await setDoc(docRef, liveData);
  return gameCode;
};

/** Push the latest game state to Firestore */
export const syncGameToFirestore = async (gameCode: string, gameState: GameState): Promise<void> => {
  const docRef = doc(db, 'games', gameCode);
  await updateDoc(docRef, {
    scores: gameState.scores,
    currentHole: gameState.currentHole,
    status: gameState.status,
    players: gameState.players,
    updatedAt: Date.now(),
  });
};

/** Fetch all currently active (playing) games */
export const listLiveGames = async (): Promise<LiveGameData[]> => {
  const gamesCol = collection(db, 'games');
  const q = query(gamesCol, where('status', '==', 'playing'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data() as LiveGameData);
};

/** Subscribe to real-time updates for a live game. Returns an unsubscribe function. */
export const subscribeToLiveGame = (
  gameCode: string,
  onUpdate: (data: LiveGameData) => void,
  onError: (error: string) => void,
): Unsubscribe => {
  const docRef = doc(db, 'games', gameCode);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onError('Game not found. Check the code and try again.');
        return;
      }
      onUpdate(snapshot.data() as LiveGameData);
    },
    (error) => {
      console.error('Live game subscription error:', error);
      onError('Lost connection to the live game.');
    },
  );
};
