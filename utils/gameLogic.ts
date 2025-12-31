
import { GridType, Cell, DraggableBlock, FruitType, BlockShape } from '../types';
import { GRID_SIZE, SHAPES, FRUITS } from '../constants';

export const createEmptyGrid = (): GridType => {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ filled: false, fruit: null }))
  );
};

// Check if a block can be placed at specific grid coordinates (r, c)
export const canPlaceBlock = (grid: GridType, shape: number[][], r: number, c: number): boolean => {
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[i].length; j++) {
      if (shape[i][j] === 1) {
        const newR = r + i;
        const newC = c + j;
        // Check bounds
        if (newR >= GRID_SIZE || newC >= GRID_SIZE || newR < 0 || newC < 0) return false;
        // Check overlap
        if (grid[newR][newC].filled) return false;
      }
    }
  }
  return true;
};

// Place block and return new grid
export const placeBlock = (
  grid: GridType,
  shape: number[][],
  fruit: FruitType,
  r: number,
  c: number
): GridType => {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[i].length; j++) {
      if (shape[i][j] === 1) {
        newGrid[r + i][c + j] = {
          filled: true,
          fruit: fruit,
          id: Math.random().toString(36).substr(2, 9),
        };
      }
    }
  }
  return newGrid;
};

// Check lines to clear
export const checkLines = (grid: GridType) => {
  const linesToClear: { type: 'row' | 'col'; index: number }[] = [];

  // Check rows
  for (let r = 0; r < GRID_SIZE; r++) {
    if (grid[r].every((cell) => cell.filled)) {
      linesToClear.push({ type: 'row', index: r });
    }
  }

  // Check columns
  for (let c = 0; c < GRID_SIZE; c++) {
    if (grid.every((row) => row[c].filled)) {
      linesToClear.push({ type: 'col', index: c });
    }
  }

  return linesToClear;
};

// Check if the grid is completely empty (All Clear / Sapu Bersih)
export const isGridEmpty = (grid: GridType): boolean => {
  return grid.every(row => row.every(cell => !cell.filled));
};

// Rotate a matrix 90 degrees clockwise
export const rotateMatrix = (matrix: number[][]): number[][] => {
  // Transpose and reverse rows to rotate 90 deg clockwise
  return matrix[0].map((val, index) => matrix.map(row => row[index]).reverse());
};

// Generate 3 random blocks with DYNAMIC DIFFICULTY (Level 1-100)
export const generateBlocks = (levelId: number = 1): DraggableBlock[] => {
  const fruitKeys = Object.keys(FRUITS) as FruitType[];
  
  // Indices correspond to SHAPES in constants.ts
  // 0-8: Standard Tetris shapes
  // 9: 3x3 Big Block
  // 10: U Shape
  
  let weightedShapePool: BlockShape[] = [];

  if (levelId <= 10) {
    // EASY MODE (Levels 1-10): Mostly 1x1, 1x2, 2x1. 
    // Rotation is allowed in UI for these levels.
    weightedShapePool = [
      SHAPES[0], SHAPES[0], SHAPES[0], // 1x1
      SHAPES[1], SHAPES[1], // 1x2
      SHAPES[2], SHAPES[2], // 2x1
      SHAPES[5], // 2x2
      SHAPES[3], // 1x3
    ];
  } else if (levelId <= 40) {
    // NORMAL MODE (11-40): Balanced mix. Rotation DISABLED.
    weightedShapePool = [
      ...SHAPES.slice(0, 9), // Standard shapes
      SHAPES[0], // Add a few more 1x1 to help
      SHAPES[1], 
      SHAPES[2]
    ];
  } else if (levelId <= 70) {
    // HARD MODE (41-70): More complex shapes (L, T, Z, U)
    weightedShapePool = [
      ...SHAPES, // All shapes including hard ones if added
      SHAPES[6], SHAPES[7], SHAPES[8], // L, T, Z
      SHAPES[10] || SHAPES[5], // U shape or 2x2
    ];
  } else {
    // EXPERT MODE (71-100): Big blocks, awkward shapes, less 1x1s.
    weightedShapePool = [
      ...SHAPES,
      SHAPES[9] || SHAPES[5], // 3x3 or 2x2
      SHAPES[10] || SHAPES[6], // U or L
    ];
  }

  return Array.from({ length: 3 }, () => {
    // Pick from the weighted pool
    const randomShape = weightedShapePool[Math.floor(Math.random() * weightedShapePool.length)];
    const randomFruit = fruitKeys[Math.floor(Math.random() * fruitKeys.length)];
    return {
      id: Math.random().toString(36).substr(2, 9),
      shape: randomShape.matrix,
      fruit: randomFruit,
      used: false,
    };
  });
};

// Check if game is over (no moves possible for ANY unused block)
export const checkGameOver = (grid: GridType, blocks: DraggableBlock[]): boolean => {
  const availableBlocks = blocks.filter((b) => !b.used);
  if (availableBlocks.length === 0) return false; // Waiting for refill, not game over

  for (const block of availableBlocks) {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (canPlaceBlock(grid, block.shape, r, c)) {
          return false; // Found a valid move
        }
      }
    }
  }
  return true; // No moves found
};
