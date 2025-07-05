'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BUTTON_LABELS } from '@/app/constants/gameSettings';
import {
    generateUSERProfilePicSignedUrl,
    fetchMatchingUsersBySimilarName,
    getAllTriviaSharedWithUser,
    updateTriviaSharedWithUser,
    getTriviaById,
} from '@/app/supabasefuncs/helperSupabaseFuncs';
import { ShareRecipient, TriviaParams } from '@/app/interfaces/triviaTypes';

import '../../../cssStyling/shareTrivia.css';
import ProfilePicture from '@/app/components/ProfilePicture';

export default function ShareTriviaPage() {
    const router = useRouter();
    const params = useParams() as TriviaParams;
    const triviaid = params?.id;

    const [triviaTitle, setTriviaTitle] = useState<string>('');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ShareRecipient[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [shareStatus, setShareStatus] = useState<string | null>(null);

    // Load trivia title when page opens (we need it for display + user feedback)
    useEffect(() => {
        if (!triviaid) return;

        async function fetchTitle() {
            const { trivia, error } = await getTriviaById(triviaid);
            if (!error && trivia) {
                setTriviaTitle(trivia.title);
            } else {
                setTriviaTitle('Unknown Trivia');
            }
        }

        fetchTitle();
    }, [triviaid]);

    // Live search — triggers on every keystroke in the search bar
    useEffect(() => {
        if (query.trim() === '') {
            setResults([]);
            return;
        }
        fetchMatchingUsers(query);
    }, [query]);

    // Clear the share status message after a few seconds (UX polish)
    useEffect(() => {
        if (shareStatus) {
            const timeout = setTimeout(() => setShareStatus(null), 3000);
            return () => clearTimeout(timeout);
        }
    }, [shareStatus]);

    // Fire off request to Supabase to get matching users + resolve their signed profile pics
    async function fetchMatchingUsers(name: string) {
        setIsSearching(true);
        const usersWithSimilarName = await fetchMatchingUsersBySimilarName(name);

        const signedUsers = await Promise.all(
            usersWithSimilarName.map(async (user) => {
                const signedUrl = user.profile_pic_url
                    ? await generateUSERProfilePicSignedUrl(user.profile_pic_url)
                    : null;

                return {
                    id: user.id,
                    username: user.username,
                    profile_pic_url: signedUrl,
                };
            })
        );

        setResults(signedUsers);
        setIsSearching(false);
    }

    // When user clicks to share the trivia with someone
    async function handleShare(user: ShareRecipient) {
        setShareStatus(null);

        // Get the list of trivia already shared with this user
        const sharedTrivia = await getAllTriviaSharedWithUser(user);
        if (!sharedTrivia) {
            setShareStatus('Failed to fetch user data.');
            return;
        }

        // Prevent duplicates
        if (sharedTrivia.includes(triviaid)) {
            setShareStatus(`"${triviaTitle}" was already shared with ${user.username}`);
            return;
        }

        // Add this trivia to their list and update Supabase
        const updatedTriviaList = [...sharedTrivia, triviaid];
        const success = await updateTriviaSharedWithUser(user.id, updatedTriviaList);

        if (!success) {
            setShareStatus('Failed to share. Try again.');
            return;
        }

        setShareStatus(`"${triviaTitle}" was successfully shared with ${user.username}!`);
    }

    return (
        <>
            {!triviaTitle ? (
                <div>Loading trivia info...</div>
            ) : (
                <main className="share-container">
                    <h1 className="share-title">Share &quot;{triviaTitle}&quot; with ... ?</h1>
                    <input
                        type="text"
                        placeholder="Search usernames..."
                        className="share-search-input"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />

                    {shareStatus && <div className="share-status-message">{shareStatus}</div>}

                    {query.trim() !== '' && (
                        <div className="search-results">
                            {results.map((user) => (
                                <div
                                    key={user.id}
                                    className="search-user-card"
                                    onClick={() => handleShare(user)}
                                >
                                    <ProfilePicture
                                        src={user.profile_pic_url}
                                        alt={`${user.username}'s profile picture`}
                                    />
                                    <span>{user.username}</span>
                                </div>
                            ))}
                            {!isSearching && results.length === 0 && (
                                <div className="text-gray-500 text-center mt-4 italic">
                                    No users match that name.
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        className="share-button-container share-back-button"
                        onClick={() => router.push('../dashboard')}
                    >
                        {BUTTON_LABELS.BACK_TO_DASHBOARD}
                    </button>
                </main>
            )}
        </>
    );
}