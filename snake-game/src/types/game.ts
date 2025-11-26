export type Coordinate = {
  x: number;
  y: number;
};

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type Player = {
  id: string;
  position: Coordinate[];
  direction: Direction;
  score: number;
  color: string;
};

export type GameState = {
  players: Player[];
  food: Coordinate;
  gridSize: number;
};
