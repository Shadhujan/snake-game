export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string
          code: string
          status: 'waiting' | 'playing' | 'finished'
          player1_id: string
          player2_id: string | null
          winner_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          status?: 'waiting' | 'playing' | 'finished'
          player1_id: string
          player2_id?: string | null
          winner_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          status?: 'waiting' | 'playing' | 'finished'
          player1_id?: string
          player2_id?: string | null
          winner_id?: string | null
          created_at?: string
        }
      }
    }
  }
}
