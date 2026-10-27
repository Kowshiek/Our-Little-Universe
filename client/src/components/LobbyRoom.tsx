import React, { useState } from 'react';
import { useBattle } from '../context/BattleContext';
import { useAuth } from '../context/AuthContext';
import { FighterId, ArenaId, FIGHTERS, ARENAS } from '../types/combat';
import { Copy, Check, Share2, Swords, Crown, Shield, ArrowLeft, Play, Sparkles } from 'lucide-react';

interface LobbyRoomProps {
  onBack: () => void;
}

export const LobbyRoom: React.FC<LobbyRoomProps> = ({ onBack }) => {
  const { user } = useAuth();
  const {
    currentRoomId,
    secretCode,
    myRole,
    myFighterId,
    selectedArenaId,
    myIsReady,
    opponent,
    chooseFighter,
    chooseArena,
    toggleReady,
    startMatch,
    leaveRoom,
  } = useBattle();

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const myFighter = FIGHTERS[myFighterId] || FIGHTERS.heart_knight;
  const oppFighter = opponent ? FIGHTERS[opponent.fighterId] || FIGHTERS.cupid_spark : null;
  const currentArena = ARENAS[selectedArenaId] || ARENAS.heart_garden;

  const handleCopyCode = () => {
    if (!secretCode) return;
    navigator.clipboard.writeText(secretCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!secretCode) return;
    const link = `${window.location.origin}?code=${secretCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const canStartMatch = myRole === 'owner' && opponent && myIsReady && opponent.isReady;

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between p-4 sm:p-6 md:p-8 bg-cosmic-darkest text-slate-100 select-none">
      {/* Top Header */}
      <header className="flex items-center justify-between w-full max-w-5xl mx-auto">
        <button
          onClick={() => {
            leaveRoom();
            onBack();
          }}
          className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-purple-500/30 text-purple-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Lobby</span>
        </button>

        {secretCode && (
          <div className="flex items-center gap-2 bg-slate-900/90 border border-pink-500/40 px-3 py-1.5 rounded-2xl shadow-lg">
            <span className="text-[11px] font-bold text-purple-300 uppercase tracking-widest">Secret Code:</span>
            <span className="font-mono text-starlight font-black text-sm tracking-widest">{secretCode}</span>
            <button
              onClick={handleCopyCode}
              className="p-1 rounded-lg hover:bg-white/10 text-purple-300 hover:text-white transition"
              title="Copy code"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleCopyLink}
              className="p-1 rounded-lg hover:bg-white/10 text-purple-300 hover:text-white transition"
              title="Copy link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </header>

      {/* VS Screen / Fighter Cards */}
      <main className="w-full max-w-5xl mx-auto my-auto py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Player 1 Card (You) */}
          <div className="p-6 rounded-3xl glass-panel border-2 border-pink-500/50 relative overflow-hidden shadow-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-300" />
                <span className="font-black text-white text-base tracking-wide">{user?.displayName} (You)</span>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  myIsReady ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-purple-300'
                }`}
              >
                {myIsReady ? 'READY' : 'NOT READY'}
              </span>
            </div>

            {/* Fighter Visual Preview */}
            <div className="text-center py-4">
              <div className="w-24 h-24 rounded-3xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-tr from-purple-900 to-pink-600 border-2 border-pink-300/40 shadow-xl">
                <Swords className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-black text-white">{myFighter.name}</h3>
              <p className="text-xs text-pink-300 font-bold mt-0.5">{myFighter.title}</p>
              <p className="text-xs text-purple-200 mt-2 max-w-xs mx-auto line-clamp-2">{myFighter.description}</p>
            </div>

            {/* Fighter Selector Tabs */}
            <div className="grid grid-cols-4 gap-2 pt-4 border-t border-purple-500/20">
              {(Object.keys(FIGHTERS) as FighterId[]).map((fId) => {
                const f = FIGHTERS[fId];
                const isSelected = myFighterId === fId;
                return (
                  <button
                    key={fId}
                    onClick={() => chooseFighter(fId)}
                    className={`py-2 px-1 rounded-xl text-center text-xs font-bold transition flex flex-col items-center gap-1 ${
                      isSelected
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg border border-pink-300/50'
                        : 'bg-slate-900/60 text-purple-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate max-w-full text-[11px]">{f.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player 2 Card (Partner / Opponent) */}
          <div className="p-6 rounded-3xl glass-panel border-2 border-cyan-500/40 relative overflow-hidden shadow-2xl flex flex-col justify-between">
            {opponent ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-cyan-300" />
                    <span className="font-black text-white text-base tracking-wide">{opponent.displayName}</span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      opponent.isReady ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-cyan-300'
                    }`}
                  >
                    {opponent.isReady ? 'READY' : 'NOT READY'}
                  </span>
                </div>

                <div className="text-center py-4">
                  <div className="w-24 h-24 rounded-3xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-tr from-indigo-900 to-cyan-600 border-2 border-cyan-300/40 shadow-xl">
                    <Swords className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-white">{oppFighter?.name}</h3>
                  <p className="text-xs text-cyan-300 font-bold mt-0.5">{oppFighter?.title}</p>
                  <p className="text-xs text-purple-200 mt-2 max-w-xs mx-auto line-clamp-2">{oppFighter?.description}</p>
                </div>

                <div className="text-center text-xs text-purple-300 pt-4 border-t border-purple-500/20">
                  Partner connected and choosing loadout.
                </div>
              </>
            ) : (
              <div className="text-center py-16 flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-purple-900/30 border-2 border-dashed border-purple-400/40 flex items-center justify-center mb-4 animate-pulse">
                  <Swords className="w-8 h-8 text-purple-300" />
                </div>
                <h4 className="text-lg font-black text-white mb-1">Waiting for Partner...</h4>
                <p className="text-xs text-purple-300 max-w-xs mb-4">
                  Share your secret code with your partner so they can join this 1v1 battle room!
                </p>
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-2 rounded-xl bg-purple-900/60 border border-purple-400/40 text-purple-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copiedCode ? 'Copied Code!' : 'Copy Code'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Arena Picker */}
        <div className="mt-6 p-4 rounded-2xl glass-panel flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Selected Arena</span>
            <div className="font-black text-white text-base">{currentArena.name}</div>
            <div className="text-xs text-purple-300">{currentArena.description}</div>
          </div>

          {myRole === 'owner' && (
            <div className="flex items-center gap-2">
              {(Object.keys(ARENAS) as ArenaId[]).map((aId) => (
                <button
                  key={aId}
                  onClick={() => chooseArena(aId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    selectedArenaId === aId
                      ? 'bg-pink-600 text-white shadow border border-pink-300/40'
                      : 'bg-slate-800 text-purple-300 hover:bg-slate-700'
                  }`}
                >
                  {ARENAS[aId].name}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Action Footer */}
      <footer className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-purple-900/30">
        <div className="text-xs text-purple-300">
          Best of 3 Rounds • 60s Round Timer • Heart Energy Specials
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={toggleReady}
            className={`flex-1 sm:flex-none px-6 py-3.5 rounded-2xl font-black text-sm transition shadow-lg ${
              myIsReady
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white'
            }`}
          >
            {myIsReady ? 'READY! (Click to Unready)' : 'SET READY'}
          </button>

          {myRole === 'owner' && (
            <button
              onClick={startMatch}
              disabled={!canStartMatch}
              className={`flex-1 sm:flex-none px-8 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition shadow-xl ${
                canStartMatch
                  ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:scale-105 active:scale-95 text-white animate-pulse'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Play className="w-5 h-5 fill-current" />
              <span>START BATTLE 🔥</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
