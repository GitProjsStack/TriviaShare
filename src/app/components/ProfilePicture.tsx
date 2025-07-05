'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import {
  getAuthenticatedUser,
  getUSERProfile,
  uploadToUSERProfilePics,
  generateUSERProfilePicSignedUrl
} from '../../app/supabasefuncs/helperSupabaseFuncs';

import '../cssStyling/ProfilePicture.css';

type Props = {
  src?: string | null;
  alt?: string;
  clickable?: boolean; // if true, clicking the picture triggers file upload dialog
};

// Clean up filenames for storage — replace spaces, remove unsafe chars
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\s+/g, '_')       // spaces to underscores
    .replace(/[^\w.-]/g, '');   // strip out anything except letters, numbers, underscore, dot, dash
}

export default function ProfilePicture({ src, alt = 'User profile picture', clickable = false }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentProfilePicPath, setCurrentProfilePicPath] = useState<string | null>(null);

  useEffect(() => {
    // If src is passed from parent, just display it, no need to fetch anything
    if (src !== undefined) return;

    // Fetch user info and load signed URL for their profile pic
    async function fetchPic() {
      const user = await getAuthenticatedUser();
      if (!user) return;

      setUserId(user.id);

      const profile = await getUSERProfile(user.id);
      if (!profile) return;

      const profilePicPath = profile.profile_pic_url;
      if (profilePicPath) {
        setCurrentProfilePicPath(profilePicPath);
        const signedUrl = await generateUSERProfilePicSignedUrl(profilePicPath);
        if (signedUrl) setImageUrl(signedUrl);
      }
    }

    fetchPic();
  }, [src]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);

    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Simple size check: max 1MB
    if (file.size > 1048576) {
      setErrorMsg('File too large. Max 1MB allowed.');
      return;
    }

    // Prepare safe filename for upload
    const safeFileName = sanitizeFilename(file.name);
    // Use userId and timestamp to avoid collisions
    const newPath = `${userId}/${Date.now()}-${safeFileName}`;

    // Upload file, replacing old one if exists
    const success = await uploadToUSERProfilePics(userId, newPath, file, currentProfilePicPath || undefined);

    if (!success) {
      setErrorMsg('Upload failed.');
      return;
    }

    // After upload, generate signed URL to display new pic
    const signedUrl = await generateUSERProfilePicSignedUrl(newPath);
    if (signedUrl) {
      setImageUrl(signedUrl);
      setCurrentProfilePicPath(newPath);
    }
  };

  // Final image src: either from props or fetched URL
  const finalSrc = src ?? imageUrl;

  return (
    <>
      <div
        className="profile-pic-upload clickable"
        onClick={() => clickable && fileInputRef.current?.click()}
      >
        {finalSrc ? (
          <Image
            src={finalSrc}
            alt={alt}
            className="profile-pic-image"
            width={150}
            height={150}
            style={{ borderRadius: '50%' }}
            priority={true}  // Optional, if you want to preload image for better LCP
          />
        ) : (
          <div className="profile-placeholder">👤</div>
        )}
      </div>

      {/* Hidden file input triggered by clicking picture */}
      {clickable && (
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleUpload}
        />
      )}

      {/* Show error messages below picture */}
      {errorMsg && (
        <p style={{ color: 'red', marginTop: '0.5rem', fontWeight: '600' }}>{errorMsg}</p>
      )}
    </>
  );
}