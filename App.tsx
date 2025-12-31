import React, { useState, useEffect, useRef } from 'react';
import { ScreenState, LevelData, Boosters, BoosterType, Character } from './types';
import { INITIAL_LEVELS, COLORS, CHARACTERS } from './constants';
import { Button } from './components/Button';
import { GameScreen } from './screens/GameScreen';
import { SoundManager, MusicManager } from './utils/audio';
import { supabase } from './utils/supabaseClient';
import { TRANSLATIONS, LangType } from './utils/i18n';
import { AdManager, AD_CONFIG } from './utils/ads';
import { AdBanner } from './components/AdBanner';
import { Play, Star, Lock, RefreshCw, Menu, Volume2, VolumeX, Trophy, Gift, Award, X, Coins, Music, ShoppingCart, Bomb, Hammer, Shuffle, Video, User, Check, Lock as LockIcon, Zap, Crown, Download, Globe, Bell, Loader, Gauge, Home, RotateCcw } from 'lucide-react';

interface HighScoreEntry {
  username: string;
  score: number;
  created_at?: string;
}

// --- Floating Background Component ---
const FloatingBackground = () => {
  const [items, setItems] = useState<Array<{id: number, left: number, delay: number, duration: number, icon: string, size: number}>>([]);
  
  useEffect(() => {
    // Increase count for larger screens to keep it lively
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 12 : 30;
    const fruits = ['🍎', '🍌', '🍇', '🍉', '🍍', '🍓', '🍊', '🍒', '🥝'];
    
    const newItems = Array.from({ length: count }, (_, i) => {
      const laneWidth = 100 / count;
      const left = (i * laneWidth) + (Math.random() * (laneWidth * 0.6) + (laneWidth * 0.2)); 
      
      return {
        id: i,
        left,
        delay: -(Math.random() * 20), 
        duration: 15 + Math.random() * 10,
        icon: fruits[Math.floor(Math.random() * fruits.length)],
        size: isMobile ? (24 + Math.random() * 12) : (32 + Math.random() * 24)
      };
    });
    
    setItems(newItems.sort(() => Math.random() - 0.5));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute bottom-[-60px]"
          style={{
            left: `${item.left}%`,
            fontSize: `${item.size}px`,
            animation: `floatUp ${item.duration}s linear infinite`,
            animationDelay: `${item.delay}s`,
            opacity: 0 
          }}
        >
          {item.icon}
        </div>
      ))}
    </div>
  );
};

// --- Modal Components ---

interface MultiplierModalProps {
  baseAmount: number;
  onClaim: (multiplier: number) => void;
  onWatchAd: () => Promise<boolean>;
  t: any;
}

const MultiplierModal: React.FC<MultiplierModalProps> = ({ baseAmount, onClaim, onWatchAd, t }) => {
  const [multiplier, setMultiplier] = useState(2);
  const [isAnimating, setIsAnimating] = useState(true);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Speedometer Config
  const NEEDLE_MAX_ANGLE = 75; // Degrees left/right

  const getAngle = (time: number) => {
    const period = 1200; // Slower, smoother swing
    // Use Sine wave for smooth easing at the edges
    const t = Math.sin((time / period) * Math.PI); 
    return t * NEEDLE_MAX_ANGLE;
  };

  const calculateCurrentMultiplier = (angle: number) => {
    const absAngle = Math.abs(angle);
    // Tighter tolerance for high rewards
    if (absAngle < 15) return 4;
    if (absAngle < 50) return 3;
    return 2;
  };

  useEffect(() => {
    const animate = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const elapsed = time - startTimeRef.current;
      
      const angle = getAngle(elapsed);
      const currentMult = calculateCurrentMultiplier(angle);
      
      setMultiplier(currentMult);
      
      const needle = document.getElementById('speedo-needle');
      const glow = document.getElementById('speedo-glow');
      
      if (needle) {
        needle.style.transform = `rotate(${angle}deg)`;
      }
      
      // Dynamic color changing based on zone
      if (glow) {
         if (Math.abs(angle) < 15) {
             glow.style.background = 'rgba(74, 222, 128, 0.6)'; // Green
             glow.style.boxShadow = '0 0 30px rgba(74, 222, 128, 0.8)';
         } else if (Math.abs(angle) < 50) {
             glow.style.background = 'rgba(250, 204, 21, 0.4)'; // Yellow
             glow.style.boxShadow = '0 0 20px rgba(250, 204, 21, 0.6)';
         } else {
             glow.style.background = 'rgba(248, 113, 113, 0.2)'; // Red
             glow.style.boxShadow = '0 0 10px rgba(248, 113, 113, 0.4)';
         }
      }

      if (isAnimating) {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isAnimating]);

  const handleWatchAd = async () => {
    setIsAnimating(false); 
    setIsAdLoading(true);
    SoundManager.play('click');

    const success = await onWatchAd();
    
    setIsAdLoading(false);
    if (success) {
      SoundManager.play('win');
      onClaim(multiplier);
    } else {
      setIsAnimating(true);
    }
  };

  return (
    <div className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-[40px] p-8 w-full max-w-sm flex flex-col items-center gap-8 shadow-2xl border-[2px] border-white/20 animate-pop relative overflow-hidden perspective-1000">
         
         {/* Minimalist 3D Header */}
         <div className="text-center z-10">
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 tracking-wider font-display mb-1">
               {t.bonusTitle}
            </h2>
            <p className="text-indigo-200 text-xs font-bold tracking-widest uppercase opacity-70">{t.bonusDesc}</p>
         </div>

         {/* 3D Speedometer Container */}
         <div className="relative w-64 h-32 flex justify-center items-end preserve-3d" style={{ transform: 'rotateX(20deg)' }}>
            
            {/* The Arc/Track */}
            <div className="absolute bottom-0 w-64 h-32 rounded-t-full border-[12px] border-white/5 overflow-hidden backdrop-blur-sm box-border">
                {/* Zone Markers (Background segments) */}
                <div className="absolute inset-0 w-full h-full opacity-30 bg-[conic-gradient(from_0deg_at_50%_100%,_rgba(248,113,113,1)_0deg_35deg,_rgba(250,204,21,1)_35deg_70deg,_rgba(74,222,128,1)_70deg_110deg,_rgba(250,204,21,1)_110deg_145deg,_rgba(248,113,113,1)_145deg_180deg,_transparent_180deg)]" 
                     style={{ maskImage: 'radial-gradient(circle at 50% 100%, transparent 60%, black 61%)', WebkitMaskImage: 'radial-gradient(circle at 50% 100%, transparent 60%, black 61%)' }}>
                </div>
            </div>

            {/* Labels floating in 3D space */}
            <div className="absolute bottom-[30px] left-[10px] text-white/40 font-black text-lg rotate-[-50deg]">2x</div>
            <div className="absolute bottom-[70px] left-[40px] text-white/60 font-black text-lg rotate-[-30deg]">3x</div>
            <div className="absolute bottom-[90px] left-1/2 -translate-x-1/2 text-white font-black text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">4x</div>
            <div className="absolute bottom-[70px] right-[40px] text-white/60 font-black text-lg rotate-[30deg]">3x</div>
            <div className="absolute bottom-[30px] right-[10px] text-white/40 font-black text-lg rotate-[50deg]">2x</div>

            {/* The 3D Needle/Indicator */}
            <div 
              id="speedo-needle"
              className="absolute bottom-[-10px] left-1/2 w-0 h-0 origin-bottom"
              style={{ 
                  transform: 'rotate(0deg)',
                  transition: 'none' // Handled by JS
              }}
            >
               {/* Actual visible part of the needle (A glowing triangular prism shape) */}
               <div className="absolute bottom-0 left-[-6px] w-[12px] h-[110px] bg-gradient-to-t from-white to-transparent opacity-80 rounded-full blur-[1px]"></div>
               <div className="absolute bottom-0 left-[-2px] w-[4px] h-[110px] bg-white rounded-full shadow-[0_0_15px_white]"></div>
            </div>

            {/* Center Pivot Hub (Glowing Orb) */}
            <div 
              id="speedo-glow"
              className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-12 h-12 rounded-full border-4 border-[#1e1b4b] transition-colors duration-100 z-20"
              style={{ background: 'rgba(74, 222, 128, 0.5)', boxShadow: '0 0 30px rgba(74, 222, 128, 0.5)' }}
            >
               <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
            </div>

         </div>

         {/* Result Preview */}
         <div className="flex flex-col items-center justify-center -mt-4 z-10">
            <div className="flex items-end gap-2">
               <span className="text-5xl font-black text-white tracking-tighter drop-shadow-lg">{baseAmount * multiplier}</span>
               <span className="text-xl font-bold text-yellow-400 mb-2">Coins</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-white/30 font-bold bg-white/5 px-2 py-0.5 rounded-full mt-1">
               Potential Reward
            </div>
         </div>

         <div className="w-full space-y-3 z-10 mt-2">
            <Button 
               fullWidth 
               size="lg" 
               variant="accent" 
               onClick={handleWatchAd}
               disabled={isAdLoading}
               className={isAdLoading ? 'opacity-50' : 'shadow-[0_0_20px_rgba(250,204,21,0.4)]'}
            >
               {isAdLoading ? <Loader className="animate-spin" /> : <div className="flex items-center gap-2 font-black tracking-wide"><Video size={20} /> {t.watchAdMultiplier}</div>}
            </Button>
            
            <button 
               onClick={() => onClaim(1)} 
               className="w-full py-3 text-white/30 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors"
            >
               {t.noThanks}
            </button>
         </div>
      </div>
    </div>
  );
};

interface RewardModalProps {
  onClaim: () => void; // Modified to just trigger the flow
  onClose: () => void;
  canClaim: boolean;
  t: any;
}
const RewardModal: React.FC<RewardModalProps> = ({ onClaim, onClose, canClaim, t }) => (
  <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
    <div className="bg-purple-900/60 backdrop-blur-xl rounded-[32px] p-6 w-full max-w-sm flex flex-col items-center gap-4 shadow-2xl border-[4px] border-white/20 animate-pop">
      <div className="bg-yellow-400 p-4 rounded-full border-4 border-white/50 shadow-lg mb-2">
        <Gift size={48} className="text-white drop-shadow-md" />
      </div>
      <h2 className="text-3xl font-black text-white uppercase drop-shadow-md">{t.rewardTitle}</h2>
      
      {canClaim ? (
        <div className="text-center space-y-4 w-full">
           <p className="text-purple-100 font-bold text-lg">{t.freeCoins} <span className="text-yellow-300">200 🪙</span></p>
           <Button fullWidth size="lg" variant="accent" onClick={onClaim}>{t.claim}</Button>
        </div>
      ) : (
        <div className="text-center space-y-4 w-full opacity-80">
           <p className="text-purple-200 font-bold">{t.claimed}</p>
           <p className="text-white font-black text-xl">{t.comeBack}</p>
           <Button fullWidth variant="secondary" onClick={onClose}>{t.close}</Button>
        </div>
      )}
      {canClaim && (
         <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white">
           <X size={24} />
         </button>
      )}
    </div>
  </div>
);

interface HighscoreModalProps {
  onClose: () => void;
  t: any;
}
const HighscoreModal: React.FC<HighscoreModalProps> = ({ onClose, t }) => {
  const [scores, setScores] = useState<HighScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      const { data } = await supabase
        .from('leaderboard')
        .select('username, score')
        .order('score', { ascending: false })
        .limit(10);
      if (data) setScores(data);
      setLoading(false);
    };
    fetchScores();
  }, []);

  return (
    <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-purple-900/60 backdrop-blur-xl rounded-[32px] p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl border-[4px] border-white/20 animate-pop h-[60vh]">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-black text-white uppercase drop-shadow-md flex items-center gap-2">
            <Trophy className="text-yellow-300" /> {t.highScore}
          </h2>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-black/20 rounded-xl p-2 space-y-2 border border-white/10">
           {loading ? (
             <div className="text-white/50 text-center py-8">{t.loading}</div>
           ) : scores.length === 0 ? (
             <div className="text-white/50 text-center py-8">{t.noData}</div>
           ) : (
             scores.map((s, i) => (
               <div key={i} className="flex justify-between items-center bg-white/10 p-3 rounded-lg border border-white/5">
                  <div className="flex items-center gap-3">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black border-2 ${i===0 ? 'bg-yellow-400 border-yellow-200 text-yellow-900' : i===1 ? 'bg-slate-300 border-slate-100 text-slate-900' : i===2 ? 'bg-orange-400 border-orange-200 text-orange-900' : 'bg-purple-800 border-purple-600 text-purple-200'}`}>
                        {i+1}
                     </div>
                     <span className="text-white font-bold truncate max-w-[120px]">{s.username}</span>
                  </div>
                  <span className="text-yellow-300 font-black">{s.score}</span>
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
};

interface MusicModalProps {
  onClose: () => void;
  currentTrackIdx: number;
  onSelect: (idx: number) => void;
  t: any;
}
const MusicModal: React.FC<MusicModalProps> = ({ onClose, currentTrackIdx, onSelect, t }) => (
  <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-purple-900/60 backdrop-blur-xl rounded-[32px] p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl border-[4px] border-white/20 animate-pop">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-black text-white uppercase drop-shadow-md flex items-center gap-2">
            <Music className="text-pink-300" /> {t.music}
          </h2>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-3">
           {MusicManager.tracks.map((track, i) => (
             <button
               key={i}
               onClick={() => onSelect(i)}
               className={`w-full p-4 rounded-xl flex items-center justify-between border-b-4 transition-all ${currentTrackIdx === i ? 'bg-white text-purple-900 border-purple-200' : 'bg-purple-800/50 text-white border-purple-900/50 hover:bg-purple-700/50'}`}
             >
                <div className="flex items-center gap-3">
                   {currentTrackIdx === i ? <Volume2 size={20} className="text-green-500" /> : <span className="w-5" />}
                   <span className="font-bold">{t.tracks[track.name as keyof typeof t.tracks] || track.name}</span>
                </div>
                {currentTrackIdx === i && <Check size={20} className="text-green-500" />}
             </button>
           ))}
        </div>
      </div>
  </div>
);

interface ShopModalProps {
  onClose: () => void;
  coins: number;
  boosters: Boosters;
  onBuy: (type: BoosterType) => boolean;
  onWatchAd: () => void;
  t: any;
}
const ShopModal: React.FC<ShopModalProps> = ({ onClose, coins, boosters, onBuy, onWatchAd, t }) => {
  const ITEMS = [
    { id: 'HAMMER', icon: <Hammer />, price: 100, desc: t.hammerDesc, name: t.hammer, color: 'text-blue-400' },
    { id: 'SHUFFLE', icon: <Shuffle />, price: 150, desc: t.shuffleDesc, name: t.shuffle, color: 'text-green-400' },
    { id: 'BOMB', icon: <Bomb />, price: 200, desc: t.bombDesc, name: t.bomb, color: 'text-red-400' },
  ];

  return (
    <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-purple-900/60 backdrop-blur-xl rounded-[32px] p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl border-[4px] border-white/20 animate-pop h-[70vh]">
         <div className="flex justify-between items-center bg-black/20 p-3 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2">
               <Coins className="text-yellow-400 fill-yellow-400" />
               <span className="text-2xl font-black text-white">{coins}</span>
            </div>
            <button onClick={onClose} className="bg-white/20 p-2 rounded-full text-white hover:bg-white/30">
               <X size={20} />
            </button>
         </div>

         <div className="flex-1 overflow-y-auto space-y-3 pr-1">
             <div className="bg-white/10 p-4 rounded-2xl flex items-center justify-between border border-white/10">
                <div className="flex items-center gap-3">
                   <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white">
                      <Video size={24} />
                   </div>
                   <div>
                      <div className="font-black text-white text-sm">{t.freeCoins}</div>
                      <div className="text-xs text-white/70">+50 🪙</div>
                   </div>
                </div>
                <Button size="sm" variant="accent" onClick={onWatchAd}>{t.watchAd}</Button>
             </div>

             {ITEMS.map((item) => (
                <div key={item.id} className="bg-white/90 p-4 rounded-2xl border-b-[6px] border-purple-200/50 shadow-sm backdrop-blur-sm">
                   <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                         <div className={`text-3xl ${item.color}`}>{item.icon}</div>
                         <div>
                            <div className="font-black text-purple-900 leading-tight">{item.name}</div>
                            <div className="text-[10px] text-purple-600 font-bold">{t.buy} {boosters[item.id as BoosterType]}</div>
                         </div>
                      </div>
                      <div className="bg-yellow-100 px-2 py-1 rounded-lg border border-yellow-300">
                         <span className="font-black text-yellow-700 text-sm flex items-center gap-1">
                            {item.price} <Coins size={12} />
                         </span>
                      </div>
                   </div>
                   <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-500 font-medium">{item.desc}</span>
                      <Button 
                         size="sm" 
                         variant={coins >= item.price ? 'primary' : 'secondary'} 
                         onClick={() => onBuy(item.id as BoosterType)}
                         className={coins < item.price ? 'opacity-50' : ''}
                      >
                         +1
                      </Button>
                   </div>
                </div>
             ))}
         </div>
      </div>
    </div>
  );
};

interface UsernameModalProps {
  onSave: (name: string) => void;
  currentName: string;
  t: any;
  onClose: () => void;
}
const UsernameModal: React.FC<UsernameModalProps> = ({ onSave, currentName, t, onClose }) => {
  const [name, setName] = useState(currentName);

  return (
    <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
       <div className="bg-purple-900/60 backdrop-blur-xl rounded-[32px] p-8 w-full max-w-sm flex flex-col items-center gap-6 shadow-2xl border-[4px] border-white/20 animate-pop">
          <div className="bg-white p-4 rounded-full shadow-lg">
             <User size={48} className="text-purple-600" />
          </div>
          <h2 className="text-2xl font-black text-white text-center">{t.inputName}</h2>
          
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.inputPlaceholder}
            className="w-full px-6 py-4 rounded-2xl text-center font-black text-xl border-4 border-purple-300/50 bg-white/10 backdrop-blur text-white focus:border-yellow-400 outline-none uppercase placeholder:text-purple-200"
            maxLength={12}
          />

          <div className="flex gap-2 w-full">
            {currentName && (
               <Button variant="secondary" onClick={onClose} className="flex-1">
                  <X size={24} />
               </Button>
            )}
            <Button fullWidth variant="primary" onClick={() => onSave(name)} disabled={!name.trim()}>
              {t.save}
            </Button>
          </div>
       </div>
    </div>
  );
};

interface CharacterModalProps {
  onClose: () => void;
  characters: Character[];
  unlockedIds: string[];
  selectedId: string;
  coins: number;
  onUnlock: (id: string, price: number) => boolean;
  onSelect: (id: string) => void;
  t: any;
}
const CharacterModal: React.FC<CharacterModalProps> = ({ onClose, characters, unlockedIds, selectedId, coins, onUnlock, onSelect, t }) => {
  return (
     <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-purple-900/60 backdrop-blur-xl rounded-[32px] p-4 w-full max-w-md flex flex-col gap-4 shadow-2xl border-[4px] border-white/20 animate-pop h-[80vh]">
           <div className="flex justify-between items-center px-2">
              <h2 className="text-2xl font-black text-white uppercase drop-shadow-md flex items-center gap-2">
                <Crown className="text-yellow-300" /> {t.selectChar}
              </h2>
              <button onClick={onClose} className="text-white/60 hover:text-white">
                <X size={24} />
              </button>
           </div>
           
           <div className="flex justify-center bg-black/20 rounded-xl p-2 mb-2 border border-white/10">
              <div className="flex items-center gap-2 text-yellow-300 font-black">
                 <Coins size={20} className="fill-yellow-300" /> {coins}
              </div>
           </div>

           <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 p-1">
              {characters.map(char => {
                 const isUnlocked = unlockedIds.includes(char.id);
                 const isSelected = selectedId === char.id;
                 const charInfo = t.characters[char.id as keyof typeof t.characters];
                 
                 return (
                    <div 
                      key={char.id}
                      onClick={() => {
                        if (isUnlocked) onSelect(char.id);
                        else onUnlock(char.id, char.price);
                      }}
                      className={`
                        relative rounded-2xl p-3 flex flex-col items-center gap-2 border-b-[4px] transition-all cursor-pointer
                        ${isSelected ? 'bg-white border-yellow-400 ring-2 ring-yellow-300' : 'bg-purple-800/50 border-purple-900/50 hover:bg-purple-700/50'}
                        ${!isUnlocked && 'opacity-90 grayscale-[0.3]'}
                      `}
                    >
                       <div className={`w-16 h-16 ${char.color} rounded-2xl flex items-center justify-center border-2 border-white/20 shadow-md relative`}>
                          <span className="text-3xl filter drop-shadow-sm">{char.icon}</span>
                          <span className="absolute -bottom-1 -right-1 text-xl">{char.accessory}</span>
                          {!isUnlocked && (
                             <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center backdrop-blur-[1px]">
                                <LockIcon size={24} className="text-white" />
                             </div>
                          )}
                       </div>
                       
                       <div className="text-center w-full">
                          <div className={`font-black text-sm leading-tight ${isSelected ? 'text-purple-900' : 'text-white'}`}>{charInfo?.name}</div>
                          <div className={`text-[10px] font-bold leading-tight mt-0.5 ${isSelected ? 'text-purple-600' : 'text-white/60'}`}>{charInfo?.desc}</div>
                       </div>

                       {!isUnlocked && (
                          <div className="mt-1 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 shadow-sm">
                             {char.price} <Coins size={10} />
                          </div>
                       )}
                       {isSelected && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-sm">
                             <Check size={12} strokeWidth={4} />
                          </div>
                       )}
                    </div>
                 );
              })}
           </div>
        </div>
     </div>
  );
};

interface PermissionModalProps {
  onRequest: () => void;
  t: any;
  onClose: () => void;
}
const PermissionModal: React.FC<PermissionModalProps> = ({ onRequest, t, onClose }) => (
   <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
       <div className="bg-purple-900/60 backdrop-blur-xl rounded-[32px] p-8 w-full max-w-sm flex flex-col items-center gap-6 shadow-2xl border-[4px] border-white/20 animate-pop text-center">
          <div className="bg-blue-500 p-4 rounded-full shadow-lg border-4 border-white/50">
             <Bell size={48} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white mb-2">{t.permissionTitle}</h2>
            <p className="text-purple-100 text-sm leading-relaxed">{t.permissionDesc}</p>
          </div>
          
          <Button fullWidth size="lg" variant="primary" onClick={onRequest}>{t.allow}</Button>
          <button onClick={onClose} className="text-white/50 text-xs font-bold underline mt-2">{t.close}</button>
       </div>
    </div>
);

export const App: React.FC = () => {
  const [screen, setScreen] = useState<ScreenState>('SPLASH');
  const [levels, setLevels] = useState<LevelData[]>(INITIAL_LEVELS);
  const [currentLevelId, setCurrentLevelId] = useState<number>(1);
  const [gameResult, setGameResult] = useState<{score: number, stars: number} | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0); 
  const [language, setLanguage] = useState<LangType>('ID');
  const t = TRANSLATIONS[language];
  
  // Data Persistence State
  const [coins, setCoins] = useState<number>(0);
  const [lastRewardTime, setLastRewardTime] = useState<number>(0);
  const [username, setUsername] = useState<string>('');
  
  // Character State
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('c1');
  const [unlockedCharacterIds, setUnlockedCharacterIds] = useState<string[]>(['c1', 'c2']);
  
  // Inventory State
  const [boosters, setBoosters] = useState<Boosters>({ BOMB: 1, HAMMER: 1, SHUFFLE: 1 });

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  // Modal State
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showHighscoreModal, setShowHighscoreModal] = useState(false);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [topScoreNotification, setTopScoreNotification] = useState<{show: boolean, amount: number}>({show: false, amount: 0});
  
  // Multiplier State
  const [showMultiplierModal, setShowMultiplierModal] = useState(false);
  const [pendingRewardBase, setPendingRewardBase] = useState(0);

  // Ad State
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  // Shop Prices
  const PRICES = {
    HAMMER: 100,
    SHUFFLE: 150,
    BOMB: 200
  };

  // --- Load Data on Mount (Run Once) ---
  useEffect(() => {
    // ... existing init logic ...
    AdManager.init();
    
    const savedCoins = localStorage.getItem('fbb_coins');
    const savedReward = localStorage.getItem('fbb_last_reward');
    const savedLevels = localStorage.getItem('fbb_levels');
    const savedBoosters = localStorage.getItem('fbb_boosters');
    const savedUsername = localStorage.getItem('fbb_username');
    const savedCharId = localStorage.getItem('fbb_selected_char');
    const savedUnlockedChars = localStorage.getItem('fbb_unlocked_chars');
    const savedLang = localStorage.getItem('fbb_lang');

    if (savedCoins) setCoins(parseInt(savedCoins));
    if (savedReward) setLastRewardTime(parseInt(savedReward));
    if (savedUsername) setUsername(savedUsername);
    if (savedCharId) setSelectedCharacterId(savedCharId);
    if (savedUnlockedChars) setUnlockedCharacterIds(JSON.parse(savedUnlockedChars));
    if (savedLang) setLanguage(savedLang as LangType);
    
    if (savedLevels) {
      try {
        const parsedLevels = JSON.parse(savedLevels);
        if (Array.isArray(parsedLevels) && parsedLevels.length > 0) {
           setLevels(parsedLevels as LevelData[]);
        }
      } catch (e) {
        console.error("Failed to load levels", e);
      }
    }
    if (savedBoosters) {
      try {
        setBoosters(JSON.parse(savedBoosters));
      } catch(e) {}
    }
    
    // Auto-play BGM interaction check
    const handleInteraction = () => {
        if (!isMuted) MusicManager.start();
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('touchstart', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    // PWA Install Event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    });

    // Hourly Notification Logic
    const notificationInterval = setInterval(() => {
       if (Notification.permission === 'granted') {
          // Get current lang for notification text directly from storage to avoid stale closure
          const currentLang = (localStorage.getItem('fbb_lang') as LangType) || 'ID';
          const notificationText = TRANSLATIONS[currentLang].notificationBody;
          
          new Notification("Fruit Block Blast", {
            body: notificationText,
            icon: '/icon-192.png'
          });
       }
    }, 3600000); // 1 Hour

    return () => clearInterval(notificationInterval);
  }, []);

  // --- Splash Screen Timer ---
  useEffect(() => {
    if (screen === 'SPLASH') {
      const timer = setTimeout(() => {
        // Permission check first
        if (Notification.permission === 'default' && !localStorage.getItem('fbb_permissions_asked')) {
           setScreen('HOME');
           setShowPermissionModal(true);
        } else if (!localStorage.getItem('fbb_username')) {
          setScreen('HOME');
          setShowUsernameModal(true);
        } else {
          setScreen('HOME');
        }
        MusicManager.playThemeForCharacter(selectedCharacterId);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  // --- Helpers ---
  const toggleLanguage = () => {
    const newLang = language === 'ID' ? 'EN' : 'ID';
    setLanguage(newLang);
    localStorage.setItem('fbb_lang', newLang);
    SoundManager.play('click');
  };

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setShowInstallButton(false);
        }
        setDeferredPrompt(null);
      });
    }
  };

  const requestPermissions = async () => {
    try {
       await Notification.requestPermission();
       localStorage.setItem('fbb_permissions_asked', 'true');
       setShowPermissionModal(false);
       if (!username) setShowUsernameModal(true);
    } catch (e) {
       console.log(e);
       setShowPermissionModal(false);
    }
  };

  const updateCoins = (amount: number) => {
    const newAmount = coins + amount;
    setCoins(newAmount);
    localStorage.setItem('fbb_coins', newAmount.toString());
  };

  const updateBoosters = (newBoosters: Boosters) => {
    setBoosters(newBoosters);
    localStorage.setItem('fbb_boosters', JSON.stringify(newBoosters));
  };

  const consumeBooster = (type: BoosterType) => {
    if (boosters[type] > 0) {
      updateBoosters({ ...boosters, [type]: boosters[type] - 1 });
      return true;
    }
    return false;
  };

  const buyBooster = (type: BoosterType) => {
    const price = PRICES[type];
    if (coins >= price) {
      SoundManager.play('win'); 
      updateCoins(-price);
      updateBoosters({ ...boosters, [type]: boosters[type] + 1 });
      return true;
    } else {
      SoundManager.play('invalid');
      return false;
    }
  };

  const unlockCharacter = (charId: string, price: number) => {
    if (coins >= price) {
      updateCoins(-price);
      const newUnlocked = [...unlockedCharacterIds, charId];
      setUnlockedCharacterIds(newUnlocked);
      localStorage.setItem('fbb_unlocked_chars', JSON.stringify(newUnlocked));
      selectCharacter(charId); 
      SoundManager.play('win');
      return true;
    } else {
      SoundManager.play('invalid');
      return false;
    }
  };

  const selectCharacter = (charId: string) => {
    if (unlockedCharacterIds.includes(charId)) {
      setSelectedCharacterId(charId);
      localStorage.setItem('fbb_selected_char', charId);
      SoundManager.play('click');
      MusicManager.playThemeForCharacter(charId);
    }
  };

  const saveUsername = (name: string) => {
    const cleanName = name.trim().toUpperCase().slice(0, 12);
    setUsername(cleanName);
    localStorage.setItem('fbb_username', cleanName);
    setShowUsernameModal(false);
    SoundManager.play('win');
    MusicManager.start();
  };

  const saveScoreToSupabase = async (score: number) => {
    const user = username || t.defaultPlayerName;
    try {
      // 1. Check Global Top Score for Notification Logic
      const { data: topScoreData } = await supabase
        .from('leaderboard')
        .select('score')
        .order('score', { ascending: false })
        .limit(1);

      const globalTopScore = topScoreData && topScoreData.length > 0 ? topScoreData[0].score : 0;

      if (score > globalTopScore) {
        const bonus = 500;
        setTopScoreNotification({ show: true, amount: bonus });
        updateCoins(bonus);
        SoundManager.play('win');
      }

      // 2. UPSERT
      const { data: existingUser } = await supabase
         .from('leaderboard')
         .select('id, score')
         .eq('username', user)
         .maybeSingle();

      if (existingUser) {
         if (score > existingUser.score) {
            await supabase
               .from('leaderboard')
               .update({ score: score, created_at: new Date().toISOString() })
               .eq('id', existingUser.id);
         }
      } else {
         await supabase
            .from('leaderboard')
            .insert([{ username: user, score: score }]);
      }
      
    } catch (e) {
      console.error('Leaderboard sync error:', e);
    }
  };

  const updateLevels = (newLevels: LevelData[]) => {
    setLevels(newLevels);
    localStorage.setItem('fbb_levels', JSON.stringify(newLevels));
  };

  // --- Audio ---
  const toggleAudio = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    SoundManager.isMuted = newState;
    MusicManager.setMute(newState);
    if (!newState) {
      SoundManager.play('click');
      MusicManager.start();
    }
  };

  const selectMusic = (index: number) => {
    MusicManager.setTrack(index);
    setCurrentTrackIdx(index);
    SoundManager.play('click');
  };

  // --- Game Flow ---
  const startLevel = (levelId: number) => {
    SoundManager.play('click');
    MusicManager.playThemeForLevel(levelId);
    setCurrentLevelId(levelId);
    setScreen('GAME');
  };

  const handleWin = (score: number, stars: number) => {
    SoundManager.play('win');
    const newLevels = levels.map(l => {
      if (l.id === currentLevelId) return { ...l, stars: Math.max(l.stars, stars) as 0 | 1 | 2 | 3 };
      if (l.id === currentLevelId + 1) return { ...l, unlocked: true };
      return l;
    });
    updateLevels(newLevels);
    const coinReward = stars * 10;
    updateCoins(coinReward);
    saveScoreToSupabase(score);
    setGameResult({ score, stars });
    setScreen('WIN');
    MusicManager.playThemeForCharacter(selectedCharacterId);
  };

  const handleGameOver = (score: number) => {
    SoundManager.play('gameover');
    saveScoreToSupabase(score);
    setGameResult({ score, stars: 0 });
    setScreen('GAME_OVER');
    MusicManager.playThemeForCharacter(selectedCharacterId);
  };

  // --- Reward Logic ---
  const canClaimReward = () => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    return now - lastRewardTime > oneHour;
  };

  const startRewardClaimFlow = () => {
    if (canClaimReward()) {
      SoundManager.play('click');
      setPendingRewardBase(200); // Base reward is 200
      setShowRewardModal(false);
      setShowMultiplierModal(true); // Open multiplier modal
    }
  };

  const finalizeRewardClaim = (multiplier: number) => {
    const finalAmount = pendingRewardBase * multiplier;
    updateCoins(finalAmount);
    
    const now = Date.now();
    setLastRewardTime(now);
    localStorage.setItem('fbb_last_reward', now.toString());
    
    SoundManager.play('win');
    setShowMultiplierModal(false);
  };

  const watchAdForMultiplier = async (): Promise<boolean> => {
    try {
      // Use specific Multiplier Ad ID
      const success = await AdManager.showRewarded(AD_CONFIG.MULTIPLIER_ID);
      if (success) {
         return true;
      } else {
         // Real ads only
         alert(t.adUnavailable);
         return false;
      }
    } catch (e) {
      console.error("Ad failed:", e);
      return false;
    }
  };

  const watchAdForCoins = async () => {
    SoundManager.play('click');
    
    // Use generic Reward Ad ID
    try {
      const success = await AdManager.showRewarded(AD_CONFIG.REWARDED_ID);
      if (success) {
         updateCoins(50);
         SoundManager.play('win');
      } else {
         // Real ads only
         alert(t.adUnavailable);
      }
    } catch (e) {
      console.error("Ad failed:", e);
    }
  };

  const getSelectedCharacter = () => {
    return CHARACTERS.find(c => c.id === selectedCharacterId) || CHARACTERS[0];
  };

  const renderSplash = () => (
    <div className={`flex flex-col items-center justify-center h-full relative overflow-hidden w-full`}>
       <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
       <div className="flex flex-col items-center justify-center animate-pop">
           <img 
               src="https://amfnhqsrjrtcdtslpbas.supabase.co/storage/v1/object/public/images/icon-fruitblockblast.png" 
               alt="Fruit Block Blast" 
               className="w-64 h-64 object-contain drop-shadow-2xl filter"
           />
       </div>
    </div>
  );

  const renderHome = () => {
    const activeChar = getSelectedCharacter();
    const activeCharName = t.characters[activeChar.id as keyof typeof t.characters]?.name || "Hero";
    
    return (
    <div className={`flex flex-col items-center h-full relative overflow-hidden w-full`}>
       <FloatingBackground />
       <div className="absolute bottom-0 w-full h-48 pointer-events-none z-0">
          <div className="cloud-shape absolute bottom-[-50px] left-[-50px] w-60 h-60"></div>
          <div className="cloud-shape absolute bottom-[-30px] right-[-50px] w-64 h-64"></div>
       </div>

       {/* Top Bar Area */}
       <div className="absolute top-safe w-full px-4 flex justify-between items-start z-30 pt-4 pointer-events-none max-w-7xl">
           {/* Install PWA Button (Left) */}
           <div className="flex flex-col gap-2 pointer-events-auto">
             {showInstallButton && (
                <div className="animate-bounce">
                   <Button size="sm" variant="accent" onClick={handleInstallClick} className="!p-2 !rounded-full shadow-lg">
                      <Download size={20} />
                   </Button>
                </div>
             )}
           </div>

           {/* Right Side: Coins & User */}
           <div className="flex flex-col gap-2 items-end pointer-events-auto">
               <div 
                 className="bg-black/20 backdrop-blur-md pl-4 pr-1 py-1 rounded-full flex items-center gap-2 border-2 border-white/20 cursor-pointer hover:bg-black/30 transition-colors active:scale-95 shadow-lg"
                 onClick={() => { SoundManager.play('click'); setShowShopModal(true); }}
               >
                  <Coins size={20} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-white font-black text-lg mr-2">{coins}</span>
                  <div className="bg-green-500 rounded-full p-1">
                     <ShoppingCart size={14} className="text-white" />
                  </div>
               </div>

               <div 
                  className="bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border-2 border-white/20 cursor-pointer hover:bg-black/30 transition-colors active:scale-95 shadow-lg"
                  onClick={() => { SoundManager.play('click'); setShowUsernameModal(true); }}
               >
                  <User size={18} className="text-white" />
                  <span className="text-white font-black text-sm max-w-[100px] truncate">{username || t.defaultPlayerName}</span>
               </div>
           </div>
       </div>
       
       {/* Lang Switcher */}
       <div className="absolute top-safe w-full flex justify-center mt-16 z-20 pointer-events-none">
          <button 
            onClick={toggleLanguage}
            className="bg-white/30 backdrop-blur px-3 py-1 rounded-full text-white font-black text-xs border border-white/40 flex items-center gap-1 hover:bg-white/40 transition-all pointer-events-auto shadow-sm cursor-pointer active:scale-95"
          >
            <Globe size={12} /> {language}
          </button>
       </div>

       {/* Main Content Area */}
       <div className="flex-1 w-full flex flex-col items-center justify-between z-10 relative px-6 pb-20 pt-28 max-w-4xl lg:max-w-6xl mx-auto lg:flex-row lg:justify-center lg:gap-16">
          
          {/* Logo (Left on Desktop) */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full mb-4 lg:mb-0">
             <img 
                 src="https://amfnhqsrjrtcdtslpbas.supabase.co/storage/v1/object/public/images/icon-fruitblockblast.png" 
                 alt="Fruit Block Blast" 
                 className="max-h-[35vh] lg:max-h-[60vh] w-auto object-contain drop-shadow-2xl filter animate-pop hover:scale-105 transition-transform duration-500 cursor-pointer"
             />
          </div>

          {/* Character, Start Button & Actions (Right on Desktop) */}
          <div className="w-full max-w-xs flex flex-col items-center gap-6 flex-shrink-0 mb-safe-bottom lg:justify-center">
             
             {/* Character Card */}
             <div className="flex-shrink-0 relative group z-20 lg:scale-125 lg:mb-4">
                <div 
                   className="cursor-pointer relative"
                   onClick={() => { SoundManager.play('click'); setShowCharacterModal(true); }}
                >
                    <div className="absolute inset-0 bg-white/30 rounded-full blur-xl scale-110 animate-pulse group-hover:scale-125 transition-transform"></div>
                    <div className={`w-28 h-28 ${activeChar.color} rounded-3xl flex items-center justify-center shadow-[0_10px_0_rgba(0,0,0,0.2)] border-4 border-white relative transform transition-transform group-hover:-translate-y-2 group-active:translate-y-0 group-active:shadow-none`}>
                       <div className="text-5xl drop-shadow-md z-10 grayscale-0">
                          {activeChar.icon}
                       </div>
                       <div className="absolute -bottom-2 -right-2 text-3xl filter drop-shadow-lg transform rotate-12">{activeChar.accessory}</div>
                       <div className="absolute -top-3 -right-3 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white animate-bounce">
                          {t.change}
                       </div>
                    </div>
                </div>
                <div className="mt-3 text-center">
                   <div className="bg-black/40 backdrop-blur-sm px-3 py-0.5 rounded-full border border-white/20 inline-block">
                      <span className="text-white font-bold text-xs shadow-black drop-shadow-md">{activeCharName}</span>
                   </div>
                </div>
             </div>

             {/* Start Button */}
             <div className="w-full relative lg:scale-110">
                 <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-40 animate-pulse"></div>
                 <Button 
                   variant="start" 
                   size="xl" 
                   fullWidth
                   onClick={() => { 
                     SoundManager.play('click'); 
                     setScreen('LEVEL_SELECT'); 
                   }} 
                   className="shadow-2xl hover:scale-105 active:scale-95 transition-transform z-10 py-4 text-3xl"
                 >
                   {t.start}
                 </Button>
             </div>

             {/* Bottom Action Row */}
             <div className="flex justify-center gap-3 lg:gap-4 lg:mt-4">
                 <div className="relative">
                    <Button variant="icon" size="icon" onClick={() => { SoundManager.play('click'); setShowRewardModal(true); }}>
                        <Gift size={22} className={canClaimReward() ? "animate-bounce" : ""} />
                    </Button>
                    {canClaimReward() && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />}
                 </div>
                 
                 <Button variant="icon" size="icon" onClick={() => { SoundManager.play('click'); setShowHighscoreModal(true); }}>
                    <Trophy size={22} />
                 </Button>
                 
                 <Button variant="icon" size="icon" onClick={() => { SoundManager.play('click'); setShowShopModal(true); }}>
                    <ShoppingCart size={22} />
                 </Button>

                 <Button variant="icon" size="icon" onClick={() => { SoundManager.play('click'); setShowMusicModal(true); }}>
                    <Music size={22} />
                 </Button>

                 <Button variant="icon" size="icon" onClick={toggleAudio}>
                    {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                 </Button>
             </div>
          </div>
       </div>

       {/* Ad Banner Fixed at Bottom */}
       <div className="absolute bottom-0 w-full z-0 pointer-events-none">
          <div className="pointer-events-auto bg-white/10 backdrop-blur-md">
            <AdBanner />
          </div>
       </div>
    </div>
    );
  };

  const renderLevelSelect = () => (
    <div className="flex flex-col h-full bg-[#4c1d95]">
       <div className="p-4 flex items-center justify-between bg-purple-800 shadow-md z-10">
          <Button variant="icon" size="icon" onClick={() => { SoundManager.play('click'); setScreen('HOME'); }}>
             <Home size={24} />
          </Button>
          <h2 className="text-2xl font-black text-white drop-shadow-md">{t.selectLevel}</h2>
          <div className="w-12"></div>
       </div>
       <div className="flex-1 overflow-y-auto p-4 grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 content-start">
          {levels.map((lvl) => (
             <button
               key={lvl.id}
               disabled={!lvl.unlocked}
               onClick={() => startLevel(lvl.id)}
               className={`
                 aspect-square rounded-2xl flex flex-col items-center justify-center relative shadow-sm border-b-4 transition-all
                 ${lvl.unlocked 
                    ? 'bg-gradient-to-br from-purple-400 to-purple-600 border-purple-800 active:translate-y-1 active:border-b-0' 
                    : 'bg-slate-700/50 border-slate-800 opacity-60'
                 }
               `}
             >
                <span className="text-white font-black text-xl drop-shadow-md">{lvl.id}</span>
                {lvl.unlocked ? (
                   <div className="flex gap-0.5 mt-1">
                      {[1,2,3].map(s => (
                         <Star key={s} size={10} className={`${s <= lvl.stars ? 'text-yellow-300 fill-yellow-300' : 'text-black/30 fill-black/30'}`} />
                      ))}
                   </div>
                ) : (
                   <Lock size={16} className="text-white/40 mt-1" />
                )}
             </button>
          ))}
       </div>
    </div>
  );

  const renderWin = () => (
    <div className="flex flex-col items-center justify-center h-full bg-black/60 backdrop-blur-md absolute inset-0 z-50 animate-pop">
       <div className="bg-purple-900/80 p-8 rounded-[40px] border-[6px] border-white/20 shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full mx-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          
          <h2 className="text-5xl font-black text-yellow-400 candy-text font-display drop-shadow-xl">{t.win}</h2>
          
          <div className="flex gap-2">
             {[1,2,3].map(s => (
                <Star 
                  key={s} 
                  size={48} 
                  className={`${s <= (gameResult?.stars || 0) ? 'text-yellow-400 fill-yellow-400 animate-[bounce_0.5s_ease-in-out]' : 'text-slate-600 fill-slate-800'}`} 
                  style={{ animationDelay: `${s * 0.2}s` }}
                />
             ))}
          </div>

          <div className="bg-black/30 rounded-xl p-4 w-full text-center border border-white/10">
             <div className="text-purple-200 text-sm font-bold uppercase tracking-widest mb-1">{t.score}</div>
             <div className="text-4xl font-black text-white">{gameResult?.score}</div>
          </div>

          <div className="flex flex-col w-full gap-3 z-10">
             <Button fullWidth size="lg" variant="start" onClick={() => { SoundManager.play('click'); startLevel(currentLevelId + 1); }}>
                Level {currentLevelId + 1}
             </Button>
             <div className="flex gap-3">
               <Button fullWidth variant="secondary" onClick={() => { SoundManager.play('click'); startLevel(currentLevelId); }}>
                  <RotateCcw size={24} />
               </Button>
               <Button fullWidth variant="glass" onClick={() => { SoundManager.play('click'); setScreen('HOME'); }}>
                  <Home size={24} />
               </Button>
             </div>
          </div>
       </div>
    </div>
  );

  const renderGameOver = () => (
    <div className="flex flex-col items-center justify-center h-full bg-black/80 backdrop-blur-md absolute inset-0 z-50 animate-pop">
       <div className="bg-slate-800 p-8 rounded-[40px] border-[6px] border-slate-600 shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full mx-4">
          <h2 className="text-4xl font-black text-slate-300 font-display drop-shadow-xl text-center">{t.gameOver}</h2>
          
          <div className="bg-black/30 rounded-xl p-4 w-full text-center border border-white/5">
             <div className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">{t.score}</div>
             <div className="text-4xl font-black text-white">{gameResult?.score}</div>
          </div>

          <div className="flex flex-col w-full gap-3">
             <Button fullWidth size="lg" variant="primary" onClick={() => { SoundManager.play('click'); startLevel(currentLevelId); }}>
                {t.tryAgain}
             </Button>
             <Button fullWidth variant="glass" onClick={() => { SoundManager.play('click'); setScreen('HOME'); }}>
                <Home size={24} />
             </Button>
          </div>
       </div>
    </div>
  );

  // Main Render
  return (
    <div className={`w-full h-[100dvh] ${COLORS.background} text-white font-sans overflow-hidden select-none`}>
       {screen === 'SPLASH' && renderSplash()}
       {screen === 'HOME' && renderHome()}
       {screen === 'LEVEL_SELECT' && renderLevelSelect()}
       {screen === 'GAME' && (
          <GameScreen 
             level={levels.find(l => l.id === currentLevelId)!}
             bestScore={0}
             onWin={handleWin}
             onGameOver={handleGameOver}
             onExit={() => { setScreen('HOME'); MusicManager.playThemeForCharacter(selectedCharacterId); }}
             onAddCoins={updateCoins}
             boosters={boosters}
             onConsumeBooster={consumeBooster}
             onBuyBooster={buyBooster}
             coins={coins}
             character={getSelectedCharacter()}
             lang={language}
          />
       )}
       {screen === 'WIN' && renderWin()}
       {screen === 'GAME_OVER' && renderGameOver()}

       {/* Modals */}
       {showRewardModal && (
          <RewardModal 
             onClaim={startRewardClaimFlow} 
             onClose={() => setShowRewardModal(false)}
             canClaim={canClaimReward()}
             t={t}
          />
       )}
       
       {showMultiplierModal && (
          <MultiplierModal 
            baseAmount={pendingRewardBase} 
            onClaim={finalizeRewardClaim} 
            onWatchAd={watchAdForMultiplier}
            t={t}
          />
       )}

       {showHighscoreModal && <HighscoreModal onClose={() => setShowHighscoreModal(false)} t={t} />}
       {showMusicModal && <MusicModal onClose={() => setShowMusicModal(false)} currentTrackIdx={currentTrackIdx} onSelect={selectMusic} t={t} />}
       {showShopModal && <ShopModal onClose={() => setShowShopModal(false)} coins={coins} boosters={boosters} onBuy={buyBooster} onWatchAd={watchAdForCoins} t={t} />}
       {showUsernameModal && <UsernameModal onSave={saveUsername} currentName={username} t={t} onClose={() => setShowUsernameModal(false)} />}
       {showCharacterModal && <CharacterModal onClose={() => setShowCharacterModal(false)} characters={CHARACTERS} unlockedIds={unlockedCharacterIds} selectedId={selectedCharacterId} coins={coins} onUnlock={unlockCharacter} onSelect={selectCharacter} t={t} />}
       {showPermissionModal && <PermissionModal onRequest={requestPermissions} t={t} onClose={() => setShowPermissionModal(false)} />}
       
       {topScoreNotification.show && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 px-6 py-3 rounded-full shadow-xl z-[100] animate-bounce flex items-center gap-3 border-4 border-white">
             <Trophy size={24} />
             <div>
               <div className="font-black text-sm uppercase">{t.newRecord}</div>
               <div className="font-bold text-xs">+ {topScoreNotification.amount} Coins</div>
             </div>
             <button onClick={() => setTopScoreNotification({show: false, amount: 0})} className="bg-black/10 p-1 rounded-full"><X size={14}/></button>
          </div>
       )}
    </div>
  );
};