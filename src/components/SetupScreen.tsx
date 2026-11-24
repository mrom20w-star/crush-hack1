import { ChangeEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Check,
  CircleCheck,
  Copy,
  CreditCard,
  ExternalLink,
  Fingerprint,
  Globe,
  ImagePlus,
  KeyRound,
  Lock,
  ShieldCheck,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import {
  ASSETS,
  getPromoCode,
  Language,
  PLATFORM,
  TRANSLATIONS,
} from '../constants/assets';
import { soundFx } from '../utils/sound';

interface SetupScreenProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onComplete: (userId: string) => void;
  initialUserId?: string;
}

interface StepCardProps {
  number: string;
  label: string;
  title: string;
  icon: typeof Lock;
  image?: string;
  children: ReactNode;
}

const CARD_SURFACE_CLASS =
  'rounded-2xl border border-white/[0.07] bg-white/[0.02]';
const PRIMARY_CTA_CLASS =
  'w-full h-14 rounded-2xl bg-gradient-to-l from-[#3B82F6] to-white text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 shadow-[0_16px_40px_-16px_rgba(59,130,246,0.85)] transition-all active:scale-[0.98] group cursor-pointer';

function StepCard({ number, label, title, icon: Icon, image, children }: StepCardProps) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <section className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#030712]/90 p-5 backdrop-blur-xl">
      <div className="pointer-events-none absolute -top-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-[rgba(59,130,246,0.12)] blur-[70px]" />

      <div className="relative mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[rgba(59,130,246,0.3)] bg-black/80">
            {image && !imgErr ? (
              <img
                src={image}
                alt={title}
                referrerPolicy="no-referrer"
                onError={() => setImgErr(true)}
                className="h-9 w-9 rounded-xl object-contain"
              />
            ) : (
              <Icon className="h-5 w-5 text-[#3B82F6]" />
            )}
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#3B82F6]">
              {label}
            </span>
            <h3 className="truncate text-base font-black text-white">{title}</h3>
          </div>
        </div>

        <span className="shrink-0 rounded-xl border border-[rgba(59,130,246,0.28)] bg-black/70 px-2.5 py-1 font-mono text-xs font-black text-[#3B82F6]">
          {number}
        </span>
      </div>

      <div className="relative">{children}</div>
    </section>
  );
}

export function SetupScreen({
  language,
  onLanguageChange,
  onComplete,
  initialUserId = '',
}: SetupScreenProps) {
  const [copied, setCopied] = useState(false);
  const [userId, setUserId] = useState(initialUserId);
  const [invitePreview, setInvitePreview] = useState<string | null>(null);
  const [inviteName, setInviteName] = useState('');
  const [promoPreview, setPromoPreview] = useState<string | null>(null);
  const [promoName, setPromoName] = useState('');
  const [errors, setErrors] = useState<{
    userId?: boolean;
    inviteScreen?: boolean;
    promoScreen?: boolean;
  }>({});
  const [showModal, setShowModal] = useState(false);
  const [modalPhase, setModalPhase] = useState<'form' | 'loading' | 'ready'>('form');
  const [verifyStage, setVerifyStage] = useState<'step1' | 'step2' | 'step3'>('step1');
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [muted, setMuted] = useState(soundFx.isMuted());
  const [logoErr, setLogoErr] = useState(false);
  const [crashErr, setCrashErr] = useState(false);

  const timersRef = useRef<number[]>([]);
  const inviteUrlRef = useRef<string | null>(null);
  const promoUrlRef = useRef<string | null>(null);

  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';
  const promoCode = getPromoCode();

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => {
    return () => {
      clearTimers();
      if (inviteUrlRef.current) URL.revokeObjectURL(inviteUrlRef.current);
      if (promoUrlRef.current) URL.revokeObjectURL(promoUrlRef.current);
    };
  }, []);

  const copyTextSafe = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const handleCopyPromo = async () => {
    soundFx.playCopy();
    await copyTextSafe(promoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyGeneratedCode = async () => {
    if (!generatedCode) return;
    soundFx.playCopy();
    await copyTextSafe(generatedCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleScreenUpload = (
    type: 'invite' | 'promo',
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    soundFx.playSoftClick();
    const previewUrl = URL.createObjectURL(file);

    if (type === 'invite') {
      if (inviteUrlRef.current) URL.revokeObjectURL(inviteUrlRef.current);
      inviteUrlRef.current = previewUrl;
      setInvitePreview(previewUrl);
      setInviteName(file.name);
      setErrors((prev) => ({ ...prev, inviteScreen: false }));
    } else {
      if (promoUrlRef.current) URL.revokeObjectURL(promoUrlRef.current);
      promoUrlRef.current = previewUrl;
      setPromoPreview(previewUrl);
      setPromoName(file.name);
      setErrors((prev) => ({ ...prev, promoScreen: false }));
    }
    e.target.value = '';
  };

  const handleRemoveScreen = (type: 'invite' | 'promo') => {
    soundFx.playClick();
    if (type === 'invite') {
      if (inviteUrlRef.current) URL.revokeObjectURL(inviteUrlRef.current);
      inviteUrlRef.current = null;
      setInvitePreview(null);
      setInviteName('');
    } else {
      if (promoUrlRef.current) URL.revokeObjectURL(promoUrlRef.current);
      promoUrlRef.current = null;
      setPromoPreview(null);
      setPromoName('');
    }
  };

  const handleOpenStepsModal = () => {
    soundFx.playClick();
    clearTimers();
    setErrors({});
    setModalPhase(generatedCode ? 'ready' : 'form');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    soundFx.playClick();
    clearTimers();
    setShowModal(false);
    if (modalPhase === 'loading') {
      setModalPhase('form');
    }
  };

  const handleVerifySubmit = () => {
    soundFx.playClick();
    const cleaned = userId.trim();
    const validId = cleaned.length >= 10 && cleaned.length <= 15;
    const nextErrors = {
      userId: !validId,
      inviteScreen: !invitePreview,
      promoScreen: !promoPreview,
    };
    setErrors(nextErrors);

    if (nextErrors.userId || nextErrors.inviteScreen || nextErrors.promoScreen) {
      soundFx.playError();
      return;
    }

    clearTimers();
    soundFx.playScan();
    setModalPhase('loading');
    setVerifyStage('step1');

    const t1 = window.setTimeout(() => {
      soundFx.playSoftClick();
      setVerifyStage('step2');
    }, 1000);

    const t2 = window.setTimeout(() => {
      soundFx.playSoftClick();
      setVerifyStage('step3');
    }, 2000);

    const t3 = window.setTimeout(async () => {
      const code = `CH-${promoCode}-${cleaned.slice(-4)}`;
      setGeneratedCode(code);
      setModalPhase('ready');
      soundFx.playSuccess();
      await copyTextSafe(code);
      setCodeCopied(true);
    }, 3000);

    timersRef.current = [t1, t2, t3];
  };

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    soundFx.setMuted(next);
    if (!next) soundFx.playClick();
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="relative flex min-h-full flex-col bg-transparent text-white selection:bg-[#3B82F6]/30"
    >
      {/* Subtle Ambient Backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 opacity-[0.09]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(59,130,246,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.45) 1px, transparent 1px)',
            backgroundSize: '34px 34px',
          }}
        />
        <div className="absolute -top-20 right-0 h-72 w-72 rounded-full bg-[rgba(59,130,246,0.12)] blur-[110px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col px-3 pb-16 pt-4 sm:px-6">
        {/* Top Status & Controls Row */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full border border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.08)] px-3.5 py-1.5 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-[#3B82F6] shadow-[0_0_10px_#3B82F6] animate-pulse" />
            <span className="whitespace-nowrap text-xs font-black uppercase tracking-wider text-[#3B82F6]">
              {t.activationBadge}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleSound}
              aria-label={muted ? 'Unmute sound' : 'Mute sound'}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition-colors hover:border-[#3B82F6]/50 hover:text-white cursor-pointer"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-[#3B82F6]" />}
            </button>

            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03] p-0.5">
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  onLanguageChange('ar');
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-black transition-colors cursor-pointer ${
                  language === 'ar'
                    ? 'bg-[#3B82F6] text-black'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                AR
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  onLanguageChange('en');
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-black transition-colors cursor-pointer ${
                  language === 'en'
                    ? 'bg-[#3B82F6] text-black'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* Hero Terminal Card */}
        <div className="relative mb-5 overflow-hidden rounded-[30px] border border-white/[0.08] bg-gradient-to-b from-[rgba(59,130,246,0.10)] via-black/80 to-black p-5 backdrop-blur-xl">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-[rgba(59,130,246,0.18)] blur-[90px]" />

          <div className="relative flex flex-col items-center text-center">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-[rgba(59,130,246,0.35)] bg-black/80 p-1.5 shadow-[0_0_24px_rgba(59,130,246,0.4)]">
              {!logoErr ? (
                <img
                  src={ASSETS.brandLogo}
                  alt={PLATFORM.brandTitle}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoErr(true)}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="font-mono text-2xl font-black text-[#3B82F6]">CH</span>
              )}
            </div>

            <h1 className="mt-3 text-2xl font-black leading-tight tracking-wide text-white">
              Crush <span className="text-[#3B82F6]">Hack</span>
            </h1>

            <p className="mt-2 max-w-[320px] text-xs leading-relaxed text-white/60 sm:text-sm">
              {t.heroDesc}
            </p>

            {/* Step Pill Indicators 01 -> 03 */}
            <div className="mt-4 flex w-full items-center justify-center gap-1.5" dir="ltr">
              {['01', '02', '03'].map((num) => (
                <div key={num} className="flex items-center gap-1.5">
                  <span className="rounded-lg border border-[rgba(59,130,246,0.28)] bg-black/70 px-2 py-1 font-mono text-[10px] font-black text-[#3B82F6]">
                    {num}
                  </span>
                  {num !== '03' && <span className="h-px w-2 bg-[rgba(59,130,246,0.35)]" />}
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 animate-pulse text-[#3B82F6]" />
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#3B82F6]">
                {t.instantActivation}
              </span>
            </div>
          </div>
        </div>

        {/* Active Game Showcase (Crash only) */}
        <section className="mb-5" aria-label={t.crashTitle}>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#3B82F6]/60 bg-[#3B82F6]/10 p-4 shadow-[0_0_24px_-8px_rgba(59,130,246,0.5)]">
            <div className="flex items-center gap-3">
              {!crashErr ? (
                <img
                  src={ASSETS.crashPlane}
                  alt={t.crashTitle}
                  referrerPolicy="no-referrer"
                  onError={() => setCrashErr(true)}
                  className="h-14 w-14 rounded-xl object-contain"
                />
              ) : (
                <span className="text-3xl">✈</span>
              )}
              <div>
                <h2 className="text-base font-black text-white">{t.crashPredictorTitle}</h2>
                <p className="text-xs text-white/60">{t.crashPredictorDesc}</p>
              </div>
            </div>

            <div className="shrink-0 text-end">
              <span className="block text-[10px] font-black uppercase tracking-wider text-white/50">
                {t.promoLabel}
              </span>
              <strong dir="ltr" className="font-mono text-lg font-black text-[#3B82F6]">
                {promoCode}
              </strong>
            </div>
          </div>
        </section>

        {/* 3 Activation Steps */}
        <div className="flex flex-col gap-4">
          {/* Step 01: Promo Code */}
          <StepCard number="01" label={t.step1Label} title={t.step1Title} icon={Lock}>
            <div className="flex flex-col gap-4">
              <p className={`p-4 text-xs leading-relaxed text-white/75 sm:text-sm ${CARD_SURFACE_CLASS}`}>
                {t.step1Desc}
              </p>

              <button
                type="button"
                onClick={handleCopyPromo}
                className="group relative w-full cursor-pointer rounded-2xl border-2 border-dashed border-[rgba(59,130,246,0.4)] bg-black/60 p-4 text-start transition-all hover:border-[#3B82F6]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
                      {t.approvedPromo}
                    </span>
                    <span
                      dir="ltr"
                      className="inline-block font-mono text-2xl font-black tracking-[0.2em] text-[#3B82F6] drop-shadow-[0_0_14px_rgba(59,130,246,0.6)] sm:text-3xl"
                    >
                      {promoCode}
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                      copied
                        ? 'bg-[#3B82F6] text-black shadow-[0_0_20px_rgba(59,130,246,0.5)]'
                        : 'bg-white/5 text-white/80 group-hover:bg-[rgba(59,130,246,0.12)] group-hover:text-[#3B82F6]'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>{t.copied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>{t.copyCode}</span>
                      </>
                    )}
                  </div>
                </div>

                <Sparkles className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#3B82F6]/60" />
              </button>

              <a
                href={PLATFORM.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => soundFx.playClick()}
                className={PRIMARY_CTA_CLASS}
              >
                <span>{t.openPlatformBtn}</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </StepCard>

          {/* Step 02: First Deposit */}
          <StepCard number="02" label={t.step2Label} title={t.step2Title} icon={CreditCard}>
            <div className="flex flex-col gap-4">
              <p className={`p-4 text-xs leading-relaxed text-white/75 sm:text-sm ${CARD_SURFACE_CLASS}`}>
                {t.step2Desc}
              </p>

              <div className="grid grid-cols-2 gap-3" dir="ltr">
                {[
                  { label: 'USD ($)', value: '$5.00' },
                  { label: 'EGP (L.E)', value: '300 L.E' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex flex-col items-center justify-center p-4 text-center ${CARD_SURFACE_CLASS}`}
                  >
                    <span className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
                      {item.label}
                    </span>
                    <span className="font-mono text-2xl font-black text-[#3B82F6] drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-white/55">
                <Globe className="h-3.5 w-3.5 shrink-0 text-[#3B82F6]" />
                <span>{t.depositAutoNote}</span>
              </div>
            </div>
          </StepCard>

          {/* Step 03: Get Code via Steps Button */}
          <StepCard
            number="03"
            label={t.step3Label}
            title={t.step3Title}
            icon={KeyRound}
            image={ASSETS.verifyBadge}
          >
            <div className="flex flex-col gap-4">
              <p className={`p-4 text-xs leading-relaxed text-white/75 sm:text-sm ${CARD_SURFACE_CLASS}`}>
                {t.step3Desc}
              </p>

              <button type="button" onClick={handleOpenStepsModal} className={PRIMARY_CTA_CLASS}>
                <KeyRound className="h-4 w-4" />
                <span>{t.getCodeViaStepsBtn}</span>
                <ArrowRight className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </StepCard>
        </div>

        {/* Footer Security Banner */}
        <div className={`mt-5 flex items-center gap-2 p-4 text-xs text-white/55 ${CARD_SURFACE_CLASS}`}>
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#3B82F6]" />
          <span>{t.serverVerifyNote}</span>
        </div>

        <div className="mt-4 flex flex-col items-center gap-1.5 opacity-50">
          <div className="h-px w-10 bg-[rgba(59,130,246,0.4)]" />
          <span className="text-center text-[9px] font-black uppercase tracking-[0.28em] text-white/60">
            {t.footerSecurity}
          </span>
        </div>
      </div>

      {/* Get Code via Steps Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/90 p-3 backdrop-blur-2xl sm:items-center sm:p-4"
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className="relative my-auto w-full max-w-[440px] overflow-hidden rounded-[26px] border border-[rgba(59,130,246,0.28)] bg-[#030712]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/[0.07] bg-[rgba(59,130,246,0.06)] px-5 py-3.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#3B82F6] shadow-[0_0_10px_#3B82F6]" />
                  <span className="truncate text-xs font-black tracking-wide text-[#3B82F6]">
                    {t.stepsModalTitle}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/10 text-white/60 transition-all hover:text-white active:scale-90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="max-h-[82vh] overflow-y-auto px-5 py-5">
                {modalPhase === 'form' && (
                  <div className="flex flex-col gap-4">
                    <p className="text-xs leading-relaxed text-white/65">
                      {t.stepsModalSubtitle}
                    </p>

                    {/* ID Input inside Steps Modal */}
                    <div>
                      <label
                        htmlFor="steps-user-id"
                        className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.16em] text-white/70"
                      >
                        {t.userIdLabel}
                      </label>

                      <div className="relative">
                        <div
                          className={`absolute inset-y-0 flex items-center justify-center border-white/10 px-3 ${
                            isRtl ? 'right-0 border-l' : 'left-0 border-r'
                          }`}
                        >
                          <Fingerprint
                            className={`h-5 w-5 ${userId ? 'text-[#3B82F6]' : 'text-white/30'}`}
                          />
                        </div>
                        <input
                          id="steps-user-id"
                          type="tel"
                          inputMode="numeric"
                          value={userId}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/[^0-9]/g, '');
                            if (digits.length <= 15) {
                              setUserId(digits);
                              if (digits.length >= 10) {
                                setErrors((prev) => ({ ...prev, userId: false }));
                              }
                            }
                          }}
                          placeholder={t.userIdPlaceholder}
                          maxLength={15}
                          className={`w-full rounded-2xl border bg-black/60 py-3 font-mono text-base text-white transition-all placeholder:text-white/25 focus:outline-none ${
                            isRtl ? 'pl-4 pr-14 text-right' : 'pl-14 pr-4 text-left'
                          } ${
                            errors.userId
                              ? 'border-red-500/80 focus:border-red-500'
                              : 'border-white/10 focus:border-[#3B82F6]'
                          }`}
                        />
                      </div>

                      {errors.userId && (
                        <p className="mt-1.5 text-[11px] font-bold text-red-400">
                          {t.userIdError}
                        </p>
                      )}
                    </div>

                    {/* Two Screenshot Uploaders: Deposit & Promo */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {/* Deposit Screenshot */}
                      <div className="flex flex-col">
                        <span className="mb-1.5 block text-[11px] font-black text-white/75">
                          {t.inviteScreenLabel}
                        </span>
                        {invitePreview ? (
                          <div className="relative overflow-hidden rounded-2xl border border-[#3B82F6]/45 bg-black/70 p-2">
                            <img
                              src={invitePreview}
                              alt={t.inviteScreenLabel}
                              className="h-28 w-full rounded-xl object-cover"
                            />
                            <div className="mt-2 flex items-center justify-between gap-2 px-1">
                              <span className="truncate text-[10px] font-semibold text-white/60">
                                {inviteName}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveScreen('invite')}
                                aria-label="Remove deposit screenshot"
                                className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-red-500/15 text-red-400 transition-colors hover:bg-red-500/25"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label
                            className={`flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-black/50 p-3 text-center transition-all hover:border-[#3B82F6] hover:bg-[#3B82F6]/5 ${
                              errors.inviteScreen
                                ? 'border-red-500/75'
                                : 'border-white/15'
                            }`}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleScreenUpload('invite', e)}
                            />
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3B82F6]/30 bg-[#3B82F6]/10">
                              <ImagePlus className="h-5 w-5 text-[#3B82F6]" />
                            </div>
                            <span className="text-[11px] font-bold text-white/70">
                              {t.uploadScreenHint}
                            </span>
                          </label>
                        )}
                        {errors.inviteScreen && (
                          <p className="mt-1.5 text-[11px] font-bold text-red-400">
                            {t.missingInviteScreen}
                          </p>
                        )}
                      </div>

                      {/* Promo Screenshot */}
                      <div className="flex flex-col">
                        <span className="mb-1.5 block text-[11px] font-black text-white/75">
                          {t.promoScreenLabel}
                        </span>
                        {promoPreview ? (
                          <div className="relative overflow-hidden rounded-2xl border border-[#3B82F6]/45 bg-black/70 p-2">
                            <img
                              src={promoPreview}
                              alt={t.promoScreenLabel}
                              className="h-28 w-full rounded-xl object-cover"
                            />
                            <div className="mt-2 flex items-center justify-between gap-2 px-1">
                              <span className="truncate text-[10px] font-semibold text-white/60">
                                {promoName}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveScreen('promo')}
                                aria-label="Remove promo screenshot"
                                className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-red-500/15 text-red-400 transition-colors hover:bg-red-500/25"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label
                            className={`flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-black/50 p-3 text-center transition-all hover:border-[#3B82F6] hover:bg-[#3B82F6]/5 ${
                              errors.promoScreen
                                ? 'border-red-500/75'
                                : 'border-white/15'
                            }`}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleScreenUpload('promo', e)}
                            />
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3B82F6]/30 bg-[#3B82F6]/10">
                              <ImagePlus className="h-5 w-5 text-[#3B82F6]" />
                            </div>
                            <span className="text-[11px] font-bold text-white/70">
                              {t.uploadScreenHint}
                            </span>
                          </label>
                        )}
                        {errors.promoScreen && (
                          <p className="mt-1.5 text-[11px] font-bold text-red-400">
                            {t.missingPromoScreen}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleVerifySubmit}
                      className={PRIMARY_CTA_CLASS}
                    >
                      <Zap className="h-4 w-4 fill-black" />
                      <span>{t.generateCodeBtn}</span>
                    </button>
                  </div>
                )}

                {modalPhase === 'loading' && (
                  <div className="flex flex-col items-center py-3 text-center">
                    <div className="relative flex h-20 w-20 items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 rounded-full border-2 border-[#3B82F6]/20 border-t-[#3B82F6]"
                      />
                      <KeyRound className="h-8 w-8 animate-pulse text-[#3B82F6]" />
                    </div>

                    <h3 className="mt-4 text-sm font-black text-white">{t.loadingCodeTitle}</h3>
                    <p className="mt-1 text-xs text-white/55">{t.loadingCodeSubtitle}</p>

                    {/* 3-Second Progress Bar */}
                    <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 3, ease: 'linear' }}
                        className="h-full rounded-full bg-gradient-to-l from-[#3B82F6] to-white shadow-[0_0_12px_#3B82F6]"
                      />
                    </div>

                    <div className="mt-5 flex w-full flex-col gap-2.5 text-start">
                      {[
                        { key: 'step1', text: t.verifyStep1 },
                        { key: 'step2', text: t.verifyStep2 },
                        { key: 'step3', text: t.verifyStep3 },
                      ].map((step, idx) => {
                        const order = ['step1', 'step2', 'step3'];
                        const currentIdx = order.indexOf(verifyStage);
                        const done = currentIdx > idx;
                        const active = currentIdx === idx;

                        return (
                          <div
                            key={step.key}
                            className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-300 ${
                              done
                                ? 'border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.07)]'
                                : active
                                ? 'border-white/15 bg-white/[0.04]'
                                : 'border-white/[0.06] bg-transparent'
                            }`}
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black">
                              {done ? (
                                <Check className="h-3.5 w-3.5 text-[#3B82F6]" />
                              ) : active ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                  className="h-3.5 w-3.5 rounded-full border border-[rgba(59,130,246,0.2)] border-t-[#3B82F6]"
                                />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                              )}
                            </span>
                            <span
                              className={`text-xs font-bold ${
                                done ? 'text-white' : active ? 'text-white/75' : 'text-white/35'
                              }`}
                            >
                              {step.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {modalPhase === 'ready' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.08)]">
                        <Fingerprint className="h-5 w-5 text-[#3B82F6]" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                          {t.accountId}
                        </span>
                        <span className="block truncate font-mono text-base font-black tracking-wider text-white">
                          {userId}
                        </span>
                      </div>
                      <div
                        dir="ltr"
                        className={`rounded-lg border border-[rgba(59,130,246,0.25)] bg-black px-2.5 py-1 font-mono text-[11px] font-black text-[#3B82F6] ${
                          isRtl ? 'mr-auto' : 'ml-auto'
                        }`}
                      >
                        {promoCode}
                      </div>
                    </div>

                    {/* Automatically Generated Activation Code Box */}
                    <button
                      type="button"
                      onClick={handleCopyGeneratedCode}
                      className="group w-full cursor-pointer rounded-2xl border-2 border-dashed border-[#3B82F6]/60 bg-[#3B82F6]/10 p-4 text-start transition-all hover:border-[#3B82F6]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-white/60">
                            {t.generatedCodeLabel}
                          </span>
                          <span
                            dir="ltr"
                            className="mt-1 inline-block font-mono text-xl font-black tracking-[0.16em] text-[#3B82F6] drop-shadow-[0_0_14px_rgba(59,130,246,0.65)] sm:text-2xl"
                          >
                            {generatedCode}
                          </span>
                        </div>

                        <div
                          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${
                            codeCopied
                              ? 'bg-[#3B82F6] text-black'
                              : 'bg-black/60 text-white/85 group-hover:text-[#3B82F6]'
                          }`}
                        >
                          {codeCopied ? (
                            <>
                              <Check className="h-4 w-4" />
                              <span>{t.copied}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              <span>{t.copyCode}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center justify-center gap-2 text-xs font-black text-[#3B82F6]">
                      <CircleCheck className="h-4 w-4 shrink-0" />
                      <span>{codeCopied ? t.autoCopiedBadge : t.verifySuccess}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        setShowModal(false);
                        onComplete(userId.trim());
                      }}
                      className="flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-[18px] bg-gradient-to-l from-[#3B82F6] to-white text-sm font-black text-black shadow-[0_16px_40px_-16px_rgba(59,130,246,0.85)] transition-all active:scale-[0.98]"
                    >
                      <Zap className="h-5 w-5 fill-black" />
                      <span>{t.enterPredictions}</span>
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
