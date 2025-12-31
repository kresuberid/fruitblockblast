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
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 12 : 20;
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
    // Fix: Read from localStorage or a Ref to ensure we get the latest language in the interval closure
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

  // --- SUPABASE LEADERBOARD LOGIC: UPSERT (One User One Score) ---
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

      // 2. UPSERT: Insert or Update if higher
      // Relies on UNIQUE constraint on 'username' in database
      // The query below effectively says:
      // "Insert this row. If username exists, DO NOTHING (ignore)."
      // Wait, we need to UPDATE if score is higher. 
      // Supabase .upsert() handles this. We need to fetch current first or rely on Postgres trigger?
      // Simplest robust method for frontend-only call without custom pg functions:
      
      const { data: existingUser } = await supabase
         .from('leaderboard')
         .select('id, score')
         .eq('username', user)
         .maybeSingle();

      if (existingUser) {
         // Update only if new score is higher
         if (score > existingUser.score) {
            await supabase
               .from('leaderboard')
               .update({ score: score, created_at: new Date().toISOString() })
               .eq('id', existingUser.id);
         }
      } else {
         // Insert new record
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
    <div className={`flex flex-col items-center justify-center h-full relative overflow-hidden ${COLORS.background} w-full`}>
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
    // Use Translation Lookup
    const activeCharName = t.characters[activeChar.id as keyof typeof t.characters]?.name || "Hero";
    
    return (
    <div className={`flex flex-col items-center h-full relative overflow-hidden ${COLORS.background} w-full`}>
       <FloatingBackground />
       <div className="absolute bottom-0 w-full h-48 pointer-events-none z-0">
          <div className="cloud-shape absolute bottom-[-50px] left-[-50px] w-60 h-60"></div>
          <div className="cloud-shape absolute bottom-[-30px] right-[-50px] w-64 h-64"></div>
       </div>

       {/* Top Bar Area - Absolute to keep immersive feel, but ensure z-index */}
       <div className="absolute top-safe w-full px-4 flex justify-between items-start z-30 pt-4">
           {/* Install PWA Button (Left) */}
           <div className="flex flex-col gap-2">
             {showInstallButton && (
                <div className="animate-bounce">
                   <Button size="sm" variant="accent" onClick={handleInstallClick} className="!p-2 !rounded-full shadow-lg">
                      <Download size={20} />
                   </Button>
                </div>
             )}
           </div>

           {/* Right Side: Coins & User */}
           <div className="flex flex-col gap-2 items-end">
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
       
       {/* Lang Switcher - Top Center Absolute */}
       <div className="absolute top-safe w-full flex justify-center mt-16 z-20 pointer-events-none">
          <button 
            onClick={toggleLanguage}
            className="bg-white/30 backdrop-blur px-3 py-1 rounded-full text-white font-black text-xs border border-white/40 flex items-center gap-1 hover:bg-white/40 transition-all pointer-events-auto shadow-sm"
          >
            <Globe size={12} /> {language}
          </button>
       </div>

       {/* Main Content Area - Use Flex-1 to fill space between top and bottom */}
       <div className="flex-1 w-full flex flex-col items-center justify-between z-10 relative px-6 pb-20 pt-28">
          
          {/* Logo - Responsive Height (Uses available space) */}
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
    <div className={`flex flex-col h-full ${COLORS.background} w-full`}>
      <div className="pt-safe px-6 pb-4 flex items-center justify-between z-10">
        <Button variant="icon" size="icon" onClick={() => { SoundManager.play('click'); setScreen('HOME'); }}>
           <Menu size={24} />
        </Button>
        <h2 className="text-4xl font-black text-[#fbbf24] candy-text title-outline tracking-wide">{t.selectLevel}</h2>
        <div className="w-12"></div> 
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4 pb-12 w-full">
        <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
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

  // --- Modals ---

  const HighscoreModal = () => {
    const [leaderboardData, setLeaderboardData] = useState<HighScoreEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchLeaderboard = async () => {
        setLoading(true);
        try {
          // Fetch records. Supabase will return only valid rows.
          const { data, error } = await supabase
            .from('leaderboard')
            .select('username, score')
            .order('score', { ascending: false })
            .limit(20);

          if (error) throw error;
          
          if (data) {
             setLeaderboardData(data);
          }
        } catch (error) {
          console.error("Error fetching leaderboard:", error);
        } finally {
          setLoading(false);
        }
      };
      
      if (showHighscoreModal) {
        fetchLeaderboard();
      }
    }, [showHighscoreModal]);

    const getRankStyle = (idx: number) => {
        if (idx === 0) return "bg-gradient-to-r from-yellow-200 to-yellow-400 border-yellow-500 ring-4 ring-yellow-200/50 shadow-xl scale-105 my-2";
        if (idx === 1) return "bg-gradient-to-r from-gray-200 to-gray-300 border-gray-400 ring-2 ring-gray-200/50 shadow-lg";
        if (idx === 2) return "bg-gradient-to-r from-orange-200 to-orange-300 border-orange-400 ring-2 ring-orange-200/50 shadow-lg";
        return "bg-white border-blue-100 shadow-sm";
    };

    return (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-[40px] p-6 w-full max-w-sm flex flex-col items-center shadow-2xl animate-pop relative border-[8px] border-[#3b82f6]">
          <button 
            onClick={() => setShowHighscoreModal(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X size={28} />
          </button>

          <Trophy size={48} className="text-yellow-400 fill-yellow-400 mb-2 drop-shadow-md" />
          <h2 className="text-3xl font-black text-[#3b82f6] mb-6 font-display candy-text-sm text-center">{t.kingTitle}</h2>
          
          <div className="w-full bg-blue-50 rounded-2xl p-4 mb-6 border-2 border-blue-100 min-h-[300px] overflow-y-auto max-h-[50vh]">
            {loading ? (
               <div className="h-full flex flex-col items-center justify-center text-blue-300 gap-2 min-h-[200px]">
                  <RefreshCw size={32} className="animate-spin" />
                  <p className="font-bold">{t.loading}</p>
               </div>
            ) : leaderboardData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-blue-300 gap-2 min-h-[200px]">
                <Award size={32} />
                <p className="font-bold">{t.noData}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {leaderboardData.map((entry, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${getRankStyle(idx)}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-white shrink-0 shadow-sm 
                        ${idx === 0 ? 'bg-yellow-500 text-lg' : idx === 1 ? 'bg-gray-500' : idx === 2 ? 'bg-orange-600' : 'bg-blue-300'}`}>
                        {idx + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-sm font-black truncate max-w-[100px] uppercase ${idx === 0 ? 'text-yellow-900' : 'text-gray-700'}`}>
                            {entry.username}
                        </span>
                        {idx === 0 && <span className="text-[9px] font-bold text-yellow-700 flex items-center gap-1"><Crown size={10} /> {t.kingTitle}</span>}
                      </div>
                    </div>
                    <span className={`text-xl font-black ${idx === 0 ? 'text-yellow-800' : 'text-blue-600'}`}>{entry.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button variant="secondary" fullWidth onClick={() => setShowHighscoreModal(false)}>{t.close}</Button>
        </div>
      </div>
    );
  };

  const PermissionModal = () => (
    <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] p-8 w-full max-w-sm flex flex-col items-center shadow-2xl animate-pop border-[8px] border-[#a855f7]">
        <Bell size={60} className="text-[#a855f7] mb-4" />
        <h2 className="text-2xl font-black text-[#a855f7] mb-4 font-display text-center">{t.permissionTitle}</h2>
        <p className="text-gray-500 font-bold mb-6 text-center text-sm">{t.permissionDesc}</p>
        <Button variant="start" fullWidth onClick={requestPermissions}>
          {t.allow}
        </Button>
      </div>
    </div>
  );

  const CharacterModal = () => (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] p-4 w-full max-w-md flex flex-col items-center shadow-2xl animate-pop relative border-[8px] border-purple-500 h-[80vh]">
        <button 
          onClick={() => setShowCharacterModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <X size={28} />
        </button>

        <h2 className="text-2xl font-black text-purple-600 mb-2 font-display candy-text-sm text-center mt-2">{t.selectChar}</h2>
        <div className="flex items-center gap-2 mb-4 bg-yellow-100 px-4 py-1 rounded-full border border-yellow-300">
           <Coins size={16} className="text-yellow-600" />
           <span className="font-bold text-yellow-800">{coins}</span>
        </div>

        <div className="w-full flex-1 overflow-y-auto grid grid-cols-4 gap-2 p-2">
           {CHARACTERS.map((char) => {
             const isUnlocked = unlockedCharacterIds.includes(char.id);
             const isSelected = selectedCharacterId === char.id;
             // Use Translation Lookup
             const displayName = t.characters[char.id as keyof typeof t.characters]?.name || "Hero";

             return (
                <div 
                  key={char.id} 
                  onClick={() => isUnlocked ? selectCharacter(char.id) : unlockCharacter(char.id, char.price)}
                  className={`
                     aspect-[3/4] rounded-xl flex flex-col items-center justify-between p-1 relative transition-transform
                     ${isSelected ? 'ring-4 ring-green-500 scale-105 z-10 shadow-lg' : ''}
                     ${isUnlocked ? 'bg-gray-50 border border-gray-200 cursor-pointer active:scale-95' : 'bg-gray-200 border border-gray-300'}
                  `}
                >
                   {isSelected && <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5"><Check size={10} className="text-white" /></div>}
                   {!isUnlocked && (
                     <div className="absolute inset-0 bg-black/40 rounded-xl flex flex-col items-center justify-center z-20">
                        <LockIcon size={20} className="text-white mb-1" />
                        <span className="text-white text-[10px] font-bold bg-black/50 px-1 rounded">{char.price}</span>
                     </div>
                   )}
                   
                   <div className={`w-full aspect-square ${char.color} rounded-lg flex items-center justify-center relative shadow-inner overflow-hidden`}>
                      <span className="text-2xl z-10">{char.icon}</span>
                      <span className="absolute bottom-1 right-1 text-xs">{char.accessory}</span>
                      <div className="absolute top-[35%] left-[25%] w-1 h-1 bg-black rounded-full z-10"></div>
                      <div className="absolute top-[35%] right-[25%] w-1 h-1 bg-black rounded-full z-10"></div>
                   </div>
                   
                   <div className="text-center w-full">
                      <div className="text-[9px] font-bold leading-tight truncate px-0.5">{displayName}</div>
                   </div>
                </div>
             );
           })}
        </div>
        
        <div className="w-full bg-gray-50 p-3 rounded-xl mt-2 border border-gray-200">
           {(() => {
              const current = CHARACTERS.find(c => c.id === selectedCharacterId);
              if (!current) return null;
              
              const displayName = t.characters[current.id as keyof typeof t.characters]?.name || "Hero";
              const displayDesc = t.characters[current.id as keyof typeof t.characters]?.desc || "Hero";

              return (
                 <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${current.color} rounded-lg flex items-center justify-center text-2xl border-2 border-white shadow-sm`}>
                       {current.icon}
                    </div>
                    <div className="flex flex-col">
                       <span className="font-bold text-sm text-gray-800">{displayName}</span>
                       <span className="text-xs text-purple-600 font-bold">{displayDesc}</span>
                    </div>
                 </div>
              );
           })()}
        </div>

      </div>
    </div>
  );

  const UsernameModal = () => {
    const [inputValue, setInputValue] = useState(username || "");

    return (
      <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white rounded-[40px] p-8 w-full max-w-sm flex flex-col items-center shadow-2xl animate-pop relative border-[8px] border-[#a855f7]">
          <h2 className="text-3xl font-black text-[#a855f7] mb-4 font-display text-center">{t.inputName}</h2>
          
          <input 
            type="text"
            maxLength={12}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            placeholder={t.inputPlaceholder}
            className="w-full bg-gray-100 border-4 border-gray-300 rounded-2xl px-4 py-3 text-xl font-black text-center text-gray-700 outline-none focus:border-[#a855f7] focus:bg-white transition-colors mb-6 uppercase"
          />

          <Button variant="start" fullWidth onClick={() => saveUsername(inputValue)}>
            {t.save}
          </Button>
        </div>
      </div>
    );
  };

  const ShopModal = () => (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] p-6 w-full max-w-sm flex flex-col items-center shadow-2xl animate-pop relative border-[8px] border-purple-500">
        <button 
          onClick={() => setShowShopModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={28} />
        </button>

        <div className="flex items-center gap-2 mb-2">
           <ShoppingCart size={32} className="text-purple-500" />
           <h2 className="text-3xl font-black text-purple-500 font-display candy-text-sm">{t.shop}</h2>
        </div>

        <div className="bg-yellow-100 rounded-full px-6 py-2 border-4 border-yellow-300 flex items-center gap-2 mb-6">
           <Coins size={24} className="text-yellow-500 fill-yellow-500" />
           <span className="text-2xl font-black text-yellow-600">{coins}</span>
        </div>
        
        <div className="w-full flex flex-col gap-3 mb-4 overflow-y-auto max-h-[50vh]">
          <div className="w-full p-3 rounded-2xl bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 flex justify-between items-center shadow-sm">
             <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white shadow-md">
                   <Video size={24} />
                </div>
                <div className="flex flex-col items-start">
                   <span className="font-black text-green-700 leading-tight">{t.freeCoins}</span>
                   <span className="text-xs font-bold text-green-600">{t.watchAd}</span>
                </div>
             </div>
             <Button size="sm" onClick={watchAdForCoins} className="!px-3 !py-1 !bg-green-500 !border-green-700">
               +50 🪙
             </Button>
          </div>

          {[
            { id: 'HAMMER' as const, name: t.hammer, icon: <Hammer />, price: PRICES.HAMMER, desc: t.hammerDesc, color: 'blue' },
            { id: 'SHUFFLE' as const, name: t.shuffle, icon: <Shuffle />, price: PRICES.SHUFFLE, desc: t.shuffleDesc, color: 'emerald' },
            { id: 'BOMB' as const, name: t.bomb, icon: <Bomb />, price: PRICES.BOMB, desc: t.bombDesc, color: 'rose' },
          ].map(item => (
             <div key={item.id} className="w-full p-3 rounded-2xl bg-gray-50 border-2 border-gray-200 flex justify-between items-center relative overflow-hidden">
                <div className="flex items-center gap-3 relative z-10">
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md bg-${item.color}-500`}>
                      {item.icon}
                   </div>
                   <div className="flex flex-col items-start">
                      <span className="font-black text-gray-700 leading-tight">{item.name}</span>
                      <span className="text-xs font-bold text-gray-400">{item.desc}</span>
                      <span className="text-xs font-black text-purple-500 mt-0.5">{t.buy} {boosters[item.id]}</span>
                   </div>
                </div>
                <Button 
                   size="sm" 
                   disabled={coins < item.price}
                   onClick={() => buyBooster(item.id)} 
                   className={coins < item.price ? "!bg-gray-400 !border-gray-600 opacity-50" : "!bg-yellow-400 !border-yellow-600 !text-yellow-900"}
                >
                   {item.price} 🪙
                </Button>
             </div>
          ))}
        </div>

        <Button variant="secondary" fullWidth onClick={() => setShowShopModal(false)}>{t.close}</Button>
      </div>
    </div>
  );

  const RewardModal = () => (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] p-8 w-full max-w-sm flex flex-col items-center shadow-2xl animate-pop relative border-[8px] border-green-500">
        <button 
          onClick={() => setShowRewardModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={28} />
        </button>

        <Gift size={64} className="text-green-500 mb-4 animate-bounce" />
        <h2 className="text-3xl font-black text-green-500 mb-2 font-display candy-text-sm text-center">{t.rewardTitle}</h2>
        
        {canClaimReward() ? (
           <>
             <p className="text-gray-600 font-bold mb-6 text-center text-lg">+200 🪙</p>
             <Button variant="primary" fullWidth onClick={claimReward}>
               {t.claim}
             </Button>
           </>
        ) : (
           <div className="bg-gray-100 rounded-xl p-4 text-center w-full">
              <p className="text-gray-500 font-bold mb-1">{t.claimed}</p>
              <p className="text-gray-400 text-sm">{t.comeBack}</p>
           </div>
        )}
      </div>
    </div>
  );

  const MusicModal = () => (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] p-6 w-full max-w-sm flex flex-col items-center shadow-2xl animate-pop relative border-[8px] border-pink-500">
        <button 
          onClick={() => setShowMusicModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={28} />
        </button>

        <div className="flex items-center gap-2 mb-6">
           <Music size={32} className="text-pink-500" />
           <h2 className="text-3xl font-black text-pink-500 font-display candy-text-sm">{t.music}</h2>
        </div>

        <div className="w-full flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
           {MusicManager.tracks.map((track, idx) => (
             <button
               key={idx}
               onClick={() => selectMusic(idx)}
               className={`
                  w-full p-3 rounded-xl flex items-center justify-between transition-all border-2
                  ${currentTrackIdx === idx 
                    ? 'bg-pink-100 border-pink-400 shadow-inner' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                  }
               `}
             >
                <div className="flex items-center gap-3">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentTrackIdx === idx ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      {currentTrackIdx === idx ? <Volume2 size={16} /> : <span className="font-bold text-xs">{idx + 1}</span>}
                   </div>
                   <span className={`font-bold ${currentTrackIdx === idx ? 'text-pink-700' : 'text-gray-600'}`}>
                      {t.tracks[track.name as keyof typeof t.tracks] || track.name}
                   </span>
                </div>
                {currentTrackIdx === idx && <Check size={20} className="text-pink-500" />}
             </button>
           ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`w-screen h-screen overflow-hidden font-sans select-none text-slate-800 flex items-center justify-center`}>
      <div className="w-full h-full max-w-[600px] relative shadow-2xl overflow-hidden bg-white">
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
        
        {showRewardModal && <RewardModal />}
        {showHighscoreModal && <HighscoreModal />}
        {showMusicModal && <MusicModal />}
        {showShopModal && <ShopModal />}
        {showUsernameModal && <UsernameModal />}
        {showCharacterModal && <CharacterModal />}
        {showPermissionModal && <PermissionModal />}
      </div>
    </div>
  );
};