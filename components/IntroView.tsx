import React, { useEffect, useState, useCallback, useRef } from 'react';
import { auth } from '../firebaseAuthClient';
import { getIdTokenResult, onAuthStateChanged, User } from 'firebase/auth';

interface IntroViewProps {
  onComplete: (redirectPath: string) => void;
}

const AUTH_INIT_TIMEOUT_MS = 2500;
const TOKEN_CHECK_TIMEOUT_MS = 2500;
const INTRO_MAX_DURATION_MS = 12000;
const INTRO_BOOT_DELAY_MS = 1100;
const INTRO_AUTH_CHECK_DELAY_MS = 0;
const INTRO_FADE_DURATION_MS = 350;
const LOADING_TEXT = 'AURAX';
const LOADING_LETTER_INTERVAL_MS = 320;
const LOADING_FINAL_GLOW_HOLD_MS = 420;
const INTRO_MIN_VISIBLE_MS =
  INTRO_BOOT_DELAY_MS + (LOADING_TEXT.length - 1) * LOADING_LETTER_INTERVAL_MS + 80;
const INTRO_REDIRECT_DECISION_TIMEOUT_MS = 3000;
const POST_ON_COMPLETE_FALLBACK_MS = 650;
const LOADER_COMPLETION_MAX_WAIT_MS = 3000;

const IntroView: React.FC<IntroViewProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [filledLetters, setFilledLetters] = useState(0);
  const hasCompletedRef = useRef(false);
  const isMountedRef = useRef(true);
  const filledLettersRef = useRef(0);
  const introStartedAtRef = useRef<number>(Date.now());
  const fadeTimerRef = useRef<number | null>(null);
  const navigationFallbackTimerRef = useRef<number | null>(null);

  const clearNavigationTimers = useCallback(() => {
    if (fadeTimerRef.current !== null) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }

    if (navigationFallbackTimerRef.current !== null) {
      window.clearTimeout(navigationFallbackTimerRef.current);
      navigationFallbackTimerRef.current = null;
    }
  }, []);

  const forceNavigate = useCallback((redirectPath: string) => {
    const targetUrl = new URL(redirectPath, window.location.origin);
    window.location.replace(targetUrl.toString());
  }, []);

  useEffect(() => {
    // React StrictMode (dev) runs mount/cleanup twice; reset this on each setup.
    isMountedRef.current = true;
    introStartedAtRef.current = Date.now();
    return () => {
      isMountedRef.current = false;
      clearNavigationTimers();
    };
  }, [clearNavigationTimers]);

  useEffect(() => {
    filledLettersRef.current = filledLetters;
  }, [filledLetters]);

  const wait = useCallback(async (delayMs: number) => {
    if (delayMs <= 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, delayMs);
    });
  }, []);

  const waitForLoaderCompletion = useCallback(async () => {
    const deadline = Date.now() + LOADER_COMPLETION_MAX_WAIT_MS;

    while (
      isMountedRef.current &&
      filledLettersRef.current < LOADING_TEXT.length &&
      Date.now() < deadline
    ) {
      await wait(50);
    }
  }, [wait]);

  const getFastFallbackPath = useCallback(() => {
    if (!auth) {
      return '/';
    }

    return auth.currentUser ? '/?page=events' : '/';
  }, []);

  const completeIntro = useCallback(
    (redirectPath: string) => {
      if (hasCompletedRef.current || !isMountedRef.current) {
        return;
      }

      hasCompletedRef.current = true;
      setFilledLetters(LOADING_TEXT.length);
      setIsVisible(false);

      clearNavigationTimers();

      fadeTimerRef.current = window.setTimeout(() => {
        if (!isMountedRef.current) {
          return;
        }

        try {
          onComplete(redirectPath);
        } catch (error) {
          console.error('[Intro] onComplete failed. Forcing hard navigation.', error);
          forceNavigate(redirectPath);
          return;
        }

        // If callback path stalls and IntroView is still mounted, force a hard redirect.
        navigationFallbackTimerRef.current = window.setTimeout(() => {
          if (isMountedRef.current) {
            console.warn('[Intro] Callback navigation stalled. Forcing hard navigation.');
            forceNavigate(redirectPath);
          }
        }, POST_ON_COMPLETE_FALLBACK_MS);
      }, INTRO_FADE_DURATION_MS);
    },
    [clearNavigationTimers, forceNavigate, onComplete]
  );

  const waitForInitialAuthState = useCallback(async (): Promise<void> => {
    if (!auth) {
      return;
    }

    await new Promise<void>((resolve) => {
      let settled = false;
      let unsubscribe: (() => void) | null = null;

      const finalize = () => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timeoutId);
        if (unsubscribe) {
          unsubscribe();
        }
        resolve();
      };

      const timeoutId = window.setTimeout(() => {
        console.warn('[Intro] Auth state check timed out. Continuing with current session state.');
        finalize();
      }, AUTH_INIT_TIMEOUT_MS);

      unsubscribe = onAuthStateChanged(
        auth,
        () => {
          finalize();
        },
        (error) => {
          console.error('[Intro] Auth state observer failed:', error);
          finalize();
        }
      );

      // Handles edge case where callback fires before assignment completes.
      if (settled && unsubscribe) {
        unsubscribe();
      }
    });
  }, []);

  const getIdTokenResultWithTimeout = useCallback(
    async (currentUser: User) => {
      return await new Promise<Awaited<ReturnType<typeof getIdTokenResult>>>(
        (resolve, reject) => {
          let settled = false;

          const finalizeResolve = (value: Awaited<ReturnType<typeof getIdTokenResult>>) => {
            if (settled) {
              return;
            }
            settled = true;
            window.clearTimeout(timeoutId);
            resolve(value);
          };

          const finalizeReject = (error: unknown) => {
            if (settled) {
              return;
            }
            settled = true;
            window.clearTimeout(timeoutId);
            reject(error);
          };

          const timeoutId = window.setTimeout(() => {
            finalizeReject(new Error('[Intro] Token check timed out.'));
          }, TOKEN_CHECK_TIMEOUT_MS);

          getIdTokenResult(currentUser, true)
            .then(finalizeResolve)
            .catch(finalizeReject);
        }
      );
    },
    []
  );

  const checkAuthAndRedirect = useCallback(async () => {
    await wait(INTRO_AUTH_CHECK_DELAY_MS);

    if (!isMountedRef.current) {
      return;
    }

    const fallbackPath = getFastFallbackPath();

    const redirectPath = await new Promise<string>((resolve) => {
      let settled = false;

      const finalize = (path: string) => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timeoutId);
        resolve(path);
      };

      const timeoutId = window.setTimeout(() => {
        console.warn('[Intro] Redirect decision timed out. Using fallback route.');
        finalize(fallbackPath);
      }, INTRO_REDIRECT_DECISION_TIMEOUT_MS);

      const decideRedirect = async () => {
        if (!auth) {
          return '/';
        }

        try {
          await waitForInitialAuthState();

          const currentUser = auth.currentUser;

          if (!currentUser) {
            return '/';
          }

          const tokenResult = await getIdTokenResultWithTimeout(currentUser);
          const hasAdminClaim = tokenResult.claims.admin === true;
          const isEmailVerified =
            tokenResult.claims.email_verified === true || currentUser.emailVerified;

          return hasAdminClaim && isEmailVerified
            ? '/?page=admin'
            : '/?page=events';
        } catch (error) {
          console.error('Auth check error:', error);
          return fallbackPath;
        }
      };

      void decideRedirect().then(finalize).catch(() => {
        finalize(fallbackPath);
      });
    });

    if (!isMountedRef.current) {
      return;
    }

    const elapsedMs = Date.now() - introStartedAtRef.current;
    const remainingIntroMs = Math.max(0, INTRO_MIN_VISIBLE_MS - elapsedMs);
    await wait(remainingIntroMs);
    await waitForLoaderCompletion();
    await wait(LOADING_FINAL_GLOW_HOLD_MS);

    if (!isMountedRef.current) {
      return;
    }

    completeIntro(redirectPath);
  }, [
    completeIntro,
    getFastFallbackPath,
    getIdTokenResultWithTimeout,
    wait,
    waitForLoaderCompletion,
    waitForInitialAuthState
  ]);

  useEffect(() => {
    // Animate letters filling up one by one.
    const letters = LOADING_TEXT;
    let currentIndex = 0;
    const timerIds: number[] = [];

    const schedule = (callback: () => void, delayMs: number) => {
      const timerId = window.setTimeout(callback, delayMs);
      timerIds.push(timerId);
      return timerId;
    };

    const fillLetter = () => {
      if (currentIndex < letters.length) {
        setFilledLetters(currentIndex + 1);
        currentIndex++;
        if (currentIndex < letters.length) {
          schedule(fillLetter, LOADING_LETTER_INTERVAL_MS);
        }
      }
    };

    // Start filling after a brief delay
    schedule(() => {
      fillLetter();
      void checkAuthAndRedirect();
    }, INTRO_BOOT_DELAY_MS);

    return () => {
      timerIds.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [checkAuthAndRedirect]);

  useEffect(() => {
    // Global fail-safe: intro should never block the app indefinitely on any mobile browser.
    const failsafeTimer = window.setTimeout(() => {
      console.warn('[Intro] Global timeout reached. Forcing fallback navigation.');
      completeIntro('/');
    }, INTRO_MAX_DURATION_MS);

    return () => {
      window.clearTimeout(failsafeTimer);
    };
  }, [completeIntro]);

  const loadingText = LOADING_TEXT;
  const filledCount = filledLetters;

  return (
    <div
      className={`intro-container ${
        isVisible ? 'intro-visible' : 'intro-hidden'
      }`}
    >
      {/* Animated background */}
      <div className="intro-background">
        <div className="bg-gradient-orb orb-1"></div>
        <div className="bg-gradient-orb orb-2"></div>
        <div className="bg-gradient-orb orb-3"></div>
        <div className="grid-overlay"></div>
        <div className="noise-overlay"></div>
      </div>

      {/* Content */}
      <div className="intro-content">
        {/* Main Title */}
        <h1 className="intro-title">
          <span className="title-text">AURAX</span>
          <span className="title-year">2026</span>
        </h1>

        {/* Subtitle */}
        <p className="intro-subtitle">
          <span className="subtitle-text">Andhra University</span>
          <span className="subtitle-divider">—</span>
          <span className="subtitle-dept">CSE Department</span>
        </p>

        {/* Tagline */}
        <div className="intro-tagline">
          <span className="tagline-text">Technical</span>
          <span className="tagline-dot">•</span>
          <span className="tagline-text">NonTechnical</span>
          <span className="tagline-dot">•</span>
          <span className="tagline-text">Sports</span>
          <span className="tagline-dot">•</span>
          <span className="tagline-text">Culturals</span>
        </div>

        {/* AURAX Loading Animation */}
        <div className="intro-loading">
          <div
            className={`loading-container ${
              filledCount === loadingText.length ? 'all-filled' : ''
            }`}
          >
            {loadingText.split('').map((letter, index) => (
              <span
                key={index}
                className={`loading-letter ${
                  index < filledCount ? 'filled' : 'empty'
                } ${index === filledCount - 1 ? 'active' : ''} ${
                  index === loadingText.length - 1 && filledCount === loadingText.length
                    ? 'final-x'
                    : ''
                }`}
              >
                {letter}
              </span>
            ))}
          </div>
          <span className="loading-status">
            {filledCount === 0 && 'Initializing'}
            {filledCount === 1 && 'Loading'}
            {filledCount === 2 && 'Processing'}
            {filledCount === 3 && 'Syncing'}
            {filledCount === 4 && 'Ready'}
            {filledCount === 5 && 'Redirecting'}
          </span>
        </div>
      </div>

      {/* Styles - Matching website theme */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&display=swap');

        .intro-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #09090b;
          overflow: hidden;
        }

        .intro-visible {
          opacity: 1;
          transition: opacity 0.6s ease-out;
        }

        .intro-hidden {
          opacity: 0;
          pointer-events: none;
        }

        /* Animated Background */
        .intro-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .bg-gradient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.15;
          animation: float 8s ease-in-out infinite;
        }

        .orb-1 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, #4f46e5 0%, transparent 70%);
          top: -200px;
          left: -100px;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #7c3aed 0%, transparent 70%);
          bottom: -150px;
          right: -100px;
          animation-delay: -2s;
        }

        .orb-3 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, #6366f1 0%, transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: -4s;
          opacity: 0.1;
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -30px) scale(1.05);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.95);
          }
        }

        .grid-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
          background-size: 60px 60px;
          animation: gridPulse 4s ease-in-out infinite;
        }

        @keyframes gridPulse {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }

        .noise-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        }

        /* Content */
        .intro-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2rem;
        }

        /* Title */
        .intro-title {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 1.5rem;
          animation: titleEntrance 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
          transform: translateY(30px);
        }

        @keyframes titleEntrance {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .title-text {
          font-family: 'Orbitron', sans-serif;
          font-size: clamp(4rem, 15vw, 10rem);
          font-weight: 900;
          letter-spacing: 0.15em;
          color: #ffffff;
          text-shadow: 0 0 60px rgba(99, 102, 241, 0.3);
          filter: drop-shadow(0 0 30px rgba(99, 102, 241, 0.25));
        }

        .title-year {
          font-family: 'Rajdhani', sans-serif;
          font-size: clamp(2rem, 8vw, 5rem);
          font-weight: 700;
          letter-spacing: 0.3em;
          color: rgba(255, 255, 255, 0.6);
          margin-top: -0.5rem;
          animation: yearFadeIn 1s ease-out 0.5s forwards;
          opacity: 0;
        }

        @keyframes yearFadeIn {
          to {
            opacity: 1;
          }
        }

        /* Subtitle */
        .intro-subtitle {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
          animation: subtitleEntrance 1s ease-out 0.6s forwards;
          opacity: 0;
          transform: translateY(20px);
        }

        @keyframes subtitleEntrance {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .subtitle-text {
          font-family: 'Rajdhani', sans-serif;
          font-size: clamp(1rem, 3vw, 1.5rem);
          font-weight: 500;
          color: rgba(255, 255, 255, 0.5);
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .subtitle-divider {
          color: rgba(99, 102, 241, 0.5);
          font-size: 1.5rem;
        }

        .subtitle-dept {
          font-family: 'Rajdhani', sans-serif;
          font-size: clamp(0.9rem, 2.5vw, 1.25rem);
          font-weight: 400;
          color: rgba(255, 255, 255, 0.35);
          letter-spacing: 0.15em;
        }

        /* Tagline */
        .intro-tagline {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 3rem;
          animation: taglineEntrance 1s ease-out 1s forwards;
          opacity: 0;
          transform: translateY(15px);
        }

        @keyframes taglineEntrance {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .tagline-text {
          font-family: 'Rajdhani', sans-serif;
          font-size: clamp(0.85rem, 2vw, 1.1rem);
          font-weight: 600;
          color: rgba(255, 255, 255, 0.4);
          letter-spacing: 0.3em;
          text-transform: uppercase;
        }

        .tagline-dot {
          color: rgba(99, 102, 241, 0.4);
          font-size: 0.8rem;
        }

        /* Loading with AURAX fill */
        .intro-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          animation: loadingEntrance 0.8s ease-out 1.4s forwards;
          opacity: 0;
        }

        @keyframes loadingEntrance {
          to {
            opacity: 1;
          }
        }

        .loading-container {
          display: flex;
          gap: 0.25rem;
          transform: translateZ(0);
          will-change: transform, opacity;
        }

        .loading-letter {
          font-family: 'Orbitron', sans-serif;
          font-size: clamp(1.5rem, 4vw, 2.5rem);
          font-weight: 700;
          width: clamp(1.5rem, 4vw, 2.5rem);
          text-align: center;
          backface-visibility: hidden;
          transform: translateZ(0);
          will-change: color, opacity, transform, text-shadow;
          transition:
            color 0.18s linear,
            opacity 0.18s linear,
            transform 0.22s ease-out,
            text-shadow 0.22s ease-out;
        }

        .loading-letter.empty {
          color: rgba(255, 255, 255, 0.1);
        }

        .loading-letter.filled {
          color: #6366f1;
          text-shadow: 0 0 14px rgba(99, 102, 241, 0.5);
          animation: letterFill 0.24s ease-out forwards;
        }

        .loading-letter.active {
          text-shadow:
            0 0 10px rgba(129, 140, 248, 0.7),
            0 0 20px rgba(129, 140, 248, 0.45);
        }

        .loading-letter.final-x {
          animation:
            letterFill 0.24s ease-out forwards,
            finalXGlow 0.42s ease-out forwards;
        }

        .loading-container.all-filled .loading-letter.filled {
          color: #818cf8;
          text-shadow:
            0 0 10px rgba(99, 102, 241, 0.65),
            0 0 18px rgba(99, 102, 241, 0.45);
        }

        @keyframes letterFill {
          0% {
            transform: translateZ(0) scale(1.08);
            opacity: 0.7;
          }
          100% {
            transform: translateZ(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes finalXGlow {
          0% {
            color: #818cf8;
            text-shadow:
              0 0 12px rgba(129, 140, 248, 0.7),
              0 0 24px rgba(129, 140, 248, 0.45);
          }
          100% {
            color: #a5b4fc;
            text-shadow:
              0 0 16px rgba(165, 180, 252, 0.8),
              0 0 32px rgba(165, 180, 252, 0.5);
          }
        }

        .loading-status {
          font-family: 'Rajdhani', sans-serif;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.25);
          letter-spacing: 0.3em;
          text-transform: uppercase;
          min-width: 120px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .intro-subtitle {
            flex-direction: column;
            gap: 0.5rem;
          }

          .subtitle-divider {
            display: none;
          }

          .intro-tagline {
            flex-wrap: wrap;
            justify-content: center;
            gap: 0.45rem;
            padding: 0;
            white-space: normal;
          }

          .tagline-text {
            font-size: clamp(0.7rem, 2.5vw, 0.85rem);
            letter-spacing: 0.18em;
          }

          .tagline-dot {
            font-size: 0.65rem;
          }

          .bg-gradient-orb {
            filter: blur(70px);
            opacity: 0.12;
          }

          .grid-overlay {
            animation: none;
            opacity: 0.45;
          }

          .noise-overlay {
            display: none;
          }

          .loading-letter {
            width: clamp(1.2rem, 3vw, 2rem);
          }
        }

        /* Reduce motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          .bg-gradient-orb,
          .grid-overlay,
          .title-text,
          .title-year,
          .intro-subtitle,
          .intro-tagline,
          .intro-loading,
          .loading-letter {
            animation: none;
            opacity: 1;
            transform: none;
          }
          
          .loading-letter.filled {
            color: #6366f1;
          }
        }
      `}</style>
    </div>
  );
};

export default IntroView;
