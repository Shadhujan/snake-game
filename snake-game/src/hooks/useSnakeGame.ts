import { useReducer, useCallback, useEffect } from 'react';
import { GameState, Direction, Coordinate, Player } from '@/types/game';
import { useGameLoop } from './useGameLoop';

const GRID_SIZE = 20; // 20x20 grid

type Action =
  | { type: 'MOVE' }
  | { type: 'CHANGE_DIRECTION'; direction: Direction; playerId: string }
  | { type: 'SPAWN_FOOD' };

const initialState: GameState = {
  players: [
    {
      id: 'local-player',
      position: [{ x: 10, y: 10 }],
      direction: 'UP',
      score: 0,
      color: '#00ff00',
    },
  ],
  food: { x: 5, y: 5 },
  gridSize: GRID_SIZE,
};

const moveSnake = (snake: Player, gridSize: number): Coordinate[] => {
  const head = snake.position[0];
  let newHead: Coordinate;

  switch (snake.direction) {
    case 'UP':
      newHead = { x: head.x, y: head.y - 1 };
      break;
    case 'DOWN':
      newHead = { x: head.x, y: head.y + 1 };
      break;
    case 'LEFT':
      newHead = { x: head.x - 1, y: head.y };
      break;
    case 'RIGHT':
      newHead = { x: head.x + 1, y: head.y };
      break;
  }

  // Wrap around logic
  if (newHead.x < 0) newHead.x = gridSize - 1;
  if (newHead.x >= gridSize) newHead.x = 0;
  if (newHead.y < 0) newHead.y = gridSize - 1;
  if (newHead.y >= gridSize) newHead.y = 0;

  return [newHead, ...snake.position.slice(0, -1)];
};

const gameReducer = (state: GameState, action: Action): GameState => {
  switch (action.type) {
    case 'MOVE': {
      const newPlayers = state.players.map((player) => {
        const newPosition = moveSnake(player, state.gridSize);
        // Check collision with food
        const head = newPosition[0];
        if (head.x === state.food.x && head.y === state.food.y) {
          // Grow snake
          return {
            ...player,
            position: [head, ...player.position],
            score: player.score + 1,
          };
        }
        return { ...player, position: newPosition };
      });

      // Check if food was eaten, if so spawn new food
      let newFood = state.food;
      const anyPlayerAte = newPlayers.some(
        (p) => p.score > state.players.find((old) => old.id === p.id)!.score
      );

      if (anyPlayerAte) {
        newFood = {
          x: Math.floor(Math.random() * state.gridSize),
          y: Math.floor(Math.random() * state.gridSize),
        };
      }

      return {
        ...state,
        players: newPlayers,
        food: newFood,
      };
    }
    case 'CHANGE_DIRECTION': {
      return {
        ...state,
        players: state.players.map((p) => {
          if (p.id !== action.playerId) return p;
          // Prevent 180 degree turns
          if (
            (action.direction === 'UP' && p.direction === 'DOWN') ||
            (action.direction === 'DOWN' && p.direction === 'UP') ||
            (action.direction === 'LEFT' && p.direction === 'RIGHT') ||
            (action.direction === 'RIGHT' && p.direction === 'LEFT')
          ) {
            return p;
          }
          return { ...p, direction: action.direction };
        }),
      };
    }
    default:
      return state;
  }
};

export const useSnakeGame = () => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const gameLoop = useCallback(() => {
    dispatch({ type: 'MOVE' });
  }, []);

  useGameLoop(gameLoop, true);

  const changeDirection = useCallback((direction: Direction) => {
    dispatch({ type: 'CHANGE_DIRECTION', direction, playerId: 'local-player' });
  }, []);

  return { state, changeDirection };
};
