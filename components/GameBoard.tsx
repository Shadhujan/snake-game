'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Trophy, AlertTriangle } from 'lucide-react'

interface GameBoardProps {
  gameId: string
  playerId: string
  isHost: boolean
  code: string
}

type Point = { x: number; y: number }
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

const GRID_SIZE = 20
const CELL_COUNT = 20 // 20x20 grid
const TICK_RATE = 150

export default function GameBoard({ gameId, playerId, isHost, code }: GameBoardProps) {
  // Game State
  const [snake1, setSnake1] = useState<Point[]>([{ x: 2, y: 5 }]) // Host starts top-left
  const [snake2, setSnake2] = useState<Point[]>([{ x: 17, y: 14 }]) // P2 starts bottom-right
  const [direction1, setDirection1] = useState<Direction>('RIGHT')
  const [direction2, setDirection2] = useState<Direction>('LEFT')
  const [food, setFood] = useState<Point>({ x: 10, y: 10 })
  const [score, setScore] = useState({ p1: 0, p2: 0 })
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(true)
  const [countdown, setCountdown] = useState(3)
  
  // Refs for state access in interval/listeners without dependencies
  const gameStateRef = useRef({
    snake1: [{ x: 2, y: 5 }],
    snake2: [{ x: 17, y: 14 }],
    direction1: 'RIGHT' as Direction,
    direction2: 'LEFT' as Direction,
    food: { x: 10, y: 10 },
    gameOver: false,
    isStarting: true,
    inputQueue: [] as Direction[] // Input buffering
  })

  // Initialize refs
  useEffect(() => {
    gameStateRef.current.snake1 = snake1
    gameStateRef.current.snake2 = snake2
    gameStateRef.current.direction1 = direction1
    gameStateRef.current.direction2 = direction2
    gameStateRef.current.food = food
    gameStateRef.current.gameOver = gameOver
    gameStateRef.current.isStarting = isStarting
  }, [snake1, snake2, direction1, direction2, food, gameOver, isStarting])

  const channelRef = useRef<any>(null)

  // Helper: Generate random food
  const generateFood = () => {
    return {
      x: Math.floor(Math.random() * CELL_COUNT),
      y: Math.floor(Math.random() * CELL_COUNT)
    }
  }

  // Setup Realtime Subscription
  useEffect(() => {
    const channel = supabase.channel(`game:${code}`)
    channelRef.current = channel

    channel
      .on('broadcast', { event: 'input' }, ({ payload }: { payload: { playerId: string, direction: Direction, head: Point } }) => {
        // Update opponent direction/position
        if (payload.playerId !== playerId) {
          if (isHost) {
            // I am Host (P1), received P2 input
            setDirection2(payload.direction)
            gameStateRef.current.direction2 = payload.direction
            // Optional: Sync position if needed, but we predict movement
          } else {
            // I am P2, received P1 input
            setDirection1(payload.direction)
            gameStateRef.current.direction1 = payload.direction
          }
        }
      })
      .on('broadcast', { event: 'food-update' }, ({ payload }: { payload: Point }) => {
        if (!isHost) {
          setFood(payload)
          gameStateRef.current.food = payload
        }
      })
      .on('broadcast', { event: 'game-over' }, ({ payload }: { payload: { winnerId: string } }) => {
        handleGameOver(payload.winnerId)
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        // Check if opponent is connected
        // This is a simple check, in a real app we'd need more robust logic
        // For now, just logging or could pause game
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ playerId })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [code, isHost, playerId])

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current.gameOver) return

      const key = e.key
      const currentDir = isHost ? gameStateRef.current.direction1 : gameStateRef.current.direction2
      let newDir: Direction | null = null

      if (key === 'ArrowUp' && currentDir !== 'DOWN') newDir = 'UP'
      if (key === 'ArrowDown' && currentDir !== 'UP') newDir = 'DOWN'
      if (key === 'ArrowLeft' && currentDir !== 'RIGHT') newDir = 'LEFT'
      if (key === 'ArrowRight' && currentDir !== 'LEFT') newDir = 'RIGHT'

      if (newDir) {
        // Push to input queue
        gameStateRef.current.inputQueue.push(newDir)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isHost])

  // Countdown Effect
  useEffect(() => {
    if (!isStarting) return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setIsStarting(false)
          gameStateRef.current.isStarting = false
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isStarting])

  // Game Loop
  useEffect(() => {
    if (gameOver || isStarting) return

    const moveSnake = (snake: Point[], dir: Direction): Point => {
      const head = { ...snake[0] }
      if (dir === 'UP') head.y -= 1
      if (dir === 'DOWN') head.y += 1
      if (dir === 'LEFT') head.x -= 1
      if (dir === 'RIGHT') head.x += 1
      return head
    }

    const checkCollision = (head: Point, snake: Point[]) => {
      // Wall
      if (head.x < 0 || head.x >= CELL_COUNT || head.y < 0 || head.y >= CELL_COUNT) return true
      // Self (ignore head)
      for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) return true
      }
      return false
    }

    const tick = setInterval(() => {
      const state = gameStateRef.current
      if (state.gameOver || state.isStarting || state.isStarting === undefined) return

      // Process Input Queue (Buffering)
      if (state.inputQueue.length > 0) {
        const nextDir = state.inputQueue.shift()!
        // Double check validity against current actual direction to be safe
        const currentDir = isHost ? state.direction1 : state.direction2
        // Prevent 180 turns (redundant check but safe)
        const isOpposite = 
          (nextDir === 'UP' && currentDir === 'DOWN') ||
          (nextDir === 'DOWN' && currentDir === 'UP') ||
          (nextDir === 'LEFT' && currentDir === 'RIGHT') ||
          (nextDir === 'RIGHT' && currentDir === 'LEFT')
        
        if (!isOpposite) {
          if (isHost) {
            setDirection1(nextDir)
            state.direction1 = nextDir
          } else {
            setDirection2(nextDir)
            state.direction2 = nextDir
          }
          
          // Broadcast my move
          channelRef.current?.send({
            type: 'broadcast',
            event: 'input',
            payload: {
              playerId,
              direction: nextDir,
              head: isHost ? state.snake1[0] : state.snake2[0]
            }
          })
        }
      }

      // Move Snakes
      const newHead1 = moveSnake(state.snake1, state.direction1)
      const newHead2 = moveSnake(state.snake2, state.direction2)

      // Check Collisions (Local Player Logic)
      // If I am Host, I check Snake 1. If I am P2, I check Snake 2.
      // Also check head-to-head or head-to-body of opponent
      
      let myDeath = false
      let opponentDeath = false

      if (isHost) {
        if (checkCollision(newHead1, state.snake1)) myDeath = true
        // Check collision with opponent body
        if (state.snake2.some(p => p.x === newHead1.x && p.y === newHead1.y)) myDeath = true
        // Head to Head
        if (newHead1.x === newHead2.x && newHead1.y === newHead2.y) {
          myDeath = true
          opponentDeath = true // Draw? Or both die?
        }
      } else {
        if (checkCollision(newHead2, state.snake2)) myDeath = true
        if (state.snake1.some(p => p.x === newHead2.x && p.y === newHead2.y)) myDeath = true
        if (newHead2.x === newHead1.x && newHead2.y === newHead1.y) {
          myDeath = true
          opponentDeath = true
        }
      }

      if (myDeath) {
        // I died, so opponent wins
        const winnerId = isHost ? state.snake2 /* we don't have opponent ID easily here, assume P2 */ : state.snake1
        // Actually we need the IDs.
        // Let's just say "Opponent Wins"
        // Broadcast Game Over
        const winnerIdStr = isHost ? 'player2' : 'player1' // Simplified
        channelRef.current?.send({
          type: 'broadcast',
          event: 'game-over',
          payload: { winnerId: winnerIdStr }
        })
        handleGameOver(winnerIdStr)
        return
      }

      // Food Logic
      let grow1 = false
      let grow2 = false

      if (newHead1.x === state.food.x && newHead1.y === state.food.y) {
        grow1 = true
        if (isHost) {
          const newFood = generateFood()
          setFood(newFood)
          state.food = newFood
          channelRef.current?.send({
            type: 'broadcast',
            event: 'food-update',
            payload: newFood
          })
        }
      }

      if (newHead2.x === state.food.x && newHead2.y === state.food.y) {
        grow2 = true
        if (isHost) {
           // Host handles food respawn even if P2 eats
           const newFood = generateFood()
           setFood(newFood)
           state.food = newFood
           channelRef.current?.send({
             type: 'broadcast',
             event: 'food-update',
             payload: newFood
           })
        }
      }

      // Update State
      const updateSnake = (snake: Point[], newHead: Point, grow: boolean) => {
        const newSnake = [newHead, ...snake]
        if (!grow) newSnake.pop()
        return newSnake
      }

      const nextSnake1 = updateSnake(state.snake1, newHead1, grow1)
      const nextSnake2 = updateSnake(state.snake2, newHead2, grow2)

      setSnake1(nextSnake1)
      setSnake2(nextSnake2)
      
    }, TICK_RATE)

    return () => clearInterval(tick)
  }, [gameOver, isHost, playerId, code, isStarting])

  const handleGameOver = async (winnerId: string) => {
    setGameOver(true)
    setWinner(winnerId)
    
    // Update DB if Host
    if (isHost) {
      await supabase
        .from('games')
        .update({
          status: 'finished',
          winner_id: winnerId === 'player1' ? playerId : null // Simplified
        })
        .eq('id', gameId)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-green-500 font-mono">
      <div className="mb-4 flex justify-between w-full max-w-md px-4">
        <div className={`flex items-center gap-2 ${isHost ? 'text-white' : 'text-zinc-500'}`}>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>YOU (P1)</span>
        </div>
        <div className={`flex items-center gap-2 ${!isHost ? 'text-white' : 'text-zinc-500'}`}>
          <span>OPPONENT (P2)</span>
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
        </div>
      </div>

      <div 
        className="relative bg-black border-2 border-zinc-800 shadow-[0_0_30px_rgba(34,197,94,0.1)]"
        style={{ 
          width: GRID_SIZE * CELL_COUNT, 
          height: GRID_SIZE * CELL_COUNT 
        }}
      >
        {/* Grid Lines (Optional) */}
        <div className="absolute inset-0 grid grid-cols-20 grid-rows-20 pointer-events-none opacity-10">
          {Array.from({ length: 400 }).map((_, i) => (
            <div key={i} className="border border-green-500/30"></div>
          ))}
        </div>

        {/* Food */}
        <div 
          className="absolute bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.8)] animate-pulse"
          style={{
            left: food.x * GRID_SIZE,
            top: food.y * GRID_SIZE,
            width: GRID_SIZE,
            height: GRID_SIZE,
          }}
        />

        {/* Snake 1 (Green) */}
        {snake1.map((segment, i) => (
          <div
            key={`s1-${i}`}
            className={`absolute ${i === 0 ? 'bg-green-400 z-10' : 'bg-green-600'}`}
            style={{
              left: segment.x * GRID_SIZE,
              top: segment.y * GRID_SIZE,
              width: GRID_SIZE,
              height: GRID_SIZE,
              borderRadius: i === 0 ? '4px' : '2px'
            }}
          />
        ))}

        {/* Snake 2 (Red) */}
        {snake2.map((segment, i) => (
          <div
            key={`s2-${i}`}
            className={`absolute ${i === 0 ? 'bg-red-400 z-10' : 'bg-red-600'}`}
            style={{
              left: segment.x * GRID_SIZE,
              top: segment.y * GRID_SIZE,
              width: GRID_SIZE,
              height: GRID_SIZE,
              borderRadius: i === 0 ? '4px' : '2px'
            }}
          />
        ))}

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
            <Trophy size={48} className="text-yellow-500 mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">GAME OVER</h2>
            <p className="text-xl text-zinc-400 mb-6">
              {winner === (isHost ? 'player1' : 'player2') ? 'YOU WON!' : 'YOU LOST'}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-green-600 hover:bg-green-500 text-black font-bold py-2 px-6 rounded transition-colors"
            >
              PLAY AGAIN
            </button>
          </div>
        )}

        {/* Countdown Overlay */}
        {isStarting && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="text-8xl font-bold text-white animate-bounce">
              {countdown}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 text-zinc-500 text-sm">
        Use ARROW KEYS to move
      </div>
    </div>
  )
}
