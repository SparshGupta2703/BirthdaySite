import React, { useState, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';

// Rebalanced game physics for smooth 30fps simulation
const GRAVITY = 0.8;
const JUMP = -10;
const PIPE_SPEED = 3;
const PIPE_SPAWN_RATE = 1800; // ms

export default function FlappyBird({ imageUrl, name, addCurrency }) {
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  
  const birdY = useRef(100);
  const velocity = useRef(0);
  const pipes = useRef([]);
  const frameId = useRef(null);
  const lastPipeTime = useRef(0);

  const [, setTick] = useState(0);

  const startGame = () => {
    birdY.current = 100;
    velocity.current = 0;
    pipes.current = [];
    setScore(0);
    setGameOver(false);
    setPlaying(true);
    lastPipeTime.current = Date.now();
  };

  const jump = (e) => {
    // Prevent default to stop mobile scrolling when tapping fast
    if (e) e.preventDefault(); 
    if (playing && !gameOver) {
      velocity.current = JUMP;
    }
  };

  useEffect(() => {
    if (!playing || gameOver) return;

    const gameLoop = () => {
      velocity.current += GRAVITY;
      birdY.current += velocity.current;

      if (Date.now() - lastPipeTime.current > PIPE_SPAWN_RATE) {
        const gapTop = Math.random() * 100 + 40; 
        pipes.current.push({ x: 300, gapTop, passed: false });
        lastPipeTime.current = Date.now();
      }

      let hit = false;
      const BIRD_SIZE = 28; 
      const BIRD_X = 40; 

      pipes.current.forEach(pipe => {
        pipe.x -= PIPE_SPEED;

        if (pipe.x < BIRD_X && !pipe.passed) {
          pipe.passed = true;
          setScore(s => {
            const newScore = s + 1;
            addCurrency(1); 
            return newScore;
          });
        }

        const hitX = pipe.x < BIRD_X + BIRD_SIZE && pipe.x + 40 > BIRD_X;
        const hitTop = birdY.current < pipe.gapTop;
        const hitBottom = birdY.current + BIRD_SIZE > pipe.gapTop + 100; 

        if (hitX && (hitTop || hitBottom)) hit = true;
      });

      pipes.current = pipes.current.filter(p => p.x > -50);

      // Floor/Ceiling constraints
      if (birdY.current > 240 || birdY.current < -20) hit = true;

      if (hit) {
        setGameOver(true);
        setPlaying(false);
      }

      setTick(t => t + 1);
    };

    frameId.current = setInterval(gameLoop, 30);
    return () => clearInterval(frameId.current);
  }, [playing, gameOver, addCurrency]);

  return (
    <div className="bg-black/40 border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-2xl relative z-20 pointer-events-auto w-full">
      <h3 className="text-2xl sm:text-3xl text-white mb-2 font-medium">Flappy {name}</h3>
      <div className="flex gap-4 mb-4 sm:mb-6 text-zinc-400 font-medium text-sm sm:text-base">
        <span>Score: {score}</span>
        <span>Earns: 1 Coin/Pipe</span>
      </div>

      <div 
        className="w-full max-w-sm h-64 bg-sky-900/50 rounded-2xl relative overflow-hidden border border-white/10 cursor-pointer select-none touch-none"
        onPointerDown={jump}
      >
        {/* Bird */}
        {(playing || gameOver) && (
          <img 
            src={imageUrl} 
            alt="Bird" 
            className="absolute w-8 h-8 rounded-full border-2 border-yellow-400 object-cover z-10"
            style={{ 
              top: `${birdY.current}px`, 
              left: '40px',
              transform: `rotate(${velocity.current * 3}deg)` 
            }}
          />
        )}

        {/* Pipes */}
        {pipes.current.map((pipe, i) => (
          <React.Fragment key={i}>
            <div className="absolute top-0 bg-green-500 border-2 border-green-700 w-10 rounded-b-md" style={{ left: `${pipe.x}px`, height: `${pipe.gapTop}px` }} />
            <div className="absolute bottom-0 bg-green-500 border-2 border-green-700 w-10 rounded-t-md" style={{ left: `${pipe.x}px`, top: `${pipe.gapTop + 100}px`, bottom: 0 }} />
          </React.Fragment>
        ))}

        {/* UI Overlays */}
        {!playing && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <button onClick={startGame} className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-zinc-200">
              <Play size={18} /> Play
            </button>
          </div>
        )}
        
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80 z-20">
            <span className="text-2xl font-bold text-white mb-4">CRASHED!</span>
            <button onClick={startGame} className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-zinc-200">
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Mobile-only Jump Button */}
      {playing && (
        <button 
          onPointerDown={jump}
          className="md:hidden mt-6 w-full max-w-sm bg-yellow-500 text-black font-black text-xl py-4 rounded-xl active:bg-yellow-600 active:scale-95 transition-all select-none"
        >
          JUMP!
        </button>
      )}
      <p className="text-zinc-500 text-xs sm:text-sm mt-4 hidden md:block">Click the game box to fly!</p>
    </div>
  );
}