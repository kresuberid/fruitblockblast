
export type ScreenState = 'SPLASH' | 'HOME' | 'LEVEL_SELECT' | 'GAME' | 'WIN' | 'GAME_OVER';

export type FruitType = 'APPLE' | 'BANANA' | 'ORANGE' | 'STRAWBERRY' | 'GRAPE' | 'WATERMELON' | 'PINEAPPLE';

export interface Cell {
  filled: boolean;
  fruit: FruitType | null;
  id?: string; // Unique ID for animation keys
  isExploding?: boolean; // For visual effects
}

export type GridType = Cell[][];

// A shape is a 2D array of 0s and 1s
export interface BlockShape {
  matrix: number[][]; 
  id: string;
}

export interface DraggableBlock {
  id: string;
  shape: number[][];
  fruit: FruitType;
  used: boolean;
}

export type BoosterType = 'BOMB' | 'HAMMER' | 'SHUFFLE';

export interface Boosters {
  BOMB: number;
  HAMMER: number;
  SHUFFLE: number;
}

export interface LevelData {
  id: number;
  targetScore: number;
  targetLines: number; // New requirement
  unlocked: boolean;
  stars: 0 | 1 | 2 | 3;
}

export interface Character {
  id: string;
  name: string;
  price: number;
  icon: string; // Main fruit emoji
  accessory: string; // Weapon/Eye emoji for decoration
  color: string;
  abilityType: 'SCORE' | 'COIN' | 'NONE';
  abilityValue: number; // e.g., 1.1 for 10% boost
  description: string;
}

export interface GameStats {
  score: number;
  bestScore: number;
  moves: number;
  boosters: Boosters;
}
