'use client'

import { useState } from 'react'
import Lobby from '@/components/Lobby'
import GameBoard from '@/components/GameBoard'

export default function Home() {
  const [gameState, setGameState] = useState<{
    status: 'lobby' | 'playing'
    gameId?: string
    playerId?: string
    isHost?: boolean
    code?: string
  }>({ status: 'lobby' })

  const handleGameStart = (gameId: string, playerId: string, isHost: boolean, code: string) => {
    setGameState({
      status: 'playing',
      gameId,
      playerId,
      isHost,
      code
    })
  }

  if (gameState.status === 'playing') {
    return <GameBoard 
      gameId={gameState.gameId!} 
      playerId={gameState.playerId!} 
      isHost={gameState.isHost!} 
      code={gameState.code!}
    />
  }

  return <Lobby onGameStart={handleGameStart} />
}
