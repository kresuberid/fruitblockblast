
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

    // Check permissions on load
    if (Notification.permission === 'default') {
      // We will show the modal after splash
    }

    // Hourly Notification Logic
    const notificationInterval = setInterval(() => {
       if (Notification.permission === 'granted') {
          new Notification("Fruit Block Blast", {
            body: language === 'ID' ? "🏆 Ada skor baru di papan peringkat! Ayo cek!" : "🏆 New high score on leaderboard! Check it out!",
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
    const cleanName = name.trim().toUpperCase().slice(0, 12) || "PLAYER";
    setUsername(cleanName);
    localStorage.setItem('fbb_username', cleanName);
    setShowUsernameModal(false);
    SoundManager.play('win');
    MusicManager.start();
  };

  // --- SUPABASE LEADERBOARD LOGIC: ONE USER ONE SCORE ---
  const saveScoreToSupabase = async (score: number) => {
    const user = username || 'PLAYER';
    try {
      // 1. Global Top Check for Notification
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

      // 2. Insert or Update logic (Strict Unique Constraint Handling)
      // Check if user exists
      const { data: existingUser } = await supabase
         .from('leaderboard')
         .select('id, score')
         .eq('username', user)
         .maybeSingle(); // Use maybeSingle to handle 0 or 1 row gracefully

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
         // If a race condition happens (constraint violation), this might throw error, which we catch
         await supabase
            .from('leaderboard')
            .insert([{ username: user, score: score }]);
      }
      
    } catch (e) {
      console.error('Connection error or duplicate key ignored:', e);
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
       <div className="flex flex-col items-center gap-0 animate-pop">
          <h1 className="text-6xl font-black text-[#ec4899] candy-text title-outline tracking-wider rotate-[-3deg]">FRUIT</h1>
          <h1 className="text-6xl font-black text-[#fbbf24] candy-text title-outline tracking-wider rotate-[2deg] -mt-2">BLOCK</h1>
          <h1 className="text-6xl font-black text-[#3b82f6] candy-text title-outline tracking-wider rotate-[-2deg] -mt-2">BLAST</h1>
       </div>
    </div>
  );

  const renderHome = () => {
    const activeChar = getSelectedCharacter();
    
    return (
    <div className={`flex flex-col items-center h-full relative overflow-hidden ${COLORS.background} w-full`}>
       <FloatingBackground />
       <div className="absolute bottom-0 w-full h-48 pointer-events-none z-0">
          <div className="cloud-shape absolute bottom-[-50px] left-[-50px] w-60 h-60"></div>
          <div className="cloud-shape absolute bottom-[-30px] right-[-50px] w-64 h-64"></div>
       </div>

       {/* Top Bar Items */}
       <div className="absolute top-safe left-4 right-4 flex justify-between items-center z-20">
           {/* Coin */}
           <div 
             className="bg-black/20 backdrop-blur-md pl-4 pr-1 py-1 rounded-full flex items-center gap-2 border-2 border-white/20 cursor-pointer hover:bg-black/30 transition-colors active:scale-95"
             onClick={() => { SoundManager.play('click'); setShowShopModal(true); }}
           >
              <Coins size={20} className="text-yellow-400 fill-yellow-400" />
              <span className="text-white font-black text-lg mr-2">{coins}</span>
              <div className="bg-green-500 rounded-full p-1">
                 <ShoppingCart size={14} className="text-white" />
              </div>
           </div>

           {/* User */}
           <div 
              className="bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border-2 border-white/20 cursor-pointer hover:bg-black/30 transition-colors active:scale-95"
              onClick={() => { SoundManager.play('click'); setShowUsernameModal(true); }}
           >
              <User size={18} className="text-white" />
              <span className="text-white font-black text-sm max-w-[100px] truncate">{username || "PLAYER"}</span>
           </div>
       </div>
       
       {/* Lang Switcher - Top Center underneath */}
       <button 
         onClick={toggleLanguage}
         className="absolute top-safe mt-12 z-20 bg-white/30 backdrop-blur px-3 py-1 rounded-full text-white font-black text-xs border border-white/40 flex items-center gap-1 hover:bg-white/40 transition-all"
       >
         <Globe size={12} /> {language}
       </button>

       {/* Install PWA Button - Floating Left */}
       {showInstallButton && (
          <div className="absolute top-safe mt-24 left-4 z-20 animate-bounce">
             <Button size="sm" variant="accent" onClick={handleInstallClick} className="!p-2 !rounded-full">
                <Download size={20} />
             </Button>
          </div>
       )}

       <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md z-10 relative mt-[-20px]">
          <div className="flex flex-col items-center gap-0 mb-6 animate-pop hover:scale-105 transition-transform duration-500 cursor-pointer">
             <h1 className="text-7xl font-black text-[#ec4899] candy-text title-outline drop-shadow-xl rotate-[-3deg] z-30">FRUIT</h1>
             <h1 className="text-7xl font-black text-[#fbbf24] candy-text title-outline drop-shadow-xl rotate-[2deg] z-20 -mt-5">BLOCK</h1>
             <h1 className="text-7xl font-black text-[#3b82f6] candy-text title-outline drop-shadow-xl rotate-[-2deg] z-10 -mt-5">BLAST</h1>
          </div>
          
          <div 
            className="mb-8 cursor-pointer relative group"
            onClick={() => { SoundManager.play('click'); setShowCharacterModal(true); }}
          >
             <div className="absolute inset-0 bg-white/30 rounded-full blur-xl scale-125 animate-pulse group-hover:scale-150 transition-transform"></div>
             <div className={`w-32 h-32 ${activeChar.color} rounded-3xl flex items-center justify-center shadow-[0_10px_0_rgba(0,0,0,0.2)] border-4 border-white relative transform transition-transform group-hover:-translate-y-2 group-active:translate-y-0 group-active:shadow-none`}>
                <div className="text-6xl drop-shadow-md z-10 grayscale-0">
                   {activeChar.icon}
                </div>
                <div className="absolute top-[35%] left-[25%] w-2 h-2 bg-black rounded-full z-20 animate-blink"></div>
                <div className="absolute top-[35%] right-[25%] w-2 h-2 bg-black rounded-full z-20 animate-blink"></div>
                <div className="absolute -bottom-2 -right-2 text-4xl filter drop-shadow-lg transform rotate-12">{activeChar.accessory}</div>
                
                <div className="absolute -top-3 -right-3 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white animate-bounce">
                   {t.change}
                </div>
             </div>
             <div className="mt-4 text-center">
                <div className="bg-black/40 backdrop-blur-sm px-4 py-1 rounded-full border border-white/20 inline-block">
                   <span className="text-white font-bold text-sm shadow-black drop-shadow-md">{activeChar.name}</span>
                </div>
             </div>
          </div>

          <div className="w-64 mb-10 relative">
             <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-40 animate-pulse"></div>
             <Button 
               variant="start" 
               size="xl" 
               onClick={() => { 
                 SoundManager.play('click'); 
                 setScreen('LEVEL_SELECT'); 
               }} 
               className="w-full shadow-2xl hover:scale-105 active:scale-95 transition-transform z-10"
             >
               {t.start}
             </Button>
          </div>

          <div className="flex gap-4">
             <div className="relative">
                <Button variant="icon" size="icon" onClick={() => { SoundManager.play('click'); setShowRewardModal(true); }}>
                    <Gift size={24} className={canClaimReward() ? "animate-bounce" : ""} />
                </Button>
                {canClaimReward() && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />}
             </div>
             
             <Button variant="icon" size="icon" onClick={() => { SoundManager.play('click'); setShowHighscoreModal(true); }}>
                <Trophy size={24} />
             </Button>
             
             <Button variant="icon" size="icon" onClick={() => { SoundManager.play('click'); setShowShopModal(true); }}>
                <ShoppingCart size={24} />
             </Button>

             <Button variant="icon" size="icon" onClick={() => { SoundManager.play('click'); setShowMusicModal(true); }}>
                <Music size={24} />
             </Button>

             <Button variant="icon" size="icon" onClick={toggleAudio}>
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
             </Button>
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
          <h2 className="text-3xl font-black text-[#3b82f6] mb-6 font-display candy-text-sm text-center">{t.highScore}</h2>
          
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
                        {idx === 0 && <span className="text-[9px] font-bold text-yellow-700 flex items-center gap-1"><Crown size={10} /> RAJA BUAH</span>}
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
                      <div className="text-[9px] font-bold leading-tight truncate px-0.5">{char.name}</div>
                   </div>
                </div>
             );
           })}
        </div>
        
        <div className="w-full bg-gray-50 p-3 rounded-xl mt-2 border border-gray-200">
           {(() => {
              const current = CHARACTERS.find(c => c.id === selectedCharacterId);
              return current ? (
                 <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${current.color} rounded-lg flex items-center justify-center text-2xl border-2 border-white shadow-sm`}>
                       {current.icon}
                    </div>
                    <div className="flex flex-col">
                       <span className="font-bold text-sm text-gray-800">{current.name}</span>
                       <span className="text-xs text-purple-600 font-bold">{current.description}</span>
                    </div>
                 </div>
              ) : null;
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
      <div className="bg-white rounded-[40px] p-8 w-full max-w-sm flex flex-col items-center shadow-2xl animate-pop relative border-[8px] border-yellow-400">
        <button 
          onClick={() => setShowRewardModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={28} />
        </button>

        <div className="relative mb-6">
           <div className="absolute inset-0 bg-yellow-300 blur-2xl opacity-50 animate-pulse rounded-full"></div>
           <Gift size={80} className="text-red-500 drop-shadow-lg relative z-10 animate-bounce" />
        </div>
        
        <h2 className="text-3xl font-black text-yellow-500 mb-2 font-display candy-text-sm text-center">{t.rewardTitle}</h2>

        {canClaimReward() ? (
           <Button variant="start" size="lg" fullWidth onClick={claimReward} className="animate-pulse">
             {t.claim} 200 🪙
           </Button>
        ) : (
           <div className="flex flex-col items-center w-full">
              <div className="bg-gray-100 rounded-xl p-4 w-full text-center mb-4 border-2 border-gray-200">
                 <p className="text-gray-400 font-bold">{t.claimed}</p>
                 <p className="text-xs text-gray-400 mt-1">{t.comeBack}</p>
              </div>
              <Button variant="secondary" fullWidth onClick={() => setShowRewardModal(false)}>{t.close}</Button>
           </div>
        )}
      </div>
    </div>
  );

  const MusicModal = () => (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] p-6 w-full max-w-sm flex flex-col items-center shadow-2xl animate-pop relative border-[8px] border-green-500">
        <button 
          onClick={() => setShowMusicModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={28} />
        </button>

        <Music size={48} className="text-green-500 fill-green-500 mb-2 drop-shadow-md" />
        <h2 className="text-3xl font-black text-green-500 mb-6 font-display candy-text-sm text-center">{t.music}</h2>
        
        <div className="w-full flex flex-col gap-3 mb-6">
          {MusicManager.tracks.map((track, idx) => (
            <button
              key={idx}
              onClick={() => selectMusic(idx)}
              className={`
                w-full p-4 rounded-xl font-bold text-lg flex justify-between items-center transition-all border-b-4
                ${currentTrackIdx === idx 
                  ? 'bg-green-500 text-white border-green-700 shadow-md transform scale-105' 
                  : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'}
              `}
            >
              <span>{track.name}</span>
              {currentTrackIdx === idx && <Music size={20} className="animate-bounce" />}
            </button>
          ))}
        </div>

        <Button variant="secondary" fullWidth onClick={() => setShowMusicModal(false)}>{t.close}</Button>
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
