'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '../app/supabase/supabaseClient';
import '../app/cssStyling/homepagestyling.css';

export default function Home() {
  const router = useRouter();

  // Auth input fields
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Toggle between login and signup
  const [authType, setAuthType] = useState<'signup' | 'login'>('login');

  // UI feedback
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset messages when switching between login/signup
  useEffect(() => {
    setError('');
    setSuccessMsg('');
  }, [authType]);

  const handleAuth = async () => {
    setError('');
    setSuccessMsg('');

    // Handle signup
    if (authType === 'signup') {
      if (!username.trim()) {
        setError('Please enter a username.');
        return;
      }

      const {
        data: { user },
        error: signUpError,
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: username.trim() },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (user) {
        setSuccessMsg('Signup successful! Please check your email to verify your account.');
      }
    }
    // Handle login
    else {
      const {
        data: { user },
        error: loginError,
      } = await supabase.auth.signInWithPassword({ email, password });

      if (loginError) {
        setError(loginError.message);
      } else if (user) {
        setSuccessMsg('Login successful! Redirecting...');
        // Give user a second to see success before redirect
        setTimeout(() => router.push('./triviaPages/dashboard'), 1500);
      }
    }
  };

  return (
    <div className="trivia-container">
      <Image
        src="/triviagame-logo.png"
        alt="TriviaShare Logo"
        className="trivia-logo"
        width={200}
        height={200}
        priority={true}     // optional: loads image with priority for faster LCP
      />
      <h1 className="trivia-title">TriviaShare</h1>

      {authType === 'signup' && (
        <input
          type="text"
          placeholder="Username"
          className="trivia-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      )}

      <input
        type="email"
        placeholder="Email"
        className="trivia-input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="trivia-input"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p className="trivia-error">{error}</p>}
      {successMsg && <p className="trivia-success">{successMsg}</p>}

      <button className="trivia-button" onClick={handleAuth}>
        {authType === 'login' ? 'Log In' : 'Sign Up'}
      </button>

      <p className="trivia-footer">
        {authType === 'login' ? (
          <>
            No account?{' '}
            <span className="trivia-link" onClick={() => setAuthType('signup')}>
              Sign up
            </span>
          </>
        ) : (
          <>
            Have an account?{' '}
            <span className="trivia-link" onClick={() => setAuthType('login')}>
              Log in
            </span>
          </>
        )}
      </p>
    </div>
  );
}