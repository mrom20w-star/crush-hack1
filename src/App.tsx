import { useEffect, useState } from 'react';
import { AppScreen, Language } from './constants/assets';
import { ParticleBackground } from './components/ParticleBackground';
import { SplashScreen } from './components/SplashScreen';
import { SetupScreen } from './components/SetupScreen';
import { CrashPredictor } from './components/CrashPredictor';
import { soundFx } from './utils/sound';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('splash');
  const [language, setLanguage] = useState<Language>('ar');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const unlockAudio = () => {
      soundFx.resume();
      document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    return () => document.removeEventListener('click', unlockAudio);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const handleSplashComplete = () => {
    setScreen('setup');
  };

  const handleSetupComplete = (verifiedId: string) => {
    setUserId(verifiedId);
    setScreen('crash_game');
  };

  const handleBackToSetup = () => {
    setScreen('setup');
  };

  const isRtl = language === 'ar';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`min-h-screen bg-black text-white ${isRtl ? 'font-arabic' : 'font-sans'}`}
    >
      <ParticleBackground />

      {screen === 'splash' && (
        <SplashScreen onComplete={handleSplashComplete} language={language} />
      )}

      <div
        className={`fixed inset-0 flex flex-col bg-transparent text-white transition-opacity duration-700 ${
          screen === 'splash' ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <main className="custom-scrollbar relative z-10 flex-1 overflow-y-auto">
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(var(--primary-color) 1px, transparent 1px), linear-gradient(90deg, var(--primary-color) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative z-10 mx-auto min-h-full w-full max-w-lg">
            {screen === 'setup' && (
              <SetupScreen
                language={language}
                onLanguageChange={setLanguage}
                onComplete={handleSetupComplete}
                initialUserId={userId}
              />
            )}

            {screen === 'crash_game' && (
              <CrashPredictor
                onBack={handleBackToSetup}
                language={language}
                userId={userId}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
