import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ASSETS, Language, PLATFORM, TRANSLATIONS } from '../constants/assets';

interface SplashScreenProps {
  onComplete: () => void;
  language: Language;
}

export function SplashScreen({ onComplete, language }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const start = Date.now();
    const duration = 2600;
    let completed = false;

    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);

      if (!completed && pct >= 100) {
        completed = true;
        clearInterval(timer);
        setTimeout(() => setFading(true), 250);
        setTimeout(() => onCompleteRef.current(), 750);
      }
    }, 30);

    return () => clearInterval(timer);
  }, []);

  const stages = TRANSLATIONS[language].splashStages;
  const stageIdx = Math.min(Math.floor((progress / 100) * stages.length), stages.length - 1);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-black transition-all duration-700 ease-in-out ${
        fading ? 'scale-105 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
      }`}
    >
      {/* Ambient glows & cyber grid */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -left-[15%] -top-[15%] h-[55%] w-[55%] rounded-full bg-[rgba(59,130,246,0.16)] blur-[130px] animate-pulse" />
        <div
          className="absolute -bottom-[15%] -right-[15%] h-[55%] w-[55%] rounded-full bg-[rgba(59,130,246,0.12)] blur-[130px] animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(59,130,246,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.35) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(circle at 50% 45%, black, transparent 72%)',
            WebkitMaskImage: 'radial-gradient(circle at 50% 45%, black, transparent 72%)',
          }}
        />
      </div>

      {/* Scan beam */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="animate-scan h-24 w-full bg-gradient-to-b from-transparent via-[rgba(59,130,246,0.12)] to-transparent" />
      </div>

      {/* Center Logo & Loader */}
      <div className="relative z-10 flex w-full max-w-xs flex-col items-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
          className="relative mb-10 flex items-center justify-center"
        >
          <div className="absolute -inset-12 rounded-full bg-[rgba(59,130,246,0.22)] blur-[60px] animate-pulse" />

          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-4 rounded-full border border-dashed border-[rgba(59,130,246,0.35)]"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-2 rounded-full border border-[rgba(59,130,246,0.25)] border-t-[#3B82F6]"
          />

          <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-[rgba(59,130,246,0.45)] bg-black/90 p-2 shadow-[0_0_40px_rgba(59,130,246,0.35)]">
            {!imgError ? (
              <img
                src={ASSETS.brandLogo}
                alt={PLATFORM.brandTitle}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span className="font-mono text-2xl font-black tracking-wider text-[#3B82F6]">CH</span>
            )}
          </div>
        </motion.div>

        <h1 className="mb-2 text-2xl font-black tracking-wide text-white">
          Crush <span className="text-[#3B82F6]">Hack</span>
        </h1>

        <p className="mb-6 text-xs font-bold tracking-wider text-[#3B82F6]/90">
          {stages[stageIdx]}
        </p>

        {/* Progress Bar */}
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-l from-[#3B82F6] to-white shadow-[0_0_16px_rgba(59,130,246,0.8)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        <div className="flex w-full items-center justify-between">
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3, 4].map((idx) => (
              <motion.div
                key={idx}
                animate={{
                  opacity: progress > (idx + 1) * 18 ? 1 : 0.2,
                  scale: progress > (idx + 1) * 18 ? 1.25 : 1,
                }}
                className="h-1.5 w-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.9)]"
              />
            ))}
          </div>
          <span className="font-mono text-xs font-black tabular-nums text-white/60">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    </div>
  );
}
