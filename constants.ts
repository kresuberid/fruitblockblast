
import { FruitType, BlockShape, LevelData, Character } from './types';

export const GRID_SIZE = 8;

// Color Palette Mapping matching the Candy Design
export const COLORS = {
  background: 'bg-[radial-gradient(circle_at_top,_#f472b6,_#c084fc,_#a855f7)]', // Pink to Purple radial
  panel: 'bg-white/20 backdrop-blur-lg',
  gridContainer: 'bg-[#6b21a8]', // Deep Purple
  gridCell: 'bg-[#581c87]', // Darker Purple for empty cells
};

// Fruit Emoji/Asset Map
export const FRUITS: Record<FruitType, string> = {
  APPLE: '🍎',
  BANANA: '🍌',
  ORANGE: '🍊',
  STRAWBERRY: '🍓',
  GRAPE: '🍇',
  WATERMELON: '🍉',
  PINEAPPLE: '🍍',
};

// More vibrant candy colors for blocks
export const FRUIT_COLORS: Record<FruitType, string> = {
  APPLE: 'bg-gradient-to-br from-red-400 to-red-600 border-red-300',
  BANANA: 'bg-gradient-to-br from-yellow-300 to-yellow-500 border-yellow-200',
  ORANGE: 'bg-gradient-to-br from-orange-400 to-orange-600 border-orange-300',
  STRAWBERRY: 'bg-gradient-to-br from-pink-400 to-rose-600 border-pink-300',
  GRAPE: 'bg-gradient-to-br from-purple-400 to-purple-600 border-purple-300',
  WATERMELON: 'bg-gradient-to-br from-green-400 to-emerald-600 border-green-300',
  PINEAPPLE: 'bg-gradient-to-br from-yellow-400 to-amber-600 border-amber-300',
};

// Tetris-like shapes
export const SHAPES: BlockShape[] = [
  { id: '1x1', matrix: [[1]] },
  { id: '1x2', matrix: [[1, 1]] },
  { id: '2x1', matrix: [[1], [1]] },
  { id: '1x3', matrix: [[1, 1, 1]] },
  { id: '3x1', matrix: [[1], [1], [1]] },
  { id: '2x2', matrix: [[1, 1], [1, 1]] },
  { id: 'L', matrix: [[1, 0], [1, 0], [1, 1]] },
  { id: 'T', matrix: [[1, 1, 1], [0, 1, 0]] },
  { id: 'Z', matrix: [[1, 1, 0], [0, 1, 1]] },
  // Harder shapes for higher levels
  { id: '3x3', matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] }, 
  { id: 'U', matrix: [[1, 0, 1], [1, 1, 1]] },
];

// Generate 100 Levels with progressive difficulty
export const INITIAL_LEVELS: LevelData[] = Array.from({ length: 100 }, (_, i) => {
  const levelNum = i + 1;
  let baseScore = 500;
  let baseLines = 3;

  if (levelNum <= 10) {
    baseScore = levelNum * 500;
    baseLines = 3 + Math.floor(levelNum / 2);
  } else if (levelNum <= 40) {
    baseScore = 5000 + (levelNum - 10) * 800;
    baseLines = 8 + Math.floor((levelNum - 10) / 1.5);
  } else {
    baseScore = 30000 + (levelNum - 40) * 1200;
    baseLines = 28 + (levelNum - 40);
  }

  return {
    id: levelNum,
    targetScore: baseScore,
    targetLines: baseLines,
    unlocked: i === 0,
    stars: 0,
  };
});

export const POINTS = {
  BLOCK_PLACED: 10,
  LINE_CLEARED: 100,
  COMBO_MULTIPLIER: 1.5, 
  ALL_CLEAR: 3000, 
};

// 12 Characters System
export const CHARACTERS: Character[] = [
  // Free Tier
  { id: 'c1', name: 'Apel Prajurit', price: 0, icon: '🍎', accessory: '⚔️', color: 'bg-red-500', abilityType: 'NONE', abilityValue: 0, description: 'Prajurit dasar pemberani.' },
  { id: 'c2', name: 'Nana Ninja', price: 0, icon: '🍌', accessory: '🐱', color: 'bg-yellow-400', abilityType: 'NONE', abilityValue: 0, description: 'Gesit dan tersembunyi.' },
  
  // Tier 1 (Cheap) - Small Boosts
  { id: 'c3', name: 'Grape Wizard', price: 500, icon: '🍇', accessory: '🔮', color: 'bg-purple-600', abilityType: 'SCORE', abilityValue: 1.05, description: '+5% Skor Akhir' },
  { id: 'c4', name: 'Melon Tank', price: 500, icon: '🍉', accessory: '🛡️', color: 'bg-green-500', abilityType: 'COIN', abilityValue: 1.05, description: '+5% Bonus Koin' },
  { id: 'c5', name: 'Orange Pilot', price: 800, icon: '🍊', accessory: '👓', color: 'bg-orange-500', abilityType: 'SCORE', abilityValue: 1.08, description: '+8% Skor Akhir' },
  { id: 'c6', name: 'Berry Boxer', price: 800, icon: '🍓', accessory: '🥊', color: 'bg-pink-500', abilityType: 'COIN', abilityValue: 1.08, description: '+8% Bonus Koin' },

  // Tier 2 (Mid) - Good Boosts
  { id: 'c7', name: 'Pine King', price: 1500, icon: '🍍', accessory: '👑', color: 'bg-yellow-500', abilityType: 'SCORE', abilityValue: 1.15, description: '+15% Skor Akhir' },
  { id: 'c8', name: 'Cyber Kiwi', price: 1500, icon: '🥝', accessory: '🤖', color: 'bg-lime-600', abilityType: 'COIN', abilityValue: 1.15, description: '+15% Bonus Koin' },
  { id: 'c9', name: 'Peach Princess', price: 2000, icon: '🍑', accessory: '💖', color: 'bg-pink-300', abilityType: 'SCORE', abilityValue: 1.20, description: '+20% Skor Akhir' },

  // Tier 3 (Legendary)
  { id: 'c10', name: 'Dragon Master', price: 3000, icon: '🐉', accessory: '🔥', color: 'bg-red-700', abilityType: 'COIN', abilityValue: 1.25, description: '+25% Bonus Koin' },
  { id: 'c11', name: 'Galaxy Berry', price: 4000, icon: '🫐', accessory: '✨', color: 'bg-blue-800', abilityType: 'SCORE', abilityValue: 1.30, description: '+30% Skor Akhir' },
  { id: 'c12', name: 'Golden Corn', price: 5000, icon: '🌽', accessory: '💰', color: 'bg-yellow-300', abilityType: 'COIN', abilityValue: 1.50, description: '+50% Bonus Koin' },
];
