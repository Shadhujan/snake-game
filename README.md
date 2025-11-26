# Multiplayer Snake Game

A real-time multiplayer Snake game built with Next.js, TypeScript, and Supabase.

## 🚀 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Backend & Database**: [Supabase](https://supabase.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🏗️ Architecture

### Frontend
The application uses the Next.js App Router for structure and routing. The game logic is client-side, utilizing React hooks for state management and the game loop.

- **Game Loop**: A custom `useEffect` hook utilizing `setInterval` (or `requestAnimationFrame`) drives the game tick, updating snake positions and checking collisions.
- **Rendering**: The game board is rendered using standard HTML/CSS (Tailwind) or Canvas, optimized for performance.
- **State Management**:
  - **Local State**: React `useState` and `useRef` manage the immediate game state (snake bodies, food position, score).
  - **Input Handling**: Keyboard events are captured and buffered to prevent conflicting moves within a single tick.

### Multiplayer Synchronization
Real-time multiplayer functionality is powered by **Supabase Realtime**.

- **Channels**: The game uses Supabase Broadcast Channels to send ephemeral messages between clients with low latency.
- **Events**:
  - `input`: Broadcasts player direction changes to opponents.
  - `food-update`: Syncs food position when eaten.
  - `game-over`: Notifies all clients when a win/loss condition is met.
- **Presence**: Tracks connected players in a game room.

### Database
Supabase Postgres is used for persistent data (optional for the core gameplay loop but used for room management and history).

- **Tables**:
  - `games`: Stores game sessions, status, and results.
  - `players`: (Optional) Can store persistent player stats.

## 🛠️ Getting Started

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Shadhujan/snake-game.git
    cd snake-game
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env.local` file in the root directory with your Supabase credentials:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the development server**:
    ```bash
    npm run dev
    ```

5.  **Open the game**:
    Navigate to [http://localhost:3000](http://localhost:3000) in your browser. Open a second window to test multiplayer functionality.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).
