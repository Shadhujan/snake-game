'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Copy, Play, Users } from 'lucide-react'

interface LobbyProps {
  onGameStart: (gameId: string, playerId: string, isHost: boolean, code: string) => void
}

export default function Lobby({ onGameStart }: LobbyProps) {
  const [mode, setMode] = useState<'initial' | 'creating' | 'joining' | 'waiting'>('initial')
  const [gameCode, setGameCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [playerId] = useState(() => crypto.randomUUID())

  const createGame = async () => {
    setMode('creating')
    setError('')
    
    // Generate 6-char code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    
    const { data, error } = await supabase
      .from('games')
      .insert({
        code,
        player1_id: playerId,
        status: 'waiting'
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setMode('initial')
      return
    }

    setGameCode(code)
    setMode('waiting')

    // Subscribe to changes for this game
    const channel = supabase
      .channel(`game:${code}`)
      .on('broadcast', { event: 'player-joined' }, ({ payload }) => {
        if (payload.gameId === data.id) {
          onGameStart(data.id, playerId, true, code)
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
           await channel.track({ playerId })
        }
      })

    // Cleanup subscription on unmount is handled by the parent or when we switch views
    // But here we might want to keep it until game starts
  }

  const joinGame = async () => {
    setMode('joining')
    setError('')

    if (joinCode.length !== 6) {
      setError('Code must be 6 characters')
      setMode('initial')
      return
    }

    // Find the game
    const { data: game, error: fetchError } = await supabase
      .from('games')
      .select()
      .eq('code', joinCode.toUpperCase())
      .eq('status', 'waiting')
      .single()

    if (fetchError || !game) {
      setError('Game not found or already started')
      setMode('initial')
      return
    }

    // Join the game
    const { error: updateError } = await supabase
      .from('games')
      .update({
        player2_id: playerId,
        status: 'playing'
      })
      .eq('id', game.id)

    if (updateError) {
      setError(updateError.message)
      setMode('initial')
      return
    }

    // Broadcast join event
    const channel = supabase.channel(`game:${game.code}`)
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({
          type: 'broadcast',
          event: 'player-joined',
          payload: { gameId: game.id }
        })
        supabase.removeChannel(channel)
        onGameStart(game.id, playerId, false, game.code)
      }
    })
  }

  if (mode === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-green-500 font-mono p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-green-500/30 p-8 rounded-lg shadow-[0_0_20px_rgba(34,197,94,0.2)] text-center">
          <h2 className="text-2xl mb-6 animate-pulse">WAITING FOR OPPONENT</h2>
          
          <div className="mb-8">
            <p className="text-zinc-400 mb-2">SHARE THIS CODE</p>
            <div className="flex items-center justify-center gap-4 bg-black/50 p-4 rounded border border-green-500/20">
              <span className="text-4xl font-bold tracking-widest">{gameCode}</span>
              <button 
                onClick={() => navigator.clipboard.writeText(gameCode)}
                className="p-2 hover:bg-green-500/20 rounded transition-colors"
              >
                <Copy size={20} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-zinc-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
            <span>Scanning for player...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-green-500 font-mono p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-green-500/30 p-8 rounded-lg shadow-[0_0_20px_rgba(34,197,94,0.2)]">
        <h1 className="text-4xl font-bold text-center mb-2 tracking-tighter">NEON SNAKE</h1>
        <p className="text-center text-zinc-500 mb-8 text-sm">MULTIPLAYER BATTLE ARENA</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <button
            onClick={createGame}
            disabled={mode !== 'initial'}
            className="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-4 rounded transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <Play size={20} />
            CREATE NEW GAME
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900 px-2 text-zinc-500">Or join existing</span>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="ENTER CODE"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="flex-1 bg-black/50 border border-zinc-800 rounded px-4 py-3 text-center tracking-widest focus:outline-none focus:border-green-500 transition-colors"
            />
            <button
              onClick={joinGame}
              disabled={mode !== 'initial' || joinCode.length !== 6}
              className="bg-zinc-800 hover:bg-zinc-700 text-green-500 font-bold px-6 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              JOIN
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
