'use client';

import { useRouter } from 'next/navigation';
import { MIN_PLAYERS, MAX_PLAYERS, BUTTON_LABELS } from '../../constants/gameSettings';
import '../../cssStyling/howToPlay.css';

export default function HowToPlayPage() {
  const router = useRouter();

  return (
    <div className="how-to-play-container">
      <h1 className="page-title">TriviaShare — How to Play</h1>

      <section className="section">
        <h2>1. Creating a Trivia Game</h2>
        <p>
          Head to the &apos;<strong>{BUTTON_LABELS.CREATE_EDIT_SHARE.title}</strong>&apos; section on your dashboard.
          Here, you can build your own trivia game by:
        </p>
        <ul>
          <li>Adding categories (e.g., Music, Movies, History)</li>
          <li>Entering questions with answer choices (A, B, C, ...)</li>
          <li>Selecting the correct answer</li>
          <li>Assigning points per question (e.g., 1, 20, 50, 100, 200, 300, ...)</li>
          <li>Saving your trivia for later or sharing with friends</li>
        </ul>
        <p>
          Make sure your questions are clear and your answers accurate — this will make playing more fun!
        </p>
      </section>

      <section className="section">
        <h2>2. Sharing Trivias</h2>
        <p>
          After saving your trivia, it becomes available to share. Other users can find your trivia under  
          &apos;<em>{BUTTON_LABELS.PLAY_SHARED.title}</em>&apos;. Sharing enables everyone to enjoy the games you&apos;ve created!
        </p>
      </section>

      <section className="section">
        <h2>3. Starting and Playing a Game</h2>
        <p>
          When you&apos;re ready to play:
        </p>
        <ol>
          <li>Select a trivia game from the shared list.</li>
          <li>Input the number of players (minimum {MIN_PLAYERS}, maximum {MAX_PLAYERS}).</li>
          <li>Enter each player&apos;s name — you are encouraged to set unique names to avoid confusion.</li>
          <li>Begin the game, where players take turns answering questions.</li>
          <li>The current player chooses a question and tries to answer it.</li>
        </ol>
      </section>

      <section className="section">
        <h2>4. Scoring and Turns</h2>
        <p>
          When a player answers correctly, they earn the points assigned to that question, and the turn moves to the next player in order.
          If the answer is incorrect, the question is opened up for stealing!
        </p>
      </section>

      <section className="section">
        <h2>5. Stealing Rules</h2>
        <p>
          Stealing gives other players a chance to earn the points:
        </p>
        <ul>
          <li>If the current player answers incorrectly, other players can attempt to steal.</li>
          <li>You choose which player gets to try stealing.</li>
          <li>If a player steals correctly, they earn the points.</li>
          <li>After a successful steal, the next turn goes to the player after the original player who missed.</li>
        </ul>
      </section>

      <section className="section">
        <h2>6. Features Overview</h2>
        <ul>
          <li><strong>Player Score Tracking:</strong> See everyone&apos;s points update live after each correct answer or steal.</li>
          <li><strong>Round-Robin Turns:</strong> Players take turns in a fixed order, cycling continuously.</li>
          <li><strong>Question Locking:</strong> Questions that are answered or stolen correctly become disabled to avoid repeats.</li>
          <li><strong>Manual Steal Option:</strong> You can choose who gets to steal. This makes the game more interactive.</li>
          <li><strong>Game End Screen:</strong> Once all questions are answered, see the final scoreboard and winners.</li>
        </ul>
      </section>

      <section className="section">
        <h2>7. Tips for a Great Game</h2>
        <ul>
          <li>Make sure all players enter their names before starting.</li>
          <li>Encourage friendly competition and fair play.</li>
          <li>Customize trivia with fun categories your group enjoys.</li>
          <li>Use the manual steal chooser to add suspense and excitement.</li>
        </ul>
      </section>

      <button className="back-button" onClick={() => router.back()}>
        Got it! <br /> {BUTTON_LABELS.BACK_TO_DASHBOARD}
      </button>
    </div>
  );
}