import React, { useState, useEffect } from 'react';
import { ScreenState, LevelData, Boosters, BoosterType, Character } from './types';
import { INITIAL_LEVELS, COLORS, CHARACTERS } from './constants';
import { Button } from './components/Button';
import { GameScreen } from './screens/GameScreen';
import { SoundManager, MusicManager } from './utils/audio';
import { supabase } from './utils/supabaseClient';
import { TRANSLATIONS, LangType } from './utils/i18n';
import { Play, Star, Lock, RefreshCw, Menu, Volume2, VolumeX, Trophy, Gift, Award, X, Coins, Music, ShoppingCart, Bomb, Hammer, Shuffle, Video, User, Check, Lock as LockIcon, Zap, Crown, Download, Globe, Bell } from 'lucide-react';

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

interface RewardModalProps {
  onClaim: () => void;
  onClose: () => void;
  canClaim: boolean;
  t: any;
}
const RewardModal: React.FC<RewardModalProps> = ({ onClaim, onClose, canClaim, t }) => (
  <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-[#a855f7] rounded-[32px] p-6 w-full max-w-sm flex flex-col items-center gap-4 shadow-2xl border-[6px] border-white animate-pop">
      <div className="bg-yellow-400 p-4 rounded-full border-4 border-white shadow-lg mb-2">
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
    <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#a855f7] rounded-[32px] p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl border-[6px] border-white animate-pop h-[60vh]">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-black text-white uppercase drop-shadow-md flex items-center gap-2">
            <Trophy className="text-yellow-300" /> {t.highScore}
          </h2>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-black/20 rounded-xl p-2 space-y-2">
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
  <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#a855f7] rounded-[32px] p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl border-[6px] border-white animate-pop">
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
               className={`w-full p-4 rounded-xl flex items-center justify-between border-b-4 transition-all ${currentTrackIdx === i ? 'bg-white text-purple-900 border-purple-200' : 'bg-purple-800 text-white border-purple-900 hover:bg-purple-700'}`}
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
    <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#a855f7] rounded-[32px] p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl border-[6px] border-white animate-pop h-[70vh]">
         <div className="flex justify-between items-center bg-black/20 p-3 rounded-2xl">
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
                <div key={item.id} className="bg-white p-4 rounded-2xl border-b-[6px] border-purple-200 shadow-sm">
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
       <div className="bg-[#a855f7] rounded-[32px] p-8 w-full max-w-sm flex flex-col items-center gap-6 shadow-2xl border-[6px] border-white animate-pop">
          <div className="bg-white p-4 rounded-full shadow-lg">
             <User size={48} className="text-purple-600" />
          </div>
          <h2 className="text-2xl font-black text-white text-center">{t.inputName}</h2>
          
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.inputPlaceholder}
            className="w-full px-6 py-4 rounded-2xl text-center font-black text-xl border-4 border-purple-300 focus:border-yellow-400 outline-none uppercase text-purple-900 placeholder:text-purple-300"
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
     <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#a855f7] rounded-[32px] p-4 w-full max-w-md flex flex-col gap-4 shadow-2xl border-[6px] border-white animate-pop h-[80vh]">
           <div className="flex justify-between items-center px-2">
              <h2 className="text-2xl font-black text-white uppercase drop-shadow-md flex items-center gap-2">
                <Crown className="text-yellow-300" /> {t.selectChar}
              </h2>
              <button onClick={onClose} className="text-white/60 hover:text-white">
                <X size={24} />
              </button>
           </div>
           
           <div className="flex justify-center bg-black/20 rounded-xl p-2 mb-2">
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
                        ${isSelected ? 'bg-white border-yellow-400 ring-2 ring-yellow-300' : 'bg-purple-800 border-purple-900'}
                        ${!isUnlocked && 'opacity-90'}
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
       <div className="bg-[#a855f7] rounded-[32px] p-8 w-full max-w-sm flex flex-col items-center gap-6 shadow-2xl border-[6px] border-white animate-pop text-center">
          <div className="bg-blue-500 p-4 rounded-full shadow-lg border-4 border-white">
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

  // Shop Prices
  const PRICES = {
    HAMMER: 100,
    SHUFFLE: 150,
    BOMB: 200
  };

  // --- Load Data on Mount (Run Once) ---
  useEffect(() => {
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
    const oneDay = 24 * 60 * 60 * 1000;
    return now - lastRewardTime > oneDay;
  };

  const claimReward = () => {
    if (canClaimReward()) {
      const reward = 200; 
      updateCoins(reward);
      const now = Date.now();
      setLastRewardTime(now);
      localStorage.setItem('fbb_last_reward', now.toString());
      SoundManager.play('win');
      setShowRewardModal(false);
    }
  };

  const watchAdForCoins = () => {
    SoundManager.play('click');
    setTimeout(() => {
       updateCoins(50);
       SoundManager.play('win');
    }, 500);
  };

  const getSelectedCharacter = () => {
    return CHARACTERS.find(c => c.id === selectedCharacterId) || CHARACTERS[0];
  };

  // --- Screens ---
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
       <div className="absolute top-safe w-full px-4 flex justify-between items-start z-30 pt-4 pointer-events-none">
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
       <div className="flex-1 w-full flex flex-col items-center justify-between z-10 relative px-6 pb-20 pt-28 max-w-lg mx-auto">
          
          {/* Logo */}
          <div className="flex-1 flex items-center justify-center min-h-0 w-full mb-4">
             <img 
                 src="https://amfnhqsrjrtcdtslpbas.supabase.co/storage/v1/object/public/images/icon-fruitblockblast.png" 
                 alt="Fruit Block Blast" 
                 className="max-h-[35vh] w-auto object-contain drop-shadow-2xl filter animate-pop hover:scale-105 transition-transform duration-500 cursor-pointer"
             />
          </div>
          
          {/* Character Card */}
          <div className="flex-shrink-0 mb-6 relative group z-20">
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

          {/* Start Button & Actions */}
          <div className="w-full max-w-xs flex flex-col gap-6 flex-shrink-0 mb-safe-bottom">
             {/* Start Button */}
             <div className="w-full relative">
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
             <div className="flex justify-center gap-3">
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
    </div>
    );
  };
  
  const renderLevelSelect = () => (
    <div className={`flex flex-col h-full w-full`}>
      <div className="pt-safe px-6 pb-4 flex items-center justify-between z-10">
        <Button variant="icon" size="icon" onClick={() => { SoundManager.play('click'); setScreen('HOME'); }}>
           <Menu size={24} />
        </Button>
        <h2 className="text-4xl font-black text-[#fbbf24] candy-text title-outline tracking-wide">{t.selectLevel}</h2>
        <div className="w-12"></div> 
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4 pb-12 w-full">
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4 max-w-4xl mx-auto">
          {levels.map((level) => (
            <button
              key={level.id}
              disabled={!level.unlocked}
              onClick={() => startLevel(level.id)}
              className={`
                aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all duration-200
                border-b-[4px] shadow-sm
                ${level.unlocked 
                  ? 'bg-gradient-to-br from-purple-400 to-purple-600 border-purple-800 text-white active:translate-y-1 active:shadow-none' 
                  : 'bg-black/20 border-black/10 text-white/40'
                }
              `}
            >
              {level.unlocked ? (
                <>
                  <span className="text-lg md:text-2xl font-black drop-shadow-md font-display">{level.id}</span>
                  <div className="flex gap-0.5 mt-0.5">
                     {[1,2,3].map(s => (
                        <Star key={s} size={8} className={s <= level.stars ? "fill-yellow-300 text-yellow-300" : "text-black/20 fill-black/20"} />
                     ))}
                  </div>
                </>
              ) : (
                <Lock size={16} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ... (Win, GameOver, Modals logic remains the same)
  // Re-use logic for Win/GameOver from previous but ensure w-full and centered 

  const renderWin = () => (
    <div className="flex flex-col items-center justify-center h-full px-6 relative z-50 bg-black/70 backdrop-blur-sm w-full">
       <div className="bg-[#a855f7] rounded-[40px] p-8 w-full max-w-sm flex flex-col items-center shadow-2xl animate-pop border-[6px] border-white ring-8 ring-purple-900/30 relative overflow-visible mt-12">
          
          {topScoreNotification.show && (
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 bg-yellow-400 border-4 border-white shadow-xl rounded-xl p-3 w-64 text-center animate-bounce z-50">
               <h3 className="text-lg font-black text-yellow-900 leading-tight">{t.newRecord}</h3>
               <p className="text-sm font-bold text-yellow-800">{t.bonus}: +{topScoreNotification.amount} 🪙</p>
            </div>
          )}

          <div className="absolute -top-16 left-1/2 -translate-x-1/2">
             <div className="relative">
                <Star size={120} className="fill-yellow-400 text-yellow-600 drop-shadow-lg animate-float" />
                <Star size={80} className="absolute top-8 -left-16 fill-yellow-400 text-yellow-600 drop-shadow-lg scale-90 rotate-[-15deg]" />
                <Star size={80} className="absolute top-8 -right-16 fill-yellow-400 text-yellow-600 drop-shadow-lg scale-90 rotate-[15deg]" />
             </div>
          </div>
          <div className="mt-16 text-center w-full">
             <h2 className="text-5xl font-black text-[#fbbf24] candy-text title-outline mb-1">{t.win}</h2>
             <div className="bg-[#7e22ce] rounded-2xl p-4 mt-4 w-full border-2 border-[#9333ea] shadow-inner">
                <div className="flex justify-between items-end mb-2 border-b border-white/10 pb-2">
                   <span className="text-purple-200 font-bold text-sm">{t.level}</span>
                   <span className="text-2xl font-black text-white">{currentLevelId}</span>
                </div>
                <div className="flex justify-between items-end">
                   <span className="text-purple-200 font-bold text-sm">{t.score}</span>
                   <span className="text-2xl font-black text-yellow-300">{gameResult?.score}</span>
                </div>
             </div>
          </div>
          <div className="flex gap-4 w-full mt-8">
             <Button fullWidth variant="icon" onClick={() => { 
               SoundManager.play('click'); 
               setScreen('HOME'); 
               setTopScoreNotification({show: false, amount: 0});
             }}>
                <Menu size={28} />
             </Button>
             <Button fullWidth variant="start" onClick={() => {
                startLevel(currentLevelId + 1);
                setTopScoreNotification({show: false, amount: 0});
             }}>
                <Play size={32} fill="white" />
             </Button>
          </div>
       </div>
    </div>
  );

  const renderGameOver = () => (
    <div className="flex flex-col items-center justify-center h-full px-6 relative z-50 bg-black/70 backdrop-blur-sm w-full">
       <div className="bg-[#a855f7] rounded-[40px] p-8 w-full max-w-sm flex flex-col items-center shadow-2xl animate-pop border-[6px] border-white ring-8 ring-purple-900/30 relative">
          <div className="absolute -top-12 bg-white rounded-full p-4 shadow-lg border-4 border-purple-200">
             <div className="text-6xl grayscale opacity-80">😢</div>
          </div>
          <h2 className="text-4xl font-black text-[#f87171] candy-text title-outline mt-12 mb-2">{t.gameOver}</h2>
          <div className="bg-black/20 rounded-xl p-3 w-full mb-6 flex justify-between items-center px-6">
              <span className="text-white/70 font-bold">{t.score}</span>
              <span className="text-2xl font-black text-white">{gameResult?.score}</span>
          </div>
          <div className="flex gap-4 w-full">
             <Button fullWidth variant="icon" onClick={() => { SoundManager.play('click'); setScreen('HOME'); }}>
                <Menu size={28} />
             </Button>
             <Button fullWidth variant="start" onClick={() => startLevel(currentLevelId)}>
                <RefreshCw size={28} />
             </Button>
          </div>
       </div>
    </div>
  );

  return (
    // Changed: Moved background to outer div, removed max-w-[600px] from inner div
    <div className={`w-screen h-screen overflow-hidden font-sans select-none text-slate-800 flex items-center justify-center ${COLORS.background}`}>
      <div className={`w-full h-full relative overflow-hidden`}>
        {screen === 'SPLASH' && renderSplash()}
        {screen === 'HOME' && renderHome()}
        {screen === 'LEVEL_SELECT' && renderLevelSelect()}
        {screen === 'GAME' && (
          <GameScreen 
            level={levels.find(l => l.id === currentLevelId)!} 
            bestScore={0} 
            onWin={handleWin}
            onGameOver={handleGameOver}
            onExit={() => { 
                SoundManager.play('click'); 
                setScreen('LEVEL_SELECT'); 
                MusicManager.playThemeForCharacter(selectedCharacterId);
            }}
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
        
        {showRewardModal && (
          <RewardModal 
            onClaim={claimReward} 
            onClose={() => setShowRewardModal(false)}
            canClaim={canClaimReward()}
            t={t}
          />
        )}
        {showHighscoreModal && (
          <HighscoreModal 
            onClose={() => setShowHighscoreModal(false)}
            t={t}
          />
        )}
        {showMusicModal && (
          <MusicModal 
            onClose={() => setShowMusicModal(false)}
            currentTrackIdx={currentTrackIdx}
            onSelect={selectMusic}
            t={t}
          />
        )}
        {showShopModal && (
          <ShopModal 
            onClose={() => setShowShopModal(false)}
            coins={coins}
            boosters={boosters}
            onBuy={buyBooster}
            onWatchAd={watchAdForCoins}
            t={t}
          />
        )}
        {showUsernameModal && (
          <UsernameModal 
            onSave={saveUsername}
            currentName={username}
            t={t}
            onClose={() => setShowUsernameModal(false)}
          />
        )}
        {showCharacterModal && (
          <CharacterModal 
            onClose={() => setShowCharacterModal(false)}
            characters={CHARACTERS}
            unlockedIds={unlockedCharacterIds}
            selectedId={selectedCharacterId}
            coins={coins}
            onUnlock={unlockCharacter}
            onSelect={selectCharacter}
            t={t}
          />
        )}
        {showPermissionModal && (
          <PermissionModal 
            onRequest={requestPermissions}
            t={t}
            onClose={() => setShowPermissionModal(false)}
          />
        )}
      </div>
    </div>
  );
};