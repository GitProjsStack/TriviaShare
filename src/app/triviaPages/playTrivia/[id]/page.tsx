'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getTriviaById } from '@/app/supabasefuncs/helperSupabaseFuncs';
import { 
    MIN_PLAYERS,
    MAX_PLAYERS,
    BUTTON_LABELS,
    EDIT_TRIVIA_LIMITS
 } from '@/app/constants/gameSettings';
import {
    TPlayer,
    TQuestion,
    TChoice,
    TriviaContent,
    TriviaParams
} from '@/app/interfaces/triviaTypes';
import {
    getCurrentStealer,
    advanceStealTurn,
    isStealOver,
    evaluateStealAnswer,
} from '@/app/components/stealQuestionImplementation';
import TriviaEndScreen from '../../../components/triviaEndScreen'
import '../../../cssStyling/viewSharedTrivias.css';
import '../../../cssStyling/playTrivia.css';

const COLORS = EDIT_TRIVIA_LIMITS.COLORS;

export default function PlayTriviaPage() {
    const router = useRouter();
    const params = useParams() as TriviaParams;
    const id = params.id;

    // Title and trivia content loaded from DB
    const [triviaTitle, setTriviaTitle] = useState<string>('');
    const [triviaContent, setTriviaContent] = useState<TriviaContent | null>(null);

    // Number of players input as string, actual players array
    const [numPlayers, setNumPlayers] = useState('');
    const [players, setPlayers] = useState<TPlayer[]>([]);
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

    // Keep track of questions that have been answered (to disable buttons)
    const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, Set<number>>>({});

    // Game and steal phase flags + tracking current stealer
    const [showGame, setShowGame] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [stealPhase, setStealPhase] = useState(false);
    const [currentStealerIndex, setCurrentStealerIndex] = useState<number | null>(null);

    // Show manual steal chooser UI and eligible stealers list
    const [showStealChooser, setShowStealChooser] = useState(false);
    const [eligibleStealers, setEligibleStealers] = useState<TPlayer[]>([]);

    // Modal state: open, current question category, question data, index
    const [modalOpen, setModalOpen] = useState(false);
    const [modalCategory, setModalCategory] = useState<string | null>(null);
    const [modalQuestion, setModalQuestion] = useState<TQuestion | null>(null);
    const [modalQuestionIndex, setModalQuestionIndex] = useState<number | null>(null);

    // Messages shown in modal or UI banner
    const [modalMessage, setModalMessage] = useState<string>('');
    const [uiMessage, setUiMessage] = useState<string>('');

    // Flag if question was answered, disables choices to prevent multiple clicks
    const [questionAnswered, setQuestionAnswered] = useState(false);

    // Fetch trivia data on component mount; if error, bounce user back to dashboard
    useEffect(() => {
        if (!id) return;
        (async () => {
            const { trivia, error } = await getTriviaById(id);
            if (error) {
                showUIMessage('Failed to load trivia: ' + error);
                router.push('/dashboard');
                return;
            }
            setTriviaTitle(trivia.title);
            setTriviaContent(trivia.content);
        })();
    }, [id, router]);

    // Check if all questions have been answered to end the game
    useEffect(() => {
        if (!triviaContent) return;

        // Count total questions
        const totalQuestions = Object.values(triviaContent).reduce((sum, arr) => sum + arr.length, 0);

        // Count answered questions total
        const totalAnswered = Object.values(answeredQuestions).reduce(
            (sum, set) => sum + (set ? set.size : 0), 0);

        if (totalAnswered === totalQuestions && totalQuestions > 0) {
            setGameOver(true);
        }
    }, [answeredQuestions, triviaContent]);

    // Shows a temporary banner message on UI
    function showUIMessage(message: string, duration: number = 1000) {
        setUiMessage(message);
        setTimeout(() => setUiMessage(''), duration);
    }

    // Update player name as user types in inputs before game starts
    function updatePlayerName(index: number, newName: string) {
        setPlayers((prev) => {
            const updated = [...prev];
            updated[index].name = newName;
            return updated;
        });
    }

    // Initialize players array based on number input, default to MIN_PLAYERS
    function initPlayers() {
        const n = Number(numPlayers || MIN_PLAYERS);
        const initialPlayers = Array.from({ length: n }, (_, i) => ({
            id: i + 1,
            name: '',
            score: 0,
        }));
        setPlayers(initialPlayers);
        setCurrentPlayerIndex(0);
    }

    // Returns a consistent color for each player index for scoreboard UI
    function getPlayerColor(index: number): string {
        return COLORS[index % COLORS.length];
    }

    // Before game starts, make sure every player has a name
    function beginGame() {
        const allNamesValid = players.every(p => p.name.trim().length > 0);
        if (!allNamesValid) {
            showUIMessage('Please enter a name for each player!');
            return;
        }
        setShowGame(true);
    }

    // Opens modal for selected question, converting raw data to TQuestion format
    function openQuestionModal(categoryName: string, questionIdx: number) {
        if (!triviaContent) return;
        const questions = triviaContent[categoryName];
        if (!questions || !questions[questionIdx]) return;

        const rawQuestion = questions[questionIdx];
        const convertedQuestion: TQuestion = {
            question: rawQuestion.question,
            points: rawQuestion.points,
            choices: Object.entries(rawQuestion.choices).map(([key, text]) => ({
                text,
                isCorrect: key === rawQuestion.answer,
            })),
        };

        setModalCategory(categoryName);
        setModalQuestion(convertedQuestion);
        setModalQuestionIndex(questionIdx);
        setModalMessage(''); // clear old messages
        setQuestionAnswered(false);
        setModalOpen(true);
    }

    // Mark a question as answered so it gets disabled in UI
    function markQuestionAnswered(categoryName: string, questionIdx: number) {
        setAnsweredQuestions((prev) => {
            const updated = { ...prev };
            if (!updated[categoryName]) updated[categoryName] = new Set();
            updated[categoryName].add(questionIdx);
            return updated;
        });
    }

    // Move to next player's turn in a simple round-robin way
    function nextPlayer() {
        setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
    }

    // Close the modal and reset modal-related state
    function closeModal() {
        setModalOpen(false);
        setModalQuestion(null);
        setModalQuestionIndex(null);
        setModalMessage('');
        setQuestionAnswered(false);
    }

    // When user gives up, show manual steal chooser instead of auto queue
    function handleGiveUp() {
        if (questionAnswered) return;

        // Get all other players except current
        const others = players.filter((_, i) => i !== currentPlayerIndex);
        setEligibleStealers(others);
        setShowStealChooser(true);
        setQuestionAnswered(true);
        setModalMessage(`Choose a player to attempt stealing.`);
    }

    // Handle steal attempt from the current stealer in steal phase
    function handleSteal(choice: TChoice) {
        if (!stealPhase || currentStealerIndex === null || !modalQuestion) return;

        const result = evaluateStealAnswer(players, modalQuestion.points, currentStealerIndex, choice.isCorrect);

        setPlayers(result.updatedPlayers);
        setModalMessage(result.message);

        if (result.isStealSuccess) {
            // Mark question answered and end steal phase, advance turn properly
            if (modalCategory && modalQuestionIndex !== null) {
                markQuestionAnswered(modalCategory, modalQuestionIndex);
            }
            setTimeout(() => {
                closeModal();
                setStealPhase(false);
                setCurrentStealerIndex(null);
                setCurrentPlayerIndex(result.nextTurnIndex);
            }, 1500);
        } else {
            // Advance steal queue and continue or end steal phase
            advanceStealTurn();
            if (isStealOver()) {
                setTimeout(() => {
                    closeModal();
                    setStealPhase(false);
                    setCurrentStealerIndex(null);
                    setCurrentPlayerIndex((currentPlayerIndex + 1) % players.length);
                }, 1500);
            } else {
                const nextStealer = getCurrentStealer();
                setTimeout(() => {
                    setCurrentStealerIndex(nextStealer);
                    setModalMessage(`${players[nextStealer].name} can now try to steal!`);
                }, 1500);
            }
        }
    }

    // User picks who tries to steal manually from the list of eligible players
    function handleManualStealPick(playerId: number) {
        const chosenIndex = players.findIndex(p => p.id === playerId);
        if (chosenIndex === -1) return;

        setShowStealChooser(false);
        setStealPhase(true);
        setCurrentStealerIndex(chosenIndex);
        setModalMessage('');
        setQuestionAnswered(false);
    }

    // Handles when player clicks a choice to answer question
    function handleChoiceClick(choice: TChoice) {

        if (questionAnswered) return;
        if (modalQuestionIndex === null || !triviaContent) return;

        if (choice.isCorrect) {
            setModalMessage('Correct! Points awarded.');
            setQuestionAnswered(true);

            players[currentPlayerIndex].score += modalQuestion?.points || 0;
            setPlayers(players);

            // Mark question answered so it can't be selected again
            if (modalCategory && modalQuestionIndex !== null) {
                markQuestionAnswered(modalCategory, modalQuestionIndex);
            }

            // Close modal and pass turn to next player after delay
            setTimeout(() => {
                closeModal();
                nextPlayer();
            }, 1500);
        } else {
            // Incorrect answer: show message and then open manual steal chooser
            setModalMessage('Incorrect. No points awarded.');
            setQuestionAnswered(true);

            const others = players.filter((_, i) => i !== currentPlayerIndex);
            setEligibleStealers(others);
            setShowStealChooser(true);
        }
    }

    return (
        <div className="dashboard-container">
            {gameOver ? (
                <TriviaEndScreen players={players} />
            ) : (
                <>
                    <h1 className="dashboard-title">{triviaTitle}</h1>
                    <p className="dashboard-subtext">
                        {showGame ? <>Game in progress!</> : 'Set up your players and start the game!'}
                    </p>

                    <div className="button-row">
                        <button
                            className="dashboard-back-button"
                            onClick={() => router.push('../dashboard')}
                        >
                            {BUTTON_LABELS.BACK_TO_DASHBOARD}
                        </button>
                        <button
                            className="dashboard-back-button"
                            onClick={() => router.push('../viewSharedTrivias')}
                        >
                            Play a different trivia
                        </button>
                    </div>

                    {showGame && (
                        <div className="players-scoreboard">
                            {players.map((p, i) => (
                                <div
                                    key={p.id}
                                    className={`scoreboard-entry ${i === currentPlayerIndex ? 'active-player' : ''}`}
                                    style={{ borderColor: i === currentPlayerIndex ? '#db2777' : '#fbbf24' }}
                                >
                                    <span className="scoreboard-name" style={{ color: getPlayerColor(i) }}>
                                        {p.name || `Player ${p.id}`}
                                    </span>
                                    <span className="scoreboard-points">{p.score} pts</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {uiMessage && <div className="ui-message-banner">{uiMessage}</div>}

                    {!players.length ? (
                        <div className="players-input-box">
                            <label htmlFor="numPlayers">Number of players: {numPlayers || MIN_PLAYERS}</label>
                            <input
                                id="numPlayers"
                                type="range"
                                min={MIN_PLAYERS}
                                max={MAX_PLAYERS}
                                value={numPlayers || MIN_PLAYERS}
                                onChange={(e) => setNumPlayers(e.target.value)}
                            />
                            <button className="start-btn" onClick={initPlayers}>
                                Confirm Player Count
                            </button>
                        </div>
                    ) : !showGame ? (
                        <>
                            <div className="players-row">
                                {players.map((p, i) => (
                                    <div
                                        key={p.id}
                                        className={`player-box ${i === currentPlayerIndex ? 'active-player' : ''}`}
                                    >
                                        <input
                                            type="text"
                                            className="player-name-input"
                                            placeholder={`Player ${p.id} name`}
                                            value={p.name}
                                            onChange={(e) => updatePlayerName(i, e.target.value)}
                                        />
                                        <div className="player-score">Score: {p.score}</div>
                                    </div>
                                ))}
                            </div>
                            <p className="dashboard-subtext">Please enter a name for each player to begin.</p>
                            <button className="start-btn" onClick={beginGame} style={{ marginTop: '1rem' }}>
                                Start Game
                            </button>
                        </>
                    ) : triviaContent && Object.keys(triviaContent).length > 0 ? (
                        <div className="trivia-grid">
                            {Object.entries(triviaContent).map(([categoryName, questions]) => (
                                <div key={categoryName} className="category-column">
                                    <h3 className="category-name">{categoryName}</h3>
                                    {[...questions]
                                        .sort((a, b) => a.points - b.points)
                                        .map((question, qIdx) => (
                                            <button
                                                key={`${categoryName}-${qIdx}`}
                                                className={`question-button ${answeredQuestions[categoryName]?.has(qIdx) ? 'answered' : ''
                                                    }`}
                                                onClick={() => openQuestionModal(categoryName, qIdx)}
                                                disabled={answeredQuestions[categoryName]?.has(qIdx)}
                                            >
                                                {question.points} pts
                                            </button>
                                        ))}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>No trivia categories found.</p>
                    )}

                    {modalOpen && modalQuestion && (
                        <div className="modal-overlay" onClick={() => !questionAnswered && closeModal()}>
                            <div
                                className="modal-content"
                                onClick={(e) => e.stopPropagation()}
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="modal-question"
                            >
                                <h2 id="modal-question">{modalQuestion.question}</h2>
                                {showStealChooser ? (
                                    <div className="steal-chooser">
                                        <p>Select a player to steal the question:</p>
                                        <div className="steal-chooser-list">
                                            {eligibleStealers.map((p) => (
                                                <button
                                                    key={p.id}
                                                    className="steal-chooser-button"
                                                    onClick={() => handleManualStealPick(p.id)}
                                                >
                                                    {p.name || `Player ${p.id}`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="choices-container">
                                        {modalQuestion.choices.map((choice, idx) => (
                                            <button
                                                key={idx}
                                                className="choice-button"
                                                onClick={() => (stealPhase ? handleSteal(choice) : handleChoiceClick(choice))}
                                                disabled={questionAnswered}
                                            >
                                                {choice.text}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {modalMessage && <p className="modal-message">{modalMessage}</p>}

                                <div className="modal-buttons">
                                    <button className="modal-btn give-up" onClick={handleGiveUp} disabled={questionAnswered}>
                                        {BUTTON_LABELS.GIVE_UP}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}




