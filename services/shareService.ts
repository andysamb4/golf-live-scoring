import { GameState } from '../types';

/**
 * Encodes the game state object into a Base64 string suitable for a URL.
 * @param gameState The game state to encode.
 * @returns A Base64 string representing the game state.
 */
export const encodeGameState = (gameState: GameState): string => {
  try {
    const jsonString = JSON.stringify(gameState);
    // Use encodeURIComponent to handle all characters safely before Base64 encoding.
    const encoded = btoa(unescape(encodeURIComponent(jsonString)));
    return encoded;
  } catch (error) {
    console.error("Failed to encode game state:", error);
    return '';
  }
};

/**
 * Decodes a Base64 string from a URL back into a GameState object.
 * @param encodedState The Base64 string to decode.
 * @returns A GameState object or null if decoding fails.
 */
export const decodeGameState = (encodedState: string): GameState | null => {
  try {
    const decodedJson = decodeURIComponent(escape(atob(encodedState)));
    const gameState = JSON.parse(decodedJson) as GameState;
    
    // Basic validation to ensure the decoded object looks like a game state
    if (gameState && gameState.id && gameState.players && gameState.course && gameState.scores) {
      return gameState;
    }
    console.error("Decoded state is invalid.", gameState);
    return null;
  } catch (error) {
    console.error("Failed to decode game state:", error);
    return null;
  }
};
