import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  History,
  Lock,
  Play,
  RotateCcw,
  Send,
  ShieldAlert,
  SlidersHorizontal,
  Snowflake,
  Users,
} from 'lucide-react';
import { ASSETS, Language, PLATFORM, TRANSLATIONS } from '../constants/assets';
import {
  CrashCurrentData,
  CrashHistoryItem,
  fetchCrashState,
  fetchPastCrashHistory,
  sendCrashOverride,
} from '../services/crashFirebase';
import { soundFx } from '../utils/sound';

interface CrashPredictorProps {
  onBack: () => void;
  language: Language;
  userId: string;
}

export function CrashPredictor({ onBack, language, userId }: CrashPredictorProps) {
  const [displayedOdd, setDisplayedOdd] = useState<string>('0.00x');
  const [hasPrediction, setHasPrediction] = useState(false);
  const [isTracking, setIsTracking] = useState(true);
  const [dbClosed, setDbClosed] = useState(false);
  const [currentState, setCurrentState] = useState<CrashCurrentData | null>(null);
  const [history, setHistory] = useState<CrashHistoryItem[]>([]);
  const [onlineUsers, setOnlineUsers] = useState(1428);
  const [imgErr, setImgErr] = useState(false);

  // Override panel state
  const [showOverride, setShowOverride] = useState(false);
  const [overrideRound, setOverrideRound] = useState('');
  const [overridePoint, setOverridePoint] = useState('');
  const [overrideSending, setOverrideSending] = useState(false);
  const [overrideFeedback, setOverrideFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Strict single-source synchronization ref: lastShownRound = null
  const lastShownRoundRef = useRef<number | null>(null);
  const isTrackingRef = useRef<boolean>(true);
  const inFlightRef = useRef<boolean>(false);
  const historySeededRef = useRef<boolean>(false);

  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  useEffect(() => {
    const timer = setInterval(() => {
      setOnlineUsers((prev) => Math.max(800, prev + Math.floor(Math.random() * 5) - 2));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const processCurrentSnapshot = useCallback((data: CrashCurrentData) => {
    setCurrentState(data);

    // Seed initial completed rounds (< current.roundNumber) once
    if (!historySeededRef.current) {
      historySeededRef.current = true;
      fetchPastCrashHistory(data.roundNumber, 8).then((past) => {
        if (past.length > 0) {
          setHistory(past);
        }
      });
    }

    // Record finished round into history only AFTER it has crashed
    if (data.phase === 'crashed' && data.crashPoint >= 1) {
      setHistory((prev) => {
        if (prev.some((item) => item.roundNumber === data.roundNumber)) return prev;
        return [
          { roundNumber: data.roundNumber, crashPoint: data.crashPoint },
          ...prev,
        ].slice(0, 10);
      });
    }

    // STRICT PREDICTION DISPLAY GATE:
    // Show/update prediction ONLY when ALL conditions hold together:
    // 1) isTracking is active
    // 2) data.phase === 'waiting'
    // 3) data.roundNumber !== lastShownRound (and strictly newer if previous round was shown)
    // 4) data.crashPoint >= 1
    if (
      isTrackingRef.current &&
      data.phase === 'waiting' &&
      data.roundNumber !== lastShownRoundRef.current &&
      (lastShownRoundRef.current === null || data.roundNumber > lastShownRoundRef.current) &&
      data.crashPoint >= 1
    ) {
      // Lock immediately for this round throughout 'flight' and 'crashed'
      lastShownRoundRef.current = data.roundNumber;
      setDisplayedOdd(`${data.crashPoint.toFixed(2)}x`);
      setHasPrediction(true);
      soundFx.playSuccess();
    }
  }, []);

  const pollOnce = useCallback(
    async (signal?: AbortSignal) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        const res = await fetchCrashState(signal);

        if (res.closed) {
          // Immediately clear any predictions and lock display when DB is closed
          setDbClosed(true);
          setCurrentState(null);
          setDisplayedOdd('0.00x');
          setHasPrediction(false);
          lastShownRoundRef.current = null;
          return;
        }

        setDbClosed(false);
        if (res.current) {
          processCurrentSnapshot(res.current);
        }
      } catch {
        // Ignore transient aborted/network poll errors without emitting fake predictions
      } finally {
        inFlightRef.current = false;
      }
    },
    [processCurrentSnapshot]
  );

  // Real-time 300ms Firebase RTDB polling
  useEffect(() => {
    const controller = new AbortController();
    pollOnce(controller.signal);

    const interval = setInterval(() => {
      pollOnce(controller.signal);
    }, 300);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [pollOnce]);

  const handleStart = () => {
    soundFx.playClick();
    setIsTracking(true);
    isTrackingRef.current = true;
    pollOnce();
  };

  const handleReset = () => {
    soundFx.playClick();
    // Clear visible odd while keeping automatic polling active for the next waiting round
    setDisplayedOdd('0.00x');
    setHasPrediction(false);
    setIsTracking(true);
    isTrackingRef.current = true;
  };

  const handleSendOverride = async () => {
    if (overrideSending) return;
    soundFx.playClick();
    setOverrideFeedback(null);

    if (dbClosed) {
      soundFx.playError();
      setOverrideFeedback({ type: 'error', text: t.overrideErrorClosed });
      return;
    }

    const roundNum = parseInt(overrideRound.trim(), 10);
    const pointVal = parseFloat(overridePoint.trim());

    setOverrideSending(true);
    try {
      const res = await sendCrashOverride(roundNum, pointVal, currentState);
      if (res.ok) {
        soundFx.playSuccess();
        setOverrideFeedback({ type: 'success', text: t.overrideSent });
        setOverridePoint('');
      } else if (res.error === 'permission_denied') {
        soundFx.playError();
        setOverrideFeedback({ type: 'error', text: t.overrideErrorClosed });
      } else {
        soundFx.playError();
        setOverrideFeedback({ type: 'error', text: t.overrideErrorRound });
      }
    } catch {
      soundFx.playError();
      setOverrideFeedback({ type: 'error', text: t.overrideErrorGeneric });
    } finally {
      setOverrideSending(false);
    }
  };

  const getStatusLabel = () => {
    if (dbClosed) return t.dbClosedTitle;
    if (!currentState) return t.connectingServer;
    if (currentState.phase === 'waiting') {
      return hasPrediction ? t.confirmedPrediction : t.waitingPhase;
    }
    if (currentState.phase === 'flight') {
      return hasPrediction ? t.flightPhase : t.waitingNextRound;
    }
    return t.crashedPhase;
  };

  const isWaitingForNext =
    !dbClosed &&
    !hasPrediction &&
    (currentState?.phase === 'flight' || currentState?.phase === 'crashed');

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="relative flex min-h-full select-none flex-col text-white"
    >
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-24 h-80 w-80 -translate-x-1/2 rounded-full bg-[rgba(59,130,246,0.08)] blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col px-6 pb-12 pt-7">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              onBack();
            }}
            aria-label={t.back}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md transition-all hover:border-[rgba(59,130,246,0.4)] hover:text-[#3B82F6] active:scale-95"
          >
            <ArrowLeft className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
          </button>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
              <Users className="h-3 w-3 text-[#3B82F6]" />
              <span className="font-mono text-[11px] font-black tabular-nums text-white/75">
                {onlineUsers.toLocaleString()}
              </span>
            </div>

            <div
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${
                dbClosed
                  ? 'border-red-500/40 bg-red-500/10'
                  : 'border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.07)]'
              }`}
            >
              <Snowflake
                className={`h-3 w-3 ${
                  dbClosed ? 'text-red-400' : 'animate-pulse text-[#3B82F6]'
                }`}
              />
              <span
                className={`text-[10px] font-black tracking-widest ${
                  dbClosed ? 'text-red-400' : 'text-[#3B82F6]'
                }`}
              >
                {dbClosed ? 'OFF' : t.live}
              </span>
            </div>
          </div>
        </div>

        {/* Plane Icon & Title */}
        <div className="mt-6 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-[rgba(59,130,246,0.35)] bg-black/70 p-1.5 shadow-[0_0_24px_rgba(59,130,246,0.4)]">
            {!imgErr ? (
              <img
                src={ASSETS.crashPlane}
                alt={t.crashPredictorTitle}
                referrerPolicy="no-referrer"
                onError={() => setImgErr(true)}
                className="h-full w-full rounded-xl object-contain"
              />
            ) : (
              <span className="text-3xl">✈</span>
            )}
          </div>
          <h1 className="mt-3 text-[26px] font-black leading-tight tracking-tight">
            {t.crashPredictorTitle}
          </h1>
          <p className="mt-1 font-mono text-[11px] tracking-[0.12em] text-white/40">
            {t.brandTitle} · ID: {userId || '----------'}
          </p>
        </div>

        {/* Closed Database Alert Banner */}
        {dbClosed && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">
            <ShieldAlert className="h-5 w-5 shrink-0 text-red-400" />
            <div className="min-w-0">
              <p className="text-xs font-black text-red-300">{t.dbClosedTitle}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-red-200/80">
                {t.dbClosedDesc}
              </p>
            </div>
          </div>
        )}

        {/* Radar Scanner Dial */}
        <div
          className="relative mx-auto mt-7 flex items-center justify-center"
          style={{ width: 310, height: 310 }}
        >
          {!dbClosed &&
            [0, 1, 2].map((idx) => (
              <motion.div
                key={idx}
                className="absolute rounded-full border border-[rgba(59,130,246,0.45)]"
                style={{ width: 310, height: 310 }}
                animate={{ scale: [0.72, 1], opacity: [0.55, 0] }}
                transition={{
                  duration: 2.6,
                  repeat: Infinity,
                  delay: idx * 0.85,
                  ease: 'easeOut',
                }}
              />
            ))}

          {/* Conic sweep ring */}
          {!dbClosed && (
            <motion.div
              className="absolute rounded-full"
              style={{
                width: 310,
                height: 310,
                background:
                  'conic-gradient(from 0deg, rgba(59,130,246,0) 0deg, rgba(59,130,246,0.55) 90deg, rgba(59,130,246,0) 200deg)',
                mask: 'radial-gradient(circle, transparent 61%, #000 62%)',
                WebkitMask: 'radial-gradient(circle, transparent 61%, #000 62%)',
              }}
              animate={{ rotate: 360 }}
              transition={{
                duration: currentState?.phase === 'waiting' ? 2.2 : 6,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          )}

          {/* Inner Glass Dial */}
          <motion.div
            animate={
              dbClosed
                ? undefined
                : {
                    boxShadow: [
                      '0 0 30px rgba(59,130,246,0.18), inset 0 0 40px rgba(59,130,246,0.08)',
                      '0 0 70px rgba(59,130,246,0.45), inset 0 0 60px rgba(59,130,246,0.16)',
                      '0 0 30px rgba(59,130,246,0.18), inset 0 0 40px rgba(59,130,246,0.08)',
                    ],
                  }
            }
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className={`relative flex flex-col items-center justify-center rounded-full border backdrop-blur-xl ${
              dbClosed
                ? 'border-red-500/35 bg-gradient-to-b from-red-500/10 via-black/90 to-black'
                : 'border-[rgba(59,130,246,0.35)] bg-gradient-to-b from-[rgba(59,130,246,0.10)] via-black/80 to-black'
            }`}
            style={{ width: 254, height: 254 }}
          >
            {dbClosed ? (
              <>
                <Lock className="h-8 w-8 text-red-400" />
                <span className="mt-3 text-sm font-black text-red-300">
                  {t.dbClosedTitle}
                </span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-[#3B82F6]">
                    {currentState
                      ? `${t.roundLabel} #${currentState.roundNumber}`
                      : t.oddLabel}
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${displayedOdd}-${lastShownRoundRef.current ?? 'none'}`}
                    initial={{ scale: 0.9, opacity: 0.6 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    dir="ltr"
                    className="mt-1.5 font-mono text-[52px] font-black leading-none tracking-tight tabular-nums"
                    style={{
                      color: hasPrediction ? '#3B82F6' : 'rgba(255,255,255,0.45)',
                      textShadow: hasPrediction
                        ? '0 0 30px rgba(59,130,246,0.75)'
                        : '0 0 18px rgba(255,255,255,0.12)',
                    }}
                  >
                    {hasPrediction ? displayedOdd : isWaitingForNext ? '--.--x' : '0.00x'}
                  </motion.div>
                </AnimatePresence>

                <p className="mt-2.5 max-w-[200px] text-center text-[11px] font-semibold leading-relaxed text-white/55">
                  {getStatusLabel()}
                </p>
              </>
            )}
          </motion.div>
        </div>

        {/* Previous Finished Rounds History */}
        <div className="mt-7">
          <div className="mb-2.5 flex items-center gap-1.5 px-1">
            <History className="h-3.5 w-3.5 text-[#3B82F6]" />
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-white/45">
              {t.prevPredictions}
            </span>
          </div>

          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-1" dir="ltr">
            {history.length > 0 ? (
              history.map((item, idx) => (
                <div
                  key={item.roundNumber}
                  className={`shrink-0 rounded-xl border px-3 py-1.5 font-mono text-[11px] font-black tabular-nums ${
                    idx === 0
                      ? 'border-[rgba(59,130,246,0.6)] bg-[rgba(59,130,246,0.10)] text-[#3B82F6]'
                      : 'border-white/[0.07] bg-white/[0.02] text-white/45'
                  }`}
                >
                  {item.crashPoint.toFixed(2)}x
                </div>
              ))
            ) : (
              <span className="text-xs text-white/35">{t.noHistoryYet}</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleStart}
              disabled={dbClosed}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-[20px] bg-gradient-to-l from-[#3B82F6] to-white py-4 text-[13px] font-black uppercase tracking-wider text-black shadow-[0_16px_40px_-16px_rgba(59,130,246,0.8)] transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Play className="h-4 w-4 fill-black" />
              <span>{t.startBtn}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-[20px] border border-[rgba(59,130,246,0.3)] bg-white/[0.03] py-4 text-[13px] font-black uppercase tracking-wider text-[#3B82F6] transition-all active:scale-[0.97]"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{t.reset}</span>
            </button>
          </div>

          {/* Optional Custom Override Panel */}
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              const nextOpen = !showOverride;
              setShowOverride(nextOpen);
              if (nextOpen && currentState && !overrideRound) {
                const defaultTarget =
                  currentState.phase === 'waiting'
                    ? currentState.roundNumber
                    : currentState.roundNumber + 1;
                setOverrideRound(String(defaultTarget));
              }
            }}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-[18px] border border-white/[0.08] bg-white/[0.02] py-3 text-xs font-bold text-white/70 transition-all hover:border-[#3B82F6]/40 hover:text-white"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#3B82F6]" />
            <span>{t.overrideToggle}</span>
          </button>

          <AnimatePresence>
            {showOverride && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex flex-col gap-2.5 rounded-2xl border border-[rgba(59,130,246,0.28)] bg-[#030712] p-4"
              >
                <div className="grid grid-cols-2 gap-2.5" dir="ltr">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={overrideRound}
                    onChange={(e) => setOverrideRound(e.target.value)}
                    placeholder={t.overrideRoundPlaceholder}
                    className="w-full rounded-xl border border-white/10 bg-black/70 px-3 py-2.5 font-mono text-sm text-white placeholder:text-white/30 focus:border-[#3B82F6] focus:outline-none"
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="1"
                    value={overridePoint}
                    onChange={(e) => setOverridePoint(e.target.value)}
                    placeholder={t.overridePointPlaceholder}
                    className="w-full rounded-xl border border-white/10 bg-black/70 px-3 py-2.5 font-mono text-sm text-white placeholder:text-white/30 focus:border-[#3B82F6] focus:outline-none"
                  />
                </div>

                {overrideFeedback && (
                  <p
                    className={`text-xs font-bold ${
                      overrideFeedback.type === 'success'
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    }`}
                  >
                    {overrideFeedback.text}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSendOverride}
                  disabled={overrideSending || dbClosed}
                  className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#3B82F6] text-xs font-black text-black transition-all hover:bg-[#60A5FA] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span>{t.overrideSend}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <a
            href={PLATFORM.telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => soundFx.playClick()}
            className="flex items-center justify-center gap-2.5 rounded-[20px] border border-white/[0.08] bg-white/[0.02] py-4 text-[12px] font-black uppercase tracking-wider text-white/65 transition-all hover:border-white/20 hover:text-white active:scale-[0.98]"
          >
            <Send className="h-4 w-4" />
            <span>{t.telegramChannel}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
