'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  getAuthenticatedUser,
  getSharedTriviasWithSharerInfo,
  removeTriviaFromSharedWithMe,
  generateUSERProfilePicSignedUrl,
} from '@/app/supabasefuncs/helperSupabaseFuncs';
import { SharedTrivia } from '@/app/interfaces/triviaTypes';
import '../../cssStyling/viewSharedTrivias.css';
import { BUTTON_LABELS } from '@/app/constants/gameSettings';

const fetchSharedTrivias = async (
  router: ReturnType<typeof useRouter>,
  setSharedTrivias: React.Dispatch<React.SetStateAction<SharedTrivia[]>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  setLoading(true);
  const user = await getAuthenticatedUser();
  if (!user) {
    router.push('/login');
    return;
  }
  const data = await getSharedTriviasWithSharerInfo(user.id);
  const updatedData = await Promise.all(
    data.map(async (trivia) => {
      if (trivia.sharerProfilePicUrl) {
        const signedUrl = await generateUSERProfilePicSignedUrl(trivia.sharerProfilePicUrl, 3600);
        return { ...trivia, sharerProfilePicUrl: signedUrl };
      }
      return trivia;
    })
  );
  setSharedTrivias(updatedData);
  setLoading(false);
};

export default function ViewSharedTrivias() {
  const router = useRouter();
  const [sharedTrivias, setSharedTrivias] = useState<SharedTrivia[]>([]);
  const [loading, setLoading] = useState(true);
  const [playLoadingId, setPlayLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSharedTrivias(router, setSharedTrivias, setLoading);
  }, [router]);

  const handleDelete = async (triviaId: string) => {
    const user = await getAuthenticatedUser();
    if (!user) return;

    const success = await removeTriviaFromSharedWithMe(user.id, triviaId);
    if (success) {
      setSharedTrivias((prev) => prev.filter((t) => t.triviaId !== triviaId));
    } else {
      alert('Failed to remove trivia.');
    }
  };

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">{BUTTON_LABELS.PLAY_SHARED.generic}</h1>
      <p className="dashboard-subtext">
        {BUTTON_LABELS.PLAY_SHARED.generic_description}
      </p>

      <button className="dashboard-back-button" onClick={() => router.push('./dashboard')}>
        {BUTTON_LABELS.BACK_TO_DASHBOARD}
      </button>

      {loading ? (
        <div className="spinner-container">
          <div className="spinner" />
        </div>
      ) : sharedTrivias.length === 0 ? (
        <p>No trivia games shared with you yet.</p>
      ) : (
        <div className="shared-trivia-list">
          {sharedTrivias.map(({ triviaId, title, sharerUsername, sharerProfilePicUrl }) => (
            <div key={triviaId} className="trivia-card-horizontal">
              <div className="trivia-left">
                {sharerProfilePicUrl ? (
                  <Image
                    src={sharerProfilePicUrl}
                    alt={`${sharerUsername}'s profile`}
                    className="sharer-profile-pic"
                    width={48}
                    height={48}
                    priority  // optional but improves LCP
                  />
                ) : (
                  <div className="sharer-profile-placeholder">
                    {sharerUsername.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="trivia-text-group">
                  <span className="sharer-username">{sharerUsername}</span>
                  <span className="trivia-title">{title}</span>
                </div>
              </div>

              <div className="trivia-right">
                <button
                  className="rounded-btn play"
                  onClick={() => {
                    setPlayLoadingId(triviaId);
                    setTimeout(() => {
                      router.push(`./playTrivia/${triviaId}`);
                    }, 2000); // Delay is mostly for fun UX / spinner effect
                  }}
                >
                  {playLoadingId === triviaId ? <div className="mini-spinner" /> : '▶ Play'}
                </button>
                <button
                  className="rounded-btn delete"
                  onClick={() => handleDelete(triviaId)}
                >
                  ✕ Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}