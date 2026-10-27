import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, X, CheckCircle, Smartphone } from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // Check if running in standalone PWA mode already
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(!!checkStandalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Capture Android / Chrome beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
        setInstallSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cosmic-darkest/90 backdrop-blur-md p-4 select-none">
      <div className="max-w-md w-full glass-panel rounded-3xl p-6 relative border border-pink-500/30 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-purple-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Install Our Universe</h3>
            <p className="text-xs text-purple-300">Play full-screen on your home screen</p>
          </div>
        </div>

        {isStandalone ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h4 className="font-bold text-lg text-white mb-1">Already Installed!</h4>
            <p className="text-sm text-purple-200">
              You are currently enjoying Our Little Universe in full-screen app mode.
            </p>
          </div>
        ) : installSuccess ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h4 className="font-bold text-lg text-white mb-1">Installation Initiated!</h4>
            <p className="text-sm text-purple-200">
              Check your home screen or app drawer for the Our Universe app icon.
            </p>
          </div>
        ) : isIOS ? (
          <div className="space-y-4 text-sm text-purple-200">
            <p className="text-xs bg-purple-900/40 p-3 rounded-xl border border-purple-400/20 text-purple-300">
              To install on your iPhone or iPad, use Safari:
            </p>
            <ol className="list-decimal list-inside space-y-2.5 font-medium">
              <li className="flex items-center gap-2">
                <span>1. Tap the</span>
                <span className="inline-flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-purple-400/30 text-white font-bold text-xs">
                  <Share2 className="w-3.5 h-3.5 text-cyan-400" /> Share
                </span>
                <span>button in Safari's menu.</span>
              </li>
              <li className="flex items-center gap-2">
                <span>2. Scroll down and select</span>
                <span className="inline-flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-purple-400/30 text-white font-bold text-xs">
                  <PlusSquare className="w-3.5 h-3.5 text-pink-400" /> Add to Home Screen
                </span>
              </li>
              <li>3. Tap <strong>Add</strong> in the top-right corner.</li>
            </ol>
            <p className="text-xs text-purple-400 text-center pt-2">
              Our Universe will launch as a standalone app with full-screen controls!
            </p>
          </div>
        ) : deferredPrompt ? (
          <div className="space-y-4">
            <p className="text-sm text-purple-200">
              Install <strong>Our Little Universe</strong> on your device for fast one-tap launch, full-screen immersion, and smooth mobile touch controls.
            </p>
            <button
              onClick={handleInstallClick}
              className="w-full cosmic-btn-primary flex items-center justify-center gap-2 text-base font-bold shadow-lg py-3.5"
            >
              <Download className="w-5 h-5" />
              <span>Install to Home Screen</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-purple-200">
            <p>
              To install on Android / Chrome:
            </p>
            <ol className="list-decimal list-inside space-y-2 font-medium">
              <li>Tap the <strong>three dots menu (⋮)</strong> in your browser's top corner.</li>
              <li>Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
            </ol>
            <p className="text-xs text-purple-400 pt-2 text-center">
              The game is optimized for standalone mobile gameplay.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
