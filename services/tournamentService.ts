import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebaseService';
import { Tournament, Player, TournamentGroup } from '../types';

/**
 * Shuffles an array of players randomly using the Fisher-Yates algorithm.
 */
export function shufflePlayers(players: Player[]): Player[] {
  const shuffled = [...players];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Divides players into groups. By default, it creates groups of 4.
 * If the total number doesn't divide evenly by 4, the remaining players 
 * will form the final group (e.g., a 3-ball or 2-ball).
 */
export function createGroups(players: Player[], groupSize: number = 4): TournamentGroup[] {
  const groups: TournamentGroup[] = [];
  for (let i = 0; i < players.length; i += groupSize) {
    const chunk = players.slice(i, i + groupSize);
    groups.push({
      id: crypto.randomUUID(),
      players: chunk,
      teeTime: '', // Will be assigned next
    });
  }
  return groups;
}

/**
 * Parses a time string like "08:00" or "14:30" into a total minutes representation.
 */
function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours * 60) + (minutes || 0);
}

/**
 * Formats total minutes back to a time string like "08:00".
 */
function formatMinutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Assigns sequential tee times to a list of groups based on a start time and interval.
 * @param groups The list of tournament groups
 * @param startTime String format "HH:MM" (e.g., "08:00")
 * @param intervalMinutes Distance between each tee time (e.g., 8)
 * @returns A new array of groups with their assigned teeTimes
 */
export function assignTeeTimes(
  groups: TournamentGroup[], 
  startTime: string, 
  intervalMinutes: number
): TournamentGroup[] {
  let currentMinutes = parseTimeToMinutes(startTime);

  return groups.map((group) => {
    const assignedTime = formatMinutesToTime(currentMinutes);
    currentMinutes += intervalMinutes;
    return {
      ...group,
      teeTime: assignedTime,
    };
  });
}

/**
 * Creates a new tournament in Firestore
 */
export async function createLiveTournament(tournament: Tournament): Promise<void> {
  const docRef = doc(db, 'tournaments', tournament.id);
  await setDoc(docRef, {
    ...tournament,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
}

/**
 * Updates an existing tournament in Firestore
 */
export async function syncTournamentToFirestore(tournamentId: string, updates: Partial<Tournament>): Promise<void> {
  const docRef = doc(db, 'tournaments', tournamentId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Date.now()
  });
}

/**
 * Deletes a tournament from Firestore
 */
export async function deleteTournamentFromFirestore(tournamentId: string): Promise<void> {
  const docRef = doc(db, 'tournaments', tournamentId);
  await deleteDoc(docRef);
}
