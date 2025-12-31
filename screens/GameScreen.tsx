
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameStats, LevelData, Cell, GridType, DraggableBlock, BoosterType, Boosters, Character } from '../types';
import { GRID_SIZE, FRUITS, FRUIT_COLORS, POINTS } from '../constants';
import { createEmptyGrid, canPlaceBlock, placeBlock, checkLines, generateBlocks, checkGameOver, isGridEmpty, rotateMatrix } from '../utils/gameLogic';
import { SoundManager, MusicManager } from '../utils/audio';
import { Button } from '../components/Button';
import { TRANSLATIONS, LangType } from '../utils/i18n';
import { Pause, Bomb, Hammer, Shuffle, ChevronLeft, RotateCcw, Home, Target, RotateCw, Plus } from 'lucide-react';

// --- Particle System Component ---
interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  emoji: string;
  life: number;
  target?: { x: number, y: number }; 
}

const ParticleSystem: React.FC<{ particles: Particle[] }> = ({ particles }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map(p => (
        <div 
          key={p.id}
          className="absolute text-2xl transition-transform"
          style={{ 
            left: p.x, 
            top: p.y, 
            opacity: p.life,
            transform: `scale(${p.life})`
          }}
        >
          {p.emoji}
        </div>
      ))}
    </div>
  );
};

// --- Praise / Compliment Text Component ---
const PraiseText: React.FC<{ text: string | null, isMajor?: boolean }> = ({ text, isMajor }) => {
  if (!text) return null;
  return (
    <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-none w-full text-center">
       <div className={`
          font-black candy-text animate-pop rotate-[-6deg] font-display
          ${isMajor ? 'text-7xl md:text-8xl text-yellow-300 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]' : 'text-5xl md:text-7xl text-white'}
       `}>
          {text}
       </div>
    </div>
  );
};

interface GameScreenProps {
  level: LevelData;
  bestScore: number;
  onWin: (score: number, stars: number) => void;
  onGameOver: (score: number) => void;
  onExit: () => void;
  onAddCoins: (amount: number) => void;
  boosters: Boosters;
  onConsumeBooster: (type: BoosterType) => boolean;
  onBuyBooster: (type: BoosterType) => boolean;
  coins: number;
  character: Character;
  lang: LangType;
}

export const GameScreen: React.FC<GameScreenProps> = ({ level, bestScore, onWin, onGameOver, onExit, onAddCoins, boosters, onConsumeBooster, onBuyBooster, coins, character, lang }) => {
  const t = TRANSLATIONS[lang];
  // Game Logic State
  const [grid, setGrid] = useState<GridType>(createEmptyGrid());
  const [blocks, setBlocks] = useState<DraggableBlock[]>([]);
  const [score, setScore] = useState(0);
  const [linesCleared, setLinesCleared] = useState(0);
  const [activeBooster, setActiveBooster] = useState<BoosterType | null>(null);
  
  // UI State
  const [showPause, setShowPause] = useState(false);
  const [praiseMessage, setPraiseMessage] = useState<{text: string, isMajor: boolean} | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  
  // Interaction State
  const [draggingBlock, setDraggingBlock] = useState<{ block: DraggableBlock; x: number; y: number } | null>(null);
  const [previewPlacement, setPreviewPlacement] = useState<{ r: number; c: number } | null>(null);
  
  // Track drag vs tap
  const [dragStartTime, setDragStartTime] = useState<number>(0);
  const [dragStartPos, setDragStartPos] = useState<{x: number, y: number} | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const coinRef = useRef<HTMLDivElement>(null); 
  const praiseTimerRef = useRef<number | null>(null);

  // Constants for Dragging
  const DRAG_Y_OFFSET = 100;

  // Initialize
  useEffect(() => {
    setGrid(createEmptyGrid());
    setBlocks(generateBlocks(level.id)); 
    setScore(0);
    setLinesCleared(0);
    
    // Animation loop for particles
    let animId: number;
    const updateParticles = () => {
      setParticles(prev => prev.map(p => {
        let newX = p.x;
        let newY = p.y;
        let newVx = p.vx;
        let newVy = p.vy;
        let newLife = p.life;

        if (p.target) {
          const dx = p.target.x - p.x;
          const dy = p.target.y - p.y;
          newX += dx * 0.15;
          newY += dy * 0.15;
          
          if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
            newLife = 0;
          } else {
            newLife -= 0.005; 
          }
        } else {
           newX += newVx;
           newY += newVy;
           newVy += 0.5; // Gravity
           newLife -= 0.02;
        }

        return {
          ...p,
          x: newX,
          y: newY,
          vx: newVx,
          vy: newVy,
          life: newLife
        };
      }).filter(p => p.life > 0));
      animId = requestAnimationFrame(updateParticles);
    };
    animId = requestAnimationFrame(updateParticles);
    return () => cancelAnimationFrame(animId);
  }, [level]);

  // Handle Game Over / Refill
  useEffect(() => {
    if (blocks.length > 0 && blocks.every(b => b.used)) {
      setTimeout(() => setBlocks(generateBlocks(level.id)), 300);
    } else if (blocks.length > 0 && !blocks.every(b => b.used)) {
       if (checkGameOver(grid, blocks)) {
         setTimeout(() => onGameOver(score), 1000);
       }
    }
  }, [blocks, grid, onGameOver, score, level.id]);

  // Particle Spawner
  const spawnParticles = (r: number, c: number, color: string, fruit: string) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const cellSize = rect.width / GRID_SIZE;
    const startX = rect.left + (c * cellSize) + (cellSize / 2);
    const startY = rect.top + (r * cellSize) + (cellSize / 2);

    const newParticles: Particle[] = Array.from({ length: 5 }, () => ({
      id: Math.random(),
      x: startX,
      y: startY,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10 - 5,
      color,
      emoji: Math.random() > 0.5 ? fruit : '✨',
      life: 1.0
    }));

    setParticles(prev => [...prev, ...newParticles]);
  };

  const triggerAllClearEffect = () => {
    if (!gridRef.current || !coinRef.current) return;
    
    const gridRect = gridRef.current.getBoundingClientRect();
    const coinRect = coinRef.current.getBoundingClientRect();
    const cellSize = gridRect.width / GRID_SIZE;
    const targetX = coinRect.left + coinRect.width / 2;
    const targetY = coinRect.top + coinRect.height / 2;

    const coinParticles: Particle[] = [];
    
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if ((r + c) % 2 === 0) {
            const startX = gridRect.left + (c * cellSize) + (cellSize / 2);
            const startY = gridRect.top + (r * cellSize) + (cellSize / 2);
            
            coinParticles.push({
              id: Math.random(),
              x: startX,
              y: startY,
              vx: 0,
              vy: 0,
              color: 'gold',
              emoji: '🪙',
              life: 1.0,
              target: { x: targetX, y: targetY }
            });
        }
      }
    }
    
    const playCoinSound = (i: number) => {
      if (i > 10) return;
      setTimeout(() => {
        SoundManager.play('pop');
        playCoinSound(i + 1);
      }, 50);
    };
    playCoinSound(0);

    setParticles(prev => [...prev, ...coinParticles]);
  };

  const triggerPraise = (text: string, isMajor: boolean = false) => {
    if (praiseTimerRef.current) clearTimeout(praiseTimerRef.current);
    setPraiseMessage({ text, isMajor });
    praiseTimerRef.current = window.setTimeout(() => setPraiseMessage(null), 2000);
  };

  const handleRotateBlock = (blockId: string) => {
    // Rotation disabled after level 10
    if (level.id > 10) {
      SoundManager.play('invalid');
      return;
    }
    SoundManager.play('click');
    setBlocks(prev => prev.map(b => {
      if (b.id === blockId) {
        return { ...b, shape: rotateMatrix(b.shape) };
      }
      return b;
    }));
  };

  const handleRotateAll = () => {
    if (level.id > 10) return;
    
    SoundManager.play('click');
    setBlocks(prev => prev.map(b => {
      if (!b.used) {
        return { ...b, shape: rotateMatrix(b.shape) };
      }
      return b;
    }));
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (draggingBlock && gridRef.current) {
      setDraggingBlock(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);

      const { block } = draggingBlock;
      const rect = gridRef.current.getBoundingClientRect();
      const cellSize = rect.width / GRID_SIZE;
      
      const touchX = e.clientX;
      const touchY = e.clientY - DRAG_Y_OFFSET; 

      const relX = touchX - rect.left;
      const relY = touchY - rect.top;

      const blockPixelWidth = block.shape[0].length * cellSize;
      const blockPixelHeight = block.shape.length * cellSize;

      const blockTLX = relX - blockPixelWidth / 2;
      const blockTLY = relY - blockPixelHeight / 2;

      const targetC = Math.round(blockTLX / cellSize);
      const targetR = Math.round(blockTLY / cellSize);

      if (canPlaceBlock(grid, block.shape, targetR, targetC)) {
        setPreviewPlacement({ r: targetR, c: targetC });
      } else {
        setPreviewPlacement(null);
      }
    }
  }, [draggingBlock, grid]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (dragStartPos && draggingBlock) {
      const dist = Math.sqrt(Math.pow(e.clientX - dragStartPos.x, 2) + Math.pow(e.clientY - dragStartPos.y, 2));
      const timeDiff = Date.now() - dragStartTime;

      if (timeDiff < 200 && dist < 10) {
        handleRotateBlock(draggingBlock.block.id);
        setDraggingBlock(null);
        setPreviewPlacement(null);
        setDragStartPos(null);
        return;
      }
    }

    if (!draggingBlock) return;

    if (previewPlacement) {
       const { r, c } = previewPlacement;
       const { block } = draggingBlock;

       const newGrid = placeBlock(grid, block.shape, block.fruit, r, c);
       SoundManager.play('pop');

       let points = block.shape.flat().filter(x => x === 1).length * POINTS.BLOCK_PLACED;
       
       setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, used: true } : b));

       const lines = checkLines(newGrid);
       const linesCount = lines.length;
       
       if (linesCount > 0) {
         setLinesCleared(prev => prev + linesCount);

         if (linesCount === 1) triggerPraise(t.praise.good);
         else if (linesCount === 2) triggerPraise(t.praise.great);
         else if (linesCount === 3) triggerPraise(t.praise.amazing);
         else if (linesCount >= 4) triggerPraise(t.praise.excellent, true);
         
         if (linesCount > 1) {
            SoundManager.play('combo');
         } else {
            SoundManager.play('blast');
         }

         lines.forEach(line => {
            const isRow = line.type === 'row';
            for(let k=0; k<GRID_SIZE; k++) {
                const rIdx = isRow ? line.index : k;
                const cIdx = isRow ? k : line.index;
                const cell = newGrid[rIdx][cIdx];
                if (cell.filled && cell.fruit) {
                    spawnParticles(rIdx, cIdx, 'gold', FRUITS[cell.fruit]);
                    newGrid[rIdx][cIdx] = { filled: false, fruit: null };
                }
            }
         });

         const multiplier = linesCount > 1 ? POINTS.COMBO_MULTIPLIER * linesCount : 1;
         points += (linesCount * POINTS.LINE_CLEARED) * multiplier;
       }

       if (isGridEmpty(newGrid)) {
         setTimeout(() => {
           triggerPraise(t.praise.allClear, true);
           SoundManager.play('win'); 
           triggerAllClearEffect(); 
           onAddCoins(50); 
         }, 300);
         points += (POINTS.ALL_CLEAR * 2);
       }
       
       // Apply Character Ability (Score)
       if (character.abilityType === 'SCORE') {
         points = Math.floor(points * character.abilityValue);
       }

       setGrid(newGrid);
       setScore(prev => prev + Math.floor(points));

       // Win Condition logic
       if (score + points >= level.targetScore && (linesCleared + linesCount) >= level.targetLines) {
         setTimeout(() => {
             const stars = (score + points) > level.targetScore * 1.5 ? 3 : 2;
             onWin(Math.floor(score + points), stars);
         }, 2500); 
       } else if (score + points >= level.targetScore * 1.2 && (linesCleared + linesCount) >= level.targetLines) {
          setTimeout(() => {
             onWin(Math.floor(score + points), 3);
         }, 2500);
       }
    } else {
        if (!dragStartPos) SoundManager.play('invalid'); 
    }

    setDraggingBlock(null);
    setPreviewPlacement(null);
    setDragStartPos(null);
  }, [draggingBlock, previewPlacement, grid, score, level.targetScore, level.targetLines, linesCleared, onWin, dragStartPos, dragStartTime, onAddCoins, character, t]);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const isPreviewCell = (r: number, c: number) => {
    if (!previewPlacement || !draggingBlock) return false;
    const { r: pr, c: pc } = previewPlacement;
    const shape = draggingBlock.block.shape;
    const sr = r - pr;
    const sc = c - pc;
    return sr >= 0 && sr < shape.length && sc >= 0 && sc < shape[0].length && shape[sr][sc] === 1;
  };

  const handleGridClick = (r: number, c: number) => {
    if (!activeBooster) return;
    if (!grid[r][c].filled) return;

    let newGrid = [...grid.map(row => [...row])];
    let success = false;
    
    if (activeBooster === 'HAMMER') {
      spawnParticles(r, c, 'white', '🔨');
      newGrid[r][c] = { filled: false, fruit: null };
      success = true;
    } else if (activeBooster === 'BOMB') {
      for(let i = r-1; i <= r+1; i++) {
        for(let j = c-1; j <= c+1; j++) {
          if (i>=0 && i<GRID_SIZE && j>=0 && j<GRID_SIZE && newGrid[i][j].filled) {
             spawnParticles(i, j, 'red', '💣');
             newGrid[i][j] = { filled: false, fruit: null };
          }
        }
      }
      success = true;
    }

    if (success) {
      if (onConsumeBooster(activeBooster)) {
         setGrid(newGrid);
         SoundManager.play('booster');
      }
    }
    setActiveBooster(null);
  };

  const handleBoosterClick = (type: BoosterType) => {
    if (boosters[type] > 0) {
      if (type === 'SHUFFLE') {
         if (!blocks.every(b => b.used) && onConsumeBooster('SHUFFLE')) {
             setBlocks(generateBlocks(level.id));
             SoundManager.play('booster');
         }
      } else {
         setActiveBooster(activeBooster === type ? null : type);
         SoundManager.play('click');
      }
    } else {
      if (onBuyBooster(type)) {
         if (type !== 'SHUFFLE') {
             setActiveBooster(type);
         } else {
             if (!blocks.every(b => b.used) && onConsumeBooster('SHUFFLE')) {
                setBlocks(generateBlocks(level.id));
                SoundManager.play('booster');
             }
         }
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative select-none">
      <ParticleSystem particles={particles} />
      <PraiseText text={praiseMessage?.text || null} isMajor={praiseMessage?.isMajor} />

      {/* Top Bar - Purple Strip */}
      <div className="pt-safe px-4 pb-2 w-full z-10 bg-purple-600/20 backdrop-blur-sm border-b border-white/20">
         <div className="flex justify-between items-center max-w-md mx-auto relative">
             <Button variant="icon" size="icon" onClick={() => { onExit(); }}>
                <ChevronLeft size={28} className="text-white drop-shadow-md" />
             </Button>

             <div className="flex gap-3">
                 <div className="flex flex-col items-center">
                     <span className="text-[10px] font-bold text-purple-100 uppercase mb-0.5 drop-shadow-sm font-display flex gap-1 items-center">
                        <Target size={10} /> {t.target}
                     </span>
                     <div className="bg-[#4c1d95] rounded-xl px-3 py-1 border-b-4 border-[#3b0764] shadow-md min-w-[70px] text-center">
                        <span className={`text-xl font-black ${linesCleared >= level.targetLines ? 'text-green-400' : 'text-white'}`}>
                           {linesCleared}/{level.targetLines}
                        </span>
                     </div>
                 </div>

                 <div className="flex flex-col items-center">
                     <span className="text-[10px] font-bold text-purple-100 uppercase mb-0.5 drop-shadow-sm font-display">{t.score}</span>
                     <div className="bg-[#4c1d95] rounded-xl px-3 py-1 border-b-4 border-[#3b0764] shadow-md min-w-[80px] text-center">
                        <span className="text-xl font-black text-yellow-300">{score}</span>
                     </div>
                 </div>
                 
                 <div ref={coinRef} className="absolute left-6 top-safe opacity-0 w-8 h-8 pointer-events-none"></div>
             </div>

             <Button variant="icon" size="icon" onClick={() => { setShowPause(true); MusicManager.setLowPass(true); }}>
                <Pause size={24} className="text-white drop-shadow-md" />
             </Button>

             {/* Character Mini Display (Absolute) */}
             <div className="absolute top-12 right-2 pointer-events-none opacity-80 scale-75">
                <div className={`w-10 h-10 ${character.color} rounded-full flex items-center justify-center border-2 border-white shadow-md`}>
                   <span className="text-lg">{character.icon}</span>
                </div>
             </div>
         </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative z-0">
          <div 
            ref={gridRef}
            className="bg-[#6b21a8] p-3 rounded-3xl shadow-[0_8px_0_rgba(0,0,0,0.2),_inset_0_4px_8px_rgba(255,255,255,0.2)] border-4 border-[#a855f7]"
            style={{ width: 'min(94vw, 58vh)', height: 'min(94vw, 58vh)' }}
          >
            <div className="grid grid-cols-8 grid-rows-8 gap-1 w-full h-full bg-[#581c87]/50 rounded-xl p-1 grid-inset">
              {grid.map((row, r) => row.map((cell, c) => (
                <div 
                  key={`${r}-${c}`}
                  onClick={() => handleGridClick(r, c)}
                  className={`
                    rounded-md relative flex items-center justify-center transition-all duration-150
                    ${cell.filled 
                      ? `${FRUIT_COLORS[cell.fruit!]} shadow-sm border border-white/20 z-10 block-gloss` 
                      : 'bg-[#4c1d95]/50'
                    }
                    ${isPreviewCell(r, c) && !cell.filled 
                      ? `opacity-60 z-20 ${draggingBlock ? FRUIT_COLORS[draggingBlock.block.fruit] : 'bg-white/40'}` 
                      : ''
                    }
                    ${activeBooster && cell.filled ? 'animate-pulse ring-2 ring-red-400 cursor-crosshair' : ''}
                  `}
                >
                  {cell.filled && (
                    <>
                      <span className="text-[min(6vw,4vh)] drop-shadow-md animate-pop select-none relative z-10">
                        {FRUITS[cell.fruit!]}
                      </span>
                      <div className="absolute top-[10%] left-[10%] w-[30%] h-[15%] bg-white/40 rounded-full blur-[0.5px] z-10" />
                      
                      <div className="absolute inset-0 rounded-md overflow-hidden pointer-events-none z-20">
                         <div className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-20deg] animate-[shine_0.8s_ease-in-out_forwards]" />
                      </div>
                    </>
                  )}
                </div>
              )))}
            </div>
          </div>
      </div>

      <div className="bg-[#7e22ce] rounded-t-[40px] shadow-[0_-4px_20px_rgba(0,0,0,0.3)] pb-safe-bottom pt-6 px-4 z-20 border-t-4 border-[#a855f7] relative w-full">
         <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-white/20 rounded-full"></div>
         
         {level.id <= 10 && (
           <button 
              onClick={handleRotateAll}
              className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white border border-white/30 hover:bg-white/30 active:scale-95 transition-all shadow-sm"
           >
              <RotateCw size={20} />
           </button>
         )}

         <div className="flex justify-around items-center h-[12vh] min-h-[90px] mb-4 w-full max-w-3xl mx-auto">
            {blocks.map(block => (
              <div 
                key={block.id}
                className={`transition-all duration-300 touch-none ${block.used ? 'opacity-0 scale-0' : 'opacity-100 scale-100 hover:scale-105 active:scale-95'}`}
                onPointerDown={(e) => {
                  if(!block.used) {
                    setDragStartTime(Date.now());
                    setDragStartPos({ x: e.clientX, y: e.clientY });
                    setDraggingBlock({ block, x: e.clientX, y: e.clientY });
                    SoundManager.play('click');
                  }
                }}
              >
                 <div 
                   className="grid gap-0.5 p-1.5 cursor-grab"
                   style={{ gridTemplateColumns: `repeat(${block.shape[0].length}, 1fr)` }}
                 >
                    {block.shape.map((row, r) => row.map((val, c) => (
                      val ? (
                        <div key={`${r}-${c}`} className={`w-7 h-7 md:w-9 md:h-9 rounded-md ${FRUIT_COLORS[block.fruit]} flex items-center justify-center shadow-sm border border-white/30 block-gloss`}>
                           <div className="w-full h-full rounded-sm bg-gradient-to-br from-white/20 to-transparent flex items-center justify-center">
                              <span className="text-[12px] md:text-[14px] drop-shadow-sm">{FRUITS[block.fruit]}</span>
                           </div>
                        </div>
                      ) : <div key={`${r}-${c}`} className="w-7 h-7 md:w-9 md:h-9" />
                    )))}
                 </div>
              </div>
            ))}
         </div>

         <div className="flex justify-center gap-6 pb-2 w-full">
             {[
               { id: 'BOMB' as const, icon: <Bomb size={24} />, count: boosters.BOMB, color: 'bg-gradient-to-b from-rose-400 to-rose-600 border-rose-800' },
               { id: 'HAMMER' as const, icon: <Hammer size={24} />, count: boosters.HAMMER, color: 'bg-gradient-to-b from-blue-400 to-blue-600 border-blue-800' },
               { id: 'SHUFFLE' as const, icon: <Shuffle size={24} />, count: boosters.SHUFFLE, color: 'bg-gradient-to-b from-emerald-400 to-emerald-600 border-emerald-800' }
             ].map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleBoosterClick(b.id)}
                  className={`
                     w-16 h-16 rounded-full flex items-center justify-center relative transition-all shadow-lg
                     ${b.color} border-b-[4px] text-white
                     ${activeBooster === b.id ? 'ring-4 ring-yellow-300 scale-110' : 'hover:-translate-y-1'}
                     ${b.count === 0 ? 'opacity-90' : ''}
                  `}
                >
                   {b.icon}
                   {b.count > 0 ? (
                     <span className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 w-6 h-6 rounded-full text-xs font-black flex items-center justify-center border-2 border-white shadow-sm font-display">
                       {b.count}
                     </span>
                   ) : (
                     <div className="absolute -top-1 -right-1 bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                       <Plus size={14} strokeWidth={4} />
                     </div>
                   )}
                </button>
             ))}
         </div>
      </div>

      {draggingBlock && (
        <div 
          className="fixed pointer-events-none z-[100]"
          style={{ 
            left: draggingBlock.x,
            top: draggingBlock.y - DRAG_Y_OFFSET, 
            transform: 'translate(-50%, -50%) scale(1.1) rotate(-3deg)',
            filter: 'drop-shadow(0px 20px 10px rgba(0,0,0,0.3))'
          }}
        >
           <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${draggingBlock.block.shape[0].length}, 1fr)` }}>
              {draggingBlock.block.shape.map((row, r) => row.map((val, c) => (
                val ? (
                  <div key={`${r}-${c}`} className={`w-12 h-12 rounded-xl ${FRUIT_COLORS[draggingBlock.block.fruit]} flex items-center justify-center shadow-lg border-2 border-white/40 block-gloss`}>
                     <span className="text-3xl filter drop-shadow-sm">{FRUITS[draggingBlock.block.fruit]}</span>
                     <div className="absolute top-1 left-1 w-4 h-2 bg-white/40 rounded-full blur-[1px]"></div>
                  </div>
                ) : <div key={`${r}-${c}`} className="w-12 h-12" />
              )))}
           </div>
        </div>
      )}

      {showPause && (
        <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-[#a855f7] rounded-[40px] p-8 w-full max-w-sm flex flex-col items-center gap-6 shadow-2xl animate-pop border-[6px] border-white ring-4 ring-purple-900/20">
              <h2 className="text-5xl font-black text-[#fbbf24] candy-text font-display">{t.pause}</h2>
              <Button size="xl" variant="start" onClick={() => { setShowPause(false); MusicManager.setLowPass(false); }}>{t.resume}</Button>
              
              <div className="flex gap-4 w-full">
                 <Button fullWidth variant="icon" onClick={() => { setShowPause(false); onExit(); MusicManager.setLowPass(false); }}>
                    <Home size={28} />
                 </Button>
                 <Button fullWidth variant="icon" onClick={() => { /* Retry */ }}>
                    <RotateCcw size={28} />
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
