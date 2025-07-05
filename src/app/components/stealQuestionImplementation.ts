import { TPlayer } from '../interfaces/triviaTypes';

// Queue of player indices who get to try stealing, excluding the original player who missed
const stealQueue: number[] = [];
// Tracks which player in the stealQueue is currently trying to steal
let stealIndex = 0;
// The player who originally had the turn (missed the question)
const originalTurnIndex = 0;

/**
 * Get the player index of who is currently allowed to steal.
 */
export function getCurrentStealer() {
  return stealQueue[stealIndex];
}

/**
 * Move the steal turn to the next player in the queue.
 */
export function advanceStealTurn() {
  stealIndex++;
}

/**
 * Check if the steal attempts are over (all players tried).
 */
export function isStealOver() {
  return stealIndex >= stealQueue.length;
}

/**
 * Evaluate whether the current stealer answered correctly.
 * If correct, award points and set next turn to the player after the original turn player.
 * If incorrect, keep players unchanged and prepare to move to next stealer.
 * 
 * @param players - current players state
 * @param points - points to award if steal succeeds
 * @param currentStealerIndex - index of player attempting the steal
 * @param isCorrect - whether steal answer was correct
 * 
 * @returns updated players, message to display, next turn index, and steal success flag
 */
export function evaluateStealAnswer(
  players: TPlayer[],
  points: number,
  currentStealerIndex: number,
  isCorrect: boolean
): {
  updatedPlayers: TPlayer[];
  message: string;
  nextTurnIndex: number;
  isStealSuccess: boolean;
} {
  if (!isCorrect) {
    return {
      updatedPlayers: players,
      message: 'Incorrect steal. Moving onto the next player ...',
      nextTurnIndex: -1, // no turn change yet, next turn handled outside
      isStealSuccess: false,
    };
  }

  // Award points to successful stealer
  const updatedPlayers = [...players];
  updatedPlayers[currentStealerIndex].score += points;

  // Next turn moves to the player after the original turn player
  const nextTurnIndex = (originalTurnIndex + 1) % players.length;

  return {
    updatedPlayers,
    message: 'Correct steal! Points awarded.',
    nextTurnIndex,
    isStealSuccess: true,
  };
}