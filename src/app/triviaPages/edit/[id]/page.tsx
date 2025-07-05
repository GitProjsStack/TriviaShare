'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    getTriviaById,
    updateTriviaContent,
    updateTriviaStatus
} from '../../../supabasefuncs/helperSupabaseFuncs';
import { BUTTON_LABELS, EDIT_TRIVIA_LIMITS } from '@/app/constants/gameSettings';
import { Question, TriviaGame } from '../../../interfaces/triviaTypes';
import '../../../cssStyling/editTriviastyling.css';

const prevPagePath = '../createEditTrivias';
const indexToLetter = (i: number) => String.fromCharCode(65 + i);
const generateChoice = () => ({ id: crypto.randomUUID(), text: '' });

export default function EditTrivia() {
    const { id } = useParams() as { id: string };
    const router = useRouter();

    const [trivia, setTrivia] = useState<TriviaGame | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [targetCategory, setTargetCategory] = useState<string | null>(null);

    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [categoryError, setCategoryError] = useState<string | null>(null);

    const [newQuestionText, setNewQuestionText] = useState('');
    const [newChoices, setNewChoices] = useState([generateChoice(), generateChoice()]);
    const [newPoints, setNewPoints] = useState<number | null>(null);
    const [pointsError, setPointsError] = useState<string | null>(null);

    const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
    const [submitMessage, setSubmitMessage] = useState<string | null>(null);
    const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

    // Load the trivia data on mount
    useEffect(() => {
        if (!id) return;
        setLoading(true);
        getTriviaById(id).then(({ trivia, error }) => {
            if (error || !trivia) setError(error || 'Trivia not found');
            else setTrivia(trivia);
            setLoading(false);
        });
    }, [id]);

    const handleChoiceTextChange = (choiceId: string, value: string) => {
        setNewChoices((prev) =>
            prev.map((c) => (c.id === choiceId ? { ...c, text: value } : c))
        );
    };

    const addChoice = () => {
        if (newChoices.length < EDIT_TRIVIA_LIMITS.MAX_CHOICES) {
            setNewChoices((prev) => [...prev, generateChoice()]);
        }
    };

    const removeChoice = (id: string) => {
        if (newChoices.length <= EDIT_TRIVIA_LIMITS.MIN_CHOICES) return;
        setNewChoices((prev) => prev.filter((c) => c.id !== id));
        if (selectedAnswerId === id) setSelectedAnswerId(null);
    };

    const openQuestionModal = (category: string) => {
        setTargetCategory(category);
        setNewQuestionText('');
        setNewChoices([generateChoice(), generateChoice()]);
        setNewPoints(null);
        setSelectedAnswerId(null);
        setFormError(null);
        setModalOpen(true);
    };

    const saveNewQuestion = async () => {
        if (!newQuestionText.trim()) return setFormError('Question is required.');
        if (newChoices.some((c) => !c.text.trim())) return setFormError('All choices must be filled.');
        if (!selectedAnswerId) return setFormError('Please select a correct answer.');
        if (!targetCategory || !trivia) return;

        const filledChoices = newChoices.filter((c) => c.text.trim() !== '');
        const choicesRecord: Record<string, string> = {};
        filledChoices.forEach((c, i) => {
            choicesRecord[indexToLetter(i)] = c.text;
        });

        const correctIndex = filledChoices.findIndex((c) => c.id === selectedAnswerId);
        if (newPoints === null || isNaN(newPoints) || newPoints <= 0)
            return setFormError('Please enter a valid number of points.');

        const newQ: Question = {
            question: newQuestionText.trim(),
            choices: choicesRecord,
            answer: indexToLetter(correctIndex),
            points: newPoints,
        };

        const updated = {
            ...trivia,
            content: {
                ...trivia.content,
                [targetCategory]: [...trivia.content[targetCategory], newQ],
            },
        };
        setTrivia(updated);
        setModalOpen(false);

        try {
            await updateTriviaContent(trivia.id, updated.content);
        } catch (e) {
            console.error('Error saving question:', e);
        }
    };

    const openCategoryModal = () => {
        setCategoryModalOpen(true);
        setNewCategoryName('');
        setCategoryError(null);
    };

    const submitNewCategory = async () => {
        const trimmed = newCategoryName.trim();
        if (!trimmed || !trivia) {
            setCategoryError('Category name is required.');
            setTimeout(() => setCategoryError(null), 2000);
            return;
        }
        if (trivia.content[trimmed]) return setCategoryError('Category already exists.');

        const updated = {
            ...trivia,
            content: { ...trivia.content, [trimmed]: [] },
        };
        setTrivia(updated);
        setNewCategoryName('');
        setCategoryError(null);
        setCategoryModalOpen(false);

        try {
            await updateTriviaContent(trivia.id, updated.content);
        } catch (e) {
            console.error('Error saving category:', e);
        }
    };

    const deleteCategory = async (category: string) => {
        if (!trivia) return;
        const { [category]: _, ...rest } = trivia.content; // eslint-disable-line @typescript-eslint/no-unused-vars
        const updated = { ...trivia, content: rest };
        setTrivia(updated);

        try {
            await updateTriviaContent(trivia.id, rest);
            setDeleteMessage(`Category "${category}" deleted successfully.`);
        } catch (e) {
            console.error(e);
            setDeleteMessage(`Failed to delete category "${category}".`);
        }

        setTimeout(() => setDeleteMessage(null), 4000);
    };

    const deleteQuestion = async (category: string, questionIndex: number) => {
        if (!trivia) return;
        const updatedQuestions = [...trivia.content[category]];
        updatedQuestions.splice(questionIndex, 1);
        const updatedContent = { ...trivia.content, [category]: updatedQuestions };
        const updated = { ...trivia, content: updatedContent };
        setTrivia(updated);

        try {
            await updateTriviaContent(trivia.id, updatedContent);
            setDeleteMessage(`Question ${questionIndex + 1} in "${category}" deleted successfully.`);
        } catch (e) {
            console.error(e);
            setDeleteMessage(`Failed to delete question ${questionIndex + 1} in "${category}".`);
        }

        setTimeout(() => setDeleteMessage(null), 4000);
    };

    const submitTrivia = () => {
        if (!trivia) return;

        const categoryCount = Object.keys(trivia.content).length;
        if (categoryCount === 0 || categoryCount > EDIT_TRIVIA_LIMITS.MAX_CATEGORIES) {
            setSubmitMessage(`Trivia must have between ${EDIT_TRIVIA_LIMITS.MIN_CATEGORIES} and ${EDIT_TRIVIA_LIMITS.MAX_CATEGORIES} categories.`);
            setTimeout(() => setSubmitMessage(null), 4000);
            return;
        }

        for (const [cat, questions] of Object.entries(trivia.content)) {
            if (questions.length < EDIT_TRIVIA_LIMITS.MIN_QUESTIONS_PER_CATEGORY || questions.length > EDIT_TRIVIA_LIMITS.MAX_QUESTIONS_PER_CATEGORY) {
                setSubmitMessage(`Category "${cat}" must have between ${EDIT_TRIVIA_LIMITS.MIN_QUESTIONS_PER_CATEGORY} and ${EDIT_TRIVIA_LIMITS.MAX_QUESTIONS_PER_CATEGORY} questions.`);
                setTimeout(() => setSubmitMessage(null), 4000);
                return;
            }
        }

        setConfirmSubmitOpen(true);
    };

    if (loading) {
        return (
            <div className="edit-container loading-spinner-container">
                <div className="spinner" />
                <p className="loading-text">Finalizing your trivia...</p>
            </div>
        );
    }

    if (error || !trivia) return <p>Error: {error || 'Not found'}</p>;

    return (
        <div className="edit-container">
            <button className="back-button" onClick={() => router.push(prevPagePath)}>
                ← Back
            </button>

            <h1>{trivia.title}</h1>

            {deleteMessage && <p className="delete-message">{deleteMessage}</p>}

            <button className="add-category-btn" onClick={openCategoryModal}>
                + Add Category
            </button>

            <div className="category-grid">
                {Object.entries(trivia.content).map(([cat, questions]) => (
                    <div className="category-card" key={cat}>
                        <div className="category-header">
                            <h2>{cat}</h2>
                            <button
                                className="delete-category-btn"
                                onClick={() => deleteCategory(cat)}
                                aria-label={`Delete category ${cat}`}
                                type="button"
                            >
                                ✕
                            </button>
                        </div>

                        {questions.map((q, i) => (
                            <div key={i} className="question-box">
                                <div className="question-header">
                                    <p><strong>Q{i + 1}:</strong> {q.question} <span className="points-tag">({q.points} pts)</span></p>
                                    <button
                                        className="delete-question-btn"
                                        onClick={() => deleteQuestion(cat, i)}
                                        aria-label={`Delete question ${i + 1} in category ${cat}`}
                                    >
                                        ✕
                                    </button>
                                </div>
                                <ul className="choice-list">
                                    {Object.entries(q.choices).map(([letter, text]) => (
                                        <li
                                            key={letter}
                                            className={`choice-item ${q.answer === letter ? 'correct-answer' : ''}`}
                                        >
                                            {letter}. {text}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}

                        <button className="add-question-btn" onClick={() => openQuestionModal(cat)}>
                            + Add Question
                        </button>

                    </div>
                ))}
            </div>

            {submitMessage && <p className="submit-message">{submitMessage}</p>}

            <div className="submit-container">
                <button className="add-question-btn" onClick={submitTrivia}>
                    ✅ Submit Trivia
                </button>
            </div>

            {/* Question Modal */}
            {modalOpen && (
                <div className="modal-overlay" onClick={() => setModalOpen(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <h2>Add New Question to <em>{targetCategory}</em></h2>

                        <label className="modal-label">
                            <span>Question:</span>
                            <textarea
                                rows={3}
                                value={newQuestionText}
                                onChange={(e) => setNewQuestionText(e.target.value)}
                            />
                        </label>

                        <label className="modal-label">
                            <span>Points:</span>
                            <input
                                type="number"
                                className="points-input"
                                value={newPoints !== null ? newPoints : ''}
                                onChange={(e) => {
                                    const value = e.target.value;

                                    // Clear previous errors
                                    setPointsError(null);

                                    // Handle empty input
                                    if (value === '') {
                                        setNewPoints(null);
                                        return;
                                    }

                                    // Parse as number
                                    const num = parseInt(value, 10);

                                    // Validate
                                    if (isNaN(num)) {
                                        setPointsError('Please enter a valid number');
                                        return;
                                    }

                                    if (num > Number.MAX_SAFE_INTEGER) {
                                        setPointsError('Number is too large');
                                        return;
                                    }

                                    if (num <= 0) {
                                        setPointsError(`Each question must have a minimum of ${EDIT_TRIVIA_LIMITS.MIN_POINTS_PER_QUESTION} point(s)`);
                                        return;
                                    }

                                    if (num > EDIT_TRIVIA_LIMITS.MAX_POINTS_PER_QUESTION) {
                                        setPointsError(`Maximum ${EDIT_TRIVIA_LIMITS.MAX_POINTS_PER_QUESTION} points allowed`);
                                        return;
                                    }

                                    setNewPoints(num);
                                }}
                                min={EDIT_TRIVIA_LIMITS.MIN_POINTS_PER_QUESTION}
                                max={EDIT_TRIVIA_LIMITS.MAX_POINTS_PER_QUESTION} // Visual hint for browsers
                            />
                        </label>
                        {pointsError && (
                            <div className="points-error-message">
                                {pointsError}
                            </div>
                        )}

                        {newChoices.map((c, i) => (
                            <div key={c.id} className="choice-input-row">
                                <label className="choice-label">
                                    <span>{indexToLetter(i)}:</span>
                                    <input
                                        type="text"
                                        value={c.text}
                                        onChange={(e) => handleChoiceTextChange(c.id, e.target.value)}
                                    />
                                </label>

                                <button
                                    className={`select-answer-btn ${selectedAnswerId === c.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedAnswerId(c.id)}
                                    type="button"
                                >
                                    ✓
                                </button>

                                <button
                                    onClick={() => removeChoice(c.id)}
                                    className="remove-choice-btn"
                                    type="button"
                                    disabled={newChoices.length <= EDIT_TRIVIA_LIMITS.MIN_CHOICES}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}

                        <button className="add-choice-btn" onClick={addChoice} disabled={newChoices.length >= EDIT_TRIVIA_LIMITS.MAX_CHOICES}>
                            + Add Choice
                        </button>

                        {formError && <p className="form-error">{formError}</p>}

                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setModalOpen(false)}>{BUTTON_LABELS.CANCEL}</button>
                            <button className="save-btn" onClick={saveNewQuestion}>Save Question</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Modal */}
            {categoryModalOpen && (
                <div className="modal-overlay" onClick={() => setCategoryModalOpen(false)}>
                    <div className="modal-box category-modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Create New Category</h2>

                        <label className="modal-label">
                            <span>Category Name:</span>
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                            />
                        </label>

                        {categoryError && <p className="form-error">{categoryError}</p>}

                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setCategoryModalOpen(false)}>{BUTTON_LABELS.CANCEL}</button>
                            <button className="save-btn" onClick={submitNewCategory}>Create Category</button>
                        </div>
                    </div>
                </div>
            )}

            {confirmSubmitOpen && (
                <div className="modal-overlay" onClick={() => setConfirmSubmitOpen(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <h2>Finalize Trivia?</h2>
                        <p>
                            Once submitted, you won’t be able to edit this trivia anymore.
                            Are you sure you want to continue?
                        </p>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setConfirmSubmitOpen(false)}>{BUTTON_LABELS.CANCEL}</button>
                            <button
                                className="save-btn"
                                onClick={async () => {
                                    if (!trivia) return;

                                    setConfirmSubmitOpen(false);
                                    setSubmitMessage('Finalizing trivia...');
                                    setLoading(true);

                                    try {
                                        await updateTriviaStatus(trivia.id, 'completed');
                                        setSubmitMessage('Trivia finalized! Redirecting...');
                                        // Wait 5 seconds then redirect:
                                        setTimeout(() => {
                                            router.push(prevPagePath);
                                        }, 5000);
                                    } catch {
                                        setSubmitMessage('Failed to finalize trivia.');
                                        setTimeout(() => setSubmitMessage(null), 4000);
                                    }
                                }}
                            >
                                Yes, Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}