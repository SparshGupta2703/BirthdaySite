import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Play, ShoppingCart, Clock, Trophy, Scissors, Music, Music2 } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { supabase } from '../supabase'; 

const playSound = (soundFile) => {
  const audio = new Audio(`/${soundFile}`);
  audio.play().catch(e => console.log("Audio prevented:", e));
};

const useTypewriter = (text, speed = 45, startDelay = 800) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let interval;
    const timeout = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        setDisplayed(text.substring(0, i + 1));
        i++;
        if (i === text.length) { clearInterval(interval); setDone(true); }
      }, speed);
    }, startDelay);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [text, speed, startDelay]);

  return { displayed, done };
};

// --- RESPONSIVE GOOGLY EYES ---
const GooglyEye = ({ left, top, mouseX, mouseY }) => {
  // Using percentages so the pupil stays inside the eye on all screen sizes
  const pupilX = useTransform(mouseX, [0, 1], ['-45%', '45%']);
  const pupilY = useTransform(mouseY, [0, 1], ['-45%', '45%']);

  return (
    <div 
      className="absolute bg-white rounded-full flex items-center justify-center z-10 aspect-square"
      // Width is exactly 12% of the total 3:4 container width. Scales perfectly!
      style={{ left, top, width: '12%', transform: 'translate(-50%, -50%)', boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.6), 0 5px 15px rgba(0,0,0,0.8)' }}
    >
      <motion.div 
        className="w-[45%] h-[45%] bg-black rounded-full shadow-[inset_0_-2px_5px_rgba(255,255,255,0.4)]"
        style={{ x: pupilX, y: pupilY }}
      />
    </div>
  );
};

// --- MOBILE-OPTIMIZED 3D PARALLAX BACKGROUND ---
const FullscreenInteractiveBackground = ({ imageUrl, bites, cakeMarks, cowPhase }) => {
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  // Softened the tilt degrees (5 and -5) so it doesn't clip off the screen on mobile
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [5, -5]), { stiffness: 100, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-5, 5]), { stiffness: 100, damping: 30 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (cowPhase !== 'idle') return;
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };

    const handleOrientation = (e) => {
      if (cowPhase !== 'idle') return;
      let { beta, gamma } = e;
      if (beta === null || gamma === null) return;
      
      beta = Math.max(-45, Math.min(45, beta)); 
      gamma = Math.max(-45, Math.min(45, gamma)); 
      
      mouseX.set((gamma + 45) / 90);
      mouseY.set((beta + 45) / 90);
    };

    const handleMouseLeave = () => { mouseX.set(0.5); mouseY.set(0.5); };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [cowPhase, mouseX, mouseY]);

  return (
    <div className="fixed inset-0 z-0 bg-black overflow-hidden pointer-events-none" style={{ perspective: '1200px' }}>
      <motion.div 
        style={{ rotateX, rotateY, scale: 1.15, transformStyle: "preserve-3d" }} 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-full h-full"
      >
        {/* MAGIC ASPECT RATIO BOX: Always covers viewport, always maintains exactly 3:4 */}
        <div 
          className="relative pointer-events-none shadow-[0_0_100px_rgba(0,0,0,1)]"
          style={{ width: 'max(100vw, 75dvh)', height: 'max(133.33vw, 100dvh)' }}
        >
          <img src={imageUrl} alt="Background" className="w-full h-full object-cover" />
          
          <GooglyEye left="28%" top="35%" mouseX={mouseX} mouseY={mouseY} />
          <GooglyEye left="72%" top="35%" mouseX={mouseX} mouseY={mouseY} />
          
          {bites >= 1 && <div className="absolute -top-[10%] -right-[10%] w-[50vw] h-[50vw] bg-black rounded-full" />}
          {bites >= 2 && <div className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] bg-black rounded-full" />}
          {bites >= 3 && <div className="absolute inset-0 bg-black" />} 
          
          {cakeMarks.length > 0 && (
            <div className="absolute inset-0 opacity-80 pointer-events-none z-20">
              {cakeMarks.map((mark) => (
                <svg key={mark.id} viewBox="0 0 100 100" className="absolute w-24 h-24 sm:w-40 sm:h-40 fill-blue-500/80 drop-shadow-xl" style={{ top: mark.top, left: mark.left, transform: `rotate(${mark.rotation}deg)` }}>
                  <path d="M50 10 C 60 30, 80 20, 75 40 C 95 45, 80 60, 90 75 C 70 70, 60 95, 50 80 C 40 95, 30 70, 10 75 C 20 60, 5 45, 25 40 C 20 20, 40 30, 50 10 Z" />
                </svg>
              ))}
            </div>
          )}
        </div>
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/90 pointer-events-none" />
    </div>
  );
};

// --- CUSTOM NAME INPUT MODAL ---
const NamePromptModal = ({ isOpen, onSubmit, onCancel, title }) => {
  const [name, setName] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl animate-[fadeRise_0.3s_ease-out_forwards]">
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{title || "Enter Your Name"}</h3>
        <p className="text-zinc-400 text-xs sm:text-sm mb-6">We need your name to log your scores globally.</p>
        <input type="text" placeholder="Your name..." value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors mb-6" autoFocus />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-3 rounded-xl text-white bg-white/10 hover:bg-white/20 font-bold transition-colors text-sm sm:text-base">Cancel</button>
          <button onClick={() => { if(name.trim()) onSubmit(name.trim()); }} className="flex-1 px-4 py-3 rounded-xl text-black bg-yellow-500 hover:bg-yellow-400 font-bold transition-colors text-sm sm:text-base">Submit</button>
        </div>
      </div>
    </div>
  );
};

// --- SCROLL ANIMATION COMPONENT ---
const FadeInOnScroll = ({ children, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setTimeout(() => setIsVisible(true), delay); observer.unobserve(ref.current); }
    }, { threshold: 0.1, rootMargin: '50px' });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);
  return <div ref={ref} className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>{children}</div>;
};

// --- GAME: CUT THE CAKE ---
const CutTheCake = ({ wishId, addCurrency, showToast, visitorName, setVisitorName }) => {
  const [target, setTarget] = useState(0);
  const [cut, setCut] = useState(null);
  const [accuracy, setAccuracy] = useState(0);
  const [phase, setPhase] = useState('playing'); 
  const [leaderboard, setLeaderboard] = useState([]);
  const [inputName, setInputName] = useState(visitorName || '');
  const [knifePos, setKnifePos] = useState(50);
  const cakeRef = useRef(null);

  const startNewGame = () => {
    setTarget(Math.floor(Math.random() * 60) + 20); 
    setCut(null);
    setPhase('playing');
  };

  useEffect(() => { startNewGame(); }, []);

  const handleMouseMove = (e) => {
    if (phase !== 'playing' || !cakeRef.current) return;
    const rect = cakeRef.current.getBoundingClientRect();
    // Support for both mouse and touch events
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setKnifePos((x / rect.width) * 100);
  };

  const handleCut = () => {
    if (phase !== 'playing') return;
    const finalCut = knifePos;
    const acc = Math.max(0, 100 - Math.abs(target - finalCut));
    
    setCut(finalCut);
    setAccuracy(acc);
    setPhase('result');
    playSound('whack.mp3'); 

    if (acc >= 98) { addCurrency(10); showToast("Perfect Cut! +10 Coins 🎂"); playSound('cha-ching.mp3'); }
    else if (acc >= 90) { addCurrency(3); showToast("Great Cut! +3 Coins 🪙"); }
    else { showToast("Sloppy Cut! 0 Coins ❌"); playSound('fart.mp3'); }
  };

  const submitScore = async () => {
    if (!inputName.trim()) { showToast("Enter a name first!"); return; }
    setVisitorName(inputName.trim()); 
    await supabase.from('cake_cuts').insert([{ wish_id: wishId, name: inputName.trim(), accuracy: parseFloat(accuracy.toFixed(1)) }]);
    showToast("Score Submitted to Leaderboard!");
    fetchLeaderboard();
  };

  const fetchLeaderboard = async () => {
    const { data } = await supabase.from('cake_cuts').select('*').eq('wish_id', wishId).order('accuracy', { ascending: false }).limit(5);
    if (data) setLeaderboard(data);
    setPhase('leaderboard');
  };

  return (
    <div className="bg-zinc-900/90 border border-white/10 rounded-3xl p-5 sm:p-6 flex flex-col shadow-2xl relative z-20 pointer-events-auto backdrop-blur-md min-h-[320px] sm:min-h-[360px]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl sm:text-2xl text-white font-medium flex items-center gap-2"><Scissors size={18}/> Cut the Cake</h3>
        <button onClick={fetchLeaderboard} className="text-zinc-400 hover:text-yellow-400 transition-colors"><Trophy size={18}/></button>
      </div>

      {phase === 'playing' && (
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <p className="text-zinc-300 text-sm sm:text-base mb-4">Target: <span className="text-yellow-500 font-bold text-lg">{target}%</span></p>
          
          <div 
            ref={cakeRef}
            onMouseMove={handleMouseMove}
            onTouchMove={handleMouseMove}
            onPointerDown={handleCut}
            className="w-40 h-40 sm:w-48 sm:h-48 rounded-full relative overflow-hidden cursor-crosshair shadow-[0_0_20px_rgba(0,0,0,0.5)] bg-zinc-800 touch-none"
          >
            <img src="/cake-top.png" className="absolute inset-0 w-full h-full object-cover pointer-events-none" alt="Cake Top" />
            <div className="absolute top-0 bottom-0 w-1 bg-white/80 shadow-[0_0_10px_white] pointer-events-none" style={{ left: `${knifePos}%` }} />
          </div>
          <p className="text-[10px] sm:text-xs text-zinc-500 mt-4">Tap to drop the knife!</p>
        </div>
      )}

      {phase === 'result' && (
        <div className="flex-1 flex flex-col items-center justify-center animate-[fadeRise_0.5s_ease-out_forwards]">
          <p className="text-white text-lg sm:text-xl mb-4">Accuracy: <span className={accuracy >= 90 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>{accuracy.toFixed(1)}%</span></p>
          
          <div className="w-48 h-40 sm:w-56 sm:h-48 relative flex justify-center items-center mb-6 pointer-events-none">
            <motion.div initial={{ x: 0, opacity: 1 }} animate={{ x: -15, opacity: 0.8 }} transition={{ duration: 0.5, ease: "easeOut" }} className="absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-zinc-800 overflow-hidden" style={{ clipPath: `polygon(0 0, ${cut}% 0, ${cut}% 100%, 0 100%)` }}>
                <img src="/cake-top.png" className="w-full h-full object-cover" />
              </div>
            </motion.div>
            <motion.div initial={{ x: 0, opacity: 1 }} animate={{ x: 15, opacity: 0.8 }} transition={{ duration: 0.5, ease: "easeOut" }} className="absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-zinc-800 overflow-hidden" style={{ clipPath: `polygon(${cut}% 0, 100% 0, 100% 100%, ${cut}% 100%)` }}>
                <img src="/cake-top.png" className="w-full h-full object-cover" />
              </div>
            </motion.div>
          </div>

          <div className="w-full space-y-3">
            <div className="flex gap-2">
              <input type="text" value={inputName} onChange={(e) => setInputName(e.target.value)} placeholder="Name for board" className="flex-1 bg-black border border-white/20 rounded-lg px-3 py-2 text-white text-xs sm:text-sm" />
              <button onClick={submitScore} className="bg-yellow-500 text-black px-4 py-2 rounded-lg text-xs sm:text-sm font-bold">Submit</button>
            </div>
            <button onClick={startNewGame} className="w-full bg-white/10 text-white py-2 rounded-lg text-xs sm:text-sm font-bold hover:bg-white/20 transition-colors">Play Again</button>
          </div>
        </div>
      )}

      {phase === 'leaderboard' && (
        <div className="flex-1 flex flex-col animate-[fadeRise_0.5s_ease-out_forwards]">
          <h4 className="text-yellow-500 font-bold mb-4 text-center">Top Slicers</h4>
          <div className="flex-1 space-y-2 mb-4">
            {leaderboard.length === 0 ? <p className="text-zinc-500 text-center text-sm mt-4">No scores yet!</p> : leaderboard.map((entry, i) => (
              <div key={i} className="flex justify-between items-center bg-black/50 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm">
                <span className="text-white font-medium truncate pr-2">{i + 1}. {entry.name}</span>
                <span className="text-yellow-500 font-bold shrink-0">{entry.accuracy}%</span>
              </div>
            ))}
          </div>
          <button onClick={startNewGame} className="w-full bg-white/10 text-white py-2 rounded-lg text-xs sm:text-sm font-bold hover:bg-white/20 transition-colors mt-auto">Back to Game</button>
        </div>
      )}
    </div>
  );
};

// --- GAME: WHACK-A-MOLE ---
const WhackAMole = ({ imageUrl, name, addCurrency }) => {
  const [activeHole, setActiveHole] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!playing || timeLeft <= 0) {
      if (timeLeft === 0 && playing) setPlaying(false);
      return;
    }
    const holeInterval = setInterval(() => setActiveHole(Math.floor(Math.random() * 9)), 600); 
    const timerInterval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => { clearInterval(holeInterval); clearInterval(timerInterval); };
  }, [playing, timeLeft]);

  const whack = (index) => {
    if (index === activeHole && playing) {
      playSound('whack.mp3'); 
      addCurrency(2); setActiveHole(null); 
      confetti({ particleCount: 15, spread: 40, origin: { y: 0.8 }, colors: ['#facc15', '#ffffff'] });
    }
  };

  return (
    <div className="bg-zinc-900/90 border border-white/10 rounded-3xl p-5 sm:p-6 flex flex-col items-center shadow-2xl relative z-20 pointer-events-auto backdrop-blur-md h-full min-h-[320px] sm:min-h-[360px]">
      <h3 className="text-xl sm:text-2xl text-white mb-2 font-medium">Whack-a-{name}</h3>
      <div className="flex gap-4 mb-6 text-zinc-400 text-xs sm:text-sm font-medium">
        <span className="flex items-center gap-1"><Clock size={14}/> {timeLeft}s</span>
        <span>Earns: 2 Coins</span>
      </div>
      {!playing && timeLeft === 0 ? (
        <button onClick={() => { setPlaying(true); setTimeLeft(15); }} className="flex items-center gap-2 bg-yellow-500 text-black px-5 py-3 rounded-full font-bold hover:bg-yellow-400 mb-4 transition-transform active:scale-95 mt-auto text-sm sm:text-base"><Play size={16} /> Start (15s)</button>
      ) : (
        <div className="grid grid-cols-3 gap-2 w-full max-w-[180px] sm:max-w-[200px] mb-4 mt-auto">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
            <div key={index} className="aspect-square bg-black rounded-xl overflow-hidden relative border border-white/5 cursor-pointer touch-none" onPointerDown={() => whack(index)}>
              <div className="absolute bottom-0 w-full h-1/3 bg-black/60 rounded-t-full z-10 pointer-events-none" />
              <img src={imageUrl} alt="Face" className={`absolute bottom-0 w-full h-[80%] object-cover object-top rounded-t-full transition-transform duration-100 ${activeHole === index ? 'translate-y-0' : 'translate-y-full'}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- GAME: FLAPPY BIRD ---
const FlappyBird = ({ imageUrl, name, addCurrency }) => {
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  
  const birdY = useRef(100);
  const velocity = useRef(0);
  const pipes = useRef([]);
  const frameId = useRef(null);
  const lastPipeTime = useRef(0);
  const [, setTick] = useState(0);

  const startGame = () => { birdY.current = 100; velocity.current = 0; pipes.current = []; setScore(0); setGameOver(false); setPlaying(true); lastPipeTime.current = Date.now(); };
  
  const jump = (e) => { 
    if (e) e.preventDefault(); 
    if (playing && !gameOver) { playSound('jump.mp3'); velocity.current = -7; }
  };

  useEffect(() => {
    if (!playing || gameOver) return;
    const gameLoop = () => {
      velocity.current += 0.5; 
      birdY.current += velocity.current;

      if (Date.now() - lastPipeTime.current > 2000) {
        pipes.current.push({ x: 300, gapTop: Math.random() * 80 + 20, passed: false });
        lastPipeTime.current = Date.now();
      }

      let hit = false;
      pipes.current.forEach(pipe => {
        pipe.x -= 3;
        if (pipe.x < 40 && !pipe.passed) { 
          pipe.passed = true; playSound('cha-ching.mp3'); setScore(s => { addCurrency(1); return s + 1; }); 
        }
        if (pipe.x < 60 && pipe.x + 40 > 40 && (birdY.current < pipe.gapTop || birdY.current + 20 > pipe.gapTop + 140)) hit = true;
      });

      pipes.current = pipes.current.filter(p => p.x > -50);
      if (birdY.current > 240 || birdY.current < -20) hit = true;

      if (hit) { playSound('fart.mp3'); setGameOver(true); setPlaying(false); }
      setTick(t => t + 1);
    };

    frameId.current = setInterval(gameLoop, 30);
    return () => clearInterval(frameId.current);
  }, [playing, gameOver, addCurrency]);

  return (
    <div className="bg-zinc-900/90 border border-white/10 rounded-3xl p-5 sm:p-6 flex flex-col items-center shadow-2xl relative z-20 pointer-events-auto backdrop-blur-md h-full min-h-[320px] sm:min-h-[360px]">
      <h3 className="text-xl sm:text-2xl text-white mb-2 font-medium">Flappy {name}</h3>
      <div className="flex gap-4 mb-4 text-zinc-400 text-xs sm:text-sm font-medium">
        <span>Score: {score}</span>
        <span>Earns: 1 Coin</span>
      </div>

      <div className="w-full max-w-[240px] h-40 sm:h-48 bg-sky-900/50 rounded-xl relative overflow-hidden border border-white/10 select-none touch-none mt-auto" onPointerDown={jump}>
        {(playing || gameOver) && (
          <img src={imageUrl} className="absolute w-6 h-6 rounded-full border-2 border-yellow-400 object-cover z-10" style={{ top: `${birdY.current}px`, left: '40px', transform: `rotate(${velocity.current * 4}deg)` }} />
        )}
        {pipes.current.map((pipe, i) => (
          <React.Fragment key={i}>
            <div className="absolute top-0 bg-green-500 border-2 border-green-700 w-10 rounded-b-md" style={{ left: `${pipe.x}px`, height: `${pipe.gapTop}px` }} />
            <div className="absolute bottom-0 bg-green-500 border-2 border-green-700 w-10 rounded-t-md" style={{ left: `${pipe.x}px`, top: `${pipe.gapTop + 140}px`, bottom: 0 }} />
          </React.Fragment>
        ))}
        {!playing && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <button onClick={startGame} className="bg-white text-black px-6 py-2 rounded-full font-bold text-sm sm:text-base">Play</button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80 z-20">
            <span className="text-lg sm:text-xl font-bold text-white mb-2">CRASHED!</span>
            <button onClick={startGame} className="bg-white text-black px-6 py-2 rounded-full font-bold text-sm sm:text-base">Retry</button>
          </div>
        )}
      </div>
      {playing && (
        <button onPointerDown={jump} className="md:hidden mt-4 w-full bg-yellow-500 text-black font-black py-3 rounded-xl active:scale-95 transition-transform select-none">
          JUMP!
        </button>
      )}
    </div>
  );
};

// --- MAIN HERO PAGE ---
export default function HeroPage() {
  const { data } = useParams(); 
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);
  const topRef = useRef(null);

  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef(new Audio('/bg-music.mp3'));

  const [currency, setCurrency] = useState(200); 
  const [visitorName, setVisitorName] = useState('');
  
  const [toasts, setToasts] = useState([]);
  const [pendingPrank, setPendingPrank] = useState(null); 
  
  const [hasFlies, setHasFlies] = useState(false);
  const [cakeMarks, setCakeMarks] = useState([]);

  const [cowPhase, setCowPhase] = useState('idle'); 
  const [bites, setBites] = useState(0); 
  const [isPieing, setIsPieing] = useState(false);

  useEffect(() => {
    audioRef.current.loop = true;
    audioRef.current.volume = 0.4; 
    return () => audioRef.current.pause();
  }, []);

  const toggleMusic = () => {
    if (isMusicPlaying) {
      audioRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.log("Audio play prevented"));
      setIsMusicPlaying(true);
    }
  };

  const showToast = (message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 4000);
  };

  useEffect(() => {
    const fetchWish = async () => {
      try {
        const { data: dbData, error: dbError } = await supabase.from('wishes').select('*').eq('id', data).single();
        if (dbError || !dbData || Date.now() > dbData.expires_at) { setError("Wish has expired."); return; }

        setParsedData({ n: dbData.name, i: dbData.image_url, m: dbData.message, s: dbData.sender_name });

        const tenMins = 10 * 60 * 1000;
        if (Date.now() - dbData.pooped_at < tenMins) {
          setHasFlies(true);
          showToast(`💩 ${dbData.pooped_by || 'Someone'} ruined this site with poop!`);
        }
        
        if (Date.now() - dbData.caked_at < tenMins) {
          setCakeMarks([{ id: 'initial_db', top: Math.random() * 70 + 10 + '%', left: Math.random() * 70 + 10 + '%', rotation: Math.random() * 360, timestamp: dbData.caked_at }]);
          if (!dbData.pooped_at || Date.now() - dbData.pooped_at >= tenMins) {
             showToast(`🎂 ${dbData.caked_by || 'Someone'} threw a cake at this!`);
          }
        }
      } catch (err) { setError("Network error."); }
    };
    fetchWish();
  }, [data]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCakeMarks(marks => marks.filter(m => now - m.timestamp < 10 * 60 * 1000));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const { displayed, done } = useTypewriter(parsedData?.m || "", 45, 800);
  const addCurrency = (amount) => setCurrency(prev => prev + amount);

  const handlePrankIntent = (cost, type) => {
    if (currency < cost || cowPhase !== 'idle') return;
    if (!visitorName) { setPendingPrank({ cost, type }); } 
    else { executePrank(cost, type, visitorName); }
  };

  const executePrank = async (cost, type, name) => {
    setPendingPrank(null);
    setCurrency(c => c - cost);
    playSound('cha-ching.mp3');
    topRef.current?.scrollIntoView({ behavior: 'smooth' });

    setTimeout(async () => {
      if (type === 'cow') {
        setCowPhase('shrinking');
        setTimeout(() => setCowPhase('walking'), 1500); 
        setTimeout(() => { setBites(1); playSound('bite.mp3'); }, 3500); 
        setTimeout(() => { setBites(2); playSound('bite.mp3'); }, 4000); 
        setTimeout(() => { setBites(3); playSound('bite.mp3'); }, 4500); 
        
        setTimeout(() => { setCowPhase('pooping'); playSound('fart.mp3'); }, 5500);
        setTimeout(() => setCowPhase('leaving'), 6500);
        setTimeout(() => setCowPhase('zooming'), 8000);

        setTimeout(async () => {
          setCowPhase('idle'); setBites(0); setHasFlies(true); playSound('buzz.mp3'); 
          showToast(`You deployed the cow!`);
          await supabase.from('wishes').update({ pooped_at: Date.now(), pooped_by: name }).eq('id', data);
        }, 11500);
      }

      if (type === 'pie') {
        setIsPieing(true);
        setTimeout(() => playSound('splat.mp3'), 1500);
        setTimeout(async () => {
          setIsPieing(false);
          setCakeMarks(prev => [...prev, { id: Date.now(), top: Math.random() * 70 + 5 + '%', left: Math.random() * 70 + 5 + '%', rotation: Math.random() * 360, timestamp: Date.now() }]);
          showToast(`You smashed a cake!`);
          await supabase.from('wishes').update({ caked_at: Date.now(), caked_by: name }).eq('id', data);
        }, 4500);
      }
    }, 800);
  };

  if (error) return <div className="h-screen flex items-center justify-center bg-black text-white text-2xl">{error}</div>;
  if (!parsedData) return <div className="h-screen bg-black" />;

  const getSiteTransform = () => {
    if (cowPhase === 'zooming') return 'scale-[4] -translate-y-[10vh] opacity-0'; 
    if (cowPhase !== 'idle') return 'scale-[0.25] translate-y-[20vh] rounded-[100px] shadow-[0_0_100px_black] pointer-events-none overflow-hidden'; 
    return 'scale-100 translate-y-0 opacity-100'; 
  };

  return (
    // overflow-x-hidden is crucial to prevent the tilted 3D background from causing horizontal scroll on phones
    <div className={`relative w-full min-h-dvh text-white z-10 transition-all duration-[1200ms] ease-in-out origin-center overflow-x-hidden ${getSiteTransform()}`}>
      
      <div ref={topRef} className="absolute top-0 left-0 w-full h-1" />

      {/* Name Input Modal */}
      <NamePromptModal 
        isOpen={!!pendingPrank} 
        onSubmit={(name) => { setVisitorName(name); executePrank(pendingPrank.cost, pendingPrank.type, name); }} 
        onCancel={() => setPendingPrank(null)} 
      />

      <div className={`fixed inset-0 z-[-1] transition-opacity duration-1000 bg-cover bg-center ${cowPhase !== 'idle' ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundImage: "url('/stable.jpg')" }} />

      {/* Dynamic Toast System */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center pointer-events-none w-full px-4">
        {toasts.map(toast => (
          <div key={toast.id} className="bg-zinc-900 border border-white/20 text-white px-6 py-3 rounded-full font-medium shadow-2xl animate-[fadeRise_0.5s_ease-out_forwards] text-sm whitespace-nowrap">
            {toast.message}
          </div>
        ))}
      </div>

      {/* HUD: Coins & Audio Controls */}
      <div className="fixed top-6 sm:top-10 right-4 sm:right-8 z-[60] flex flex-col gap-3 items-end">
        <div className="bg-black/80 backdrop-blur-md border border-yellow-500/50 text-yellow-400 px-4 py-2 rounded-full font-bold shadow-[0_0_15px_rgba(234,179,8,0.3)] text-sm sm:text-base">
          🪙 {currency} Coins
        </div>
        <button 
          onClick={toggleMusic}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all shadow-lg backdrop-blur-md border ${isMusicPlaying ? 'bg-pink-500/20 text-pink-300 border-pink-500/50' : 'bg-black/80 text-white/70 border-white/20 hover:text-white'}`}
        >
          {isMusicPlaying ? <Music size={14} className="animate-pulse" /> : <Music2 size={14} />}
          {isMusicPlaying ? 'Playing...' : 'Play Song'}
        </button>
      </div>

      <style>{`
        @keyframes flyBuzz { 0% { transform: translate(0, 0) rotate(0deg); } 25% { transform: translate(20px, -30px) rotate(45deg); } 50% { transform: translate(-30px, -10px) rotate(-20deg); } 75% { transform: translate(15px, 20px) rotate(60deg); } 100% { transform: translate(0, 0) rotate(0deg); } }
        .fly { animation: flyBuzz 2s infinite linear; position: absolute; font-size: 2rem; pointer-events: none; z-index: 50; }
        @keyframes cowWalkIn { 0% { transform: translateX(-150vw); } 100% { transform: translateX(-5vw); } }
        @keyframes cowWalkOut { 0% { transform: translateX(-5vw); } 100% { transform: translateX(150vw); } }
        @keyframes dropAndTilt { 0% { transform: translateY(-100vh) rotate(0deg); } 70% { transform: translateY(0) rotate(0deg); } 90% { transform: translateY(0) rotate(45deg); opacity: 1; } 100% { transform: translateY(0) rotate(90deg); opacity: 0; } }
        @keyframes splatExplode { 0% { transform: scale(0); opacity: 0; } 10% { transform: scale(1); opacity: 0.9; } 80% { transform: scale(1.1) translateY(5%); opacity: 0.9; } 100% { transform: scale(1.2) translateY(10%); opacity: 0; } }
        @keyframes poopDrop { 0% { transform: translate(-80px, -20px) scale(0); opacity: 0; } 100% { transform: translate(0, 40px) scale(1); opacity: 1; } }
        @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes fadeRise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* --- PRANK ANIMATIONS --- */}
      {(cowPhase !== 'idle' && cowPhase !== 'shrinking') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden">
          {(cowPhase === 'walking' || cowPhase === 'pooping' || cowPhase === 'leaving') && (
            <img src="/cow.png" className="absolute w-[40vw] max-w-[500px] object-contain drop-shadow-2xl z-[101]" style={{ animation: cowPhase === 'walking' ? 'cowWalkIn 2.5s ease-out forwards' : cowPhase === 'leaving' ? 'cowWalkOut 1.5s ease-in forwards' : 'none', transform: cowPhase === 'pooping' ? 'translateX(-5vw)' : '' }} />
          )}
          {(cowPhase === 'pooping' || cowPhase === 'leaving' || cowPhase === 'zooming') && (
            <div className="absolute inset-0 flex items-center justify-center z-[100]">
              <div className={`transition-transform duration-[2000ms] ${cowPhase === 'zooming' ? 'scale-[4]' : 'scale-100'}`}>
                <div className="relative animate-[poopDrop_0.4s_ease-in_forwards]">
                  <img src="/poop.png" className="w-[30vw] h-[30vw] max-w-[300px] max-h-[300px] object-contain drop-shadow-2xl" />
                  {cowPhase === 'zooming' && (
                    <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-1 opacity-0 animate-[fadeIn_0.5s_ease-out_0.5s_forwards]">
                      <img src={parsedData.i} className="w-8 h-8 rounded-full border border-black object-cover" />
                      <img src={parsedData.i} className="w-6 h-6 rounded-full border border-black object-cover" />
                      <img src={parsedData.i} className="w-10 h-10 rounded-full border border-black object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isPieing && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-center">
          <img src="/cake.png" className="w-64 h-64 sm:w-96 sm:h-96 object-contain animate-[dropAndTilt_1.5s_ease-in_forwards] relative z-[102]" />
          <div className="absolute inset-0 flex items-center justify-center z-[101]">
            <svg viewBox="0 0 100 100" className="w-[150vw] h-[150vw] opacity-0 animate-[splatExplode_3s_ease-out_1.2s_forwards]" style={{ fill: '#3b82f6' }}>
              <path d="M50 10 C 60 30, 80 20, 75 40 C 95 45, 80 60, 90 75 C 70 70, 60 95, 50 80 C 40 95, 30 70, 10 75 C 20 60, 5 45, 25 40 C 20 20, 40 30, 50 10 Z" />
            </svg>
          </div>
        </div>
      )}

      {/* THE FULLSCREEN 3D PARALLAX BACKGROUND WITH GOOGLY EYES */}
      <FullscreenInteractiveBackground 
        imageUrl={parsedData.i} 
        bites={bites} 
        cakeMarks={cakeMarks} 
        cowPhase={cowPhase} 
      />

      <nav className="fixed top-0 w-full z-50 px-5 py-4 flex justify-start pointer-events-none">
        <Link to="/" className="text-[14px] sm:text-[16px] text-white/70 hover:text-white bg-black/40 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full backdrop-blur-md border border-white/10 pointer-events-auto transition-colors">Create new wish</Link>
      </nav>

      <main className="relative z-10 min-h-[90dvh] flex flex-col justify-center px-5 sm:px-10 pointer-events-none pt-24">
        <div className="max-w-2xl mx-auto relative pointer-events-auto text-center w-full mt-auto mb-10">
          {hasFlies && (
            <>
              <div className="fly" style={{ top: '-50px', left: '10%', animationDelay: '0s' }}>🪰</div>
              <div className="fly" style={{ top: '50px', left: '-5%', animationDelay: '0.5s' }}>🪰</div>
              <div className="fly" style={{ top: '20px', right: '10%', animationDelay: '1s' }}>🪰</div>
            </>
          )}
          <h1 className="select-none mb-4 font-bold drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] tracking-tight" style={{ fontSize: 'clamp(32px, 8vw, 80px)', lineHeight: 1.1 }}>
            Happy Birthday,<br/>{parsedData.n}!
          </h1>
          <p className="text-white/90 mb-6 min-h-[60px] drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] font-medium" style={{ fontSize: 'clamp(18px, 4vw, 28px)', lineHeight: 1.4 }}>
            {displayed}
            {!done && <span className="inline-block w-[3px] h-[1em] bg-white align-middle ml-[4px]" style={{ animation: 'blink 1s step-end infinite' }} />}
          </p>
          <div className="text-white/80 text-[18px] sm:text-[24px] italic drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] font-medium">— From {parsedData.s || 'Anonymous'}</div>
        </div>
      </main>

      <section className="relative z-20 min-h-screen pt-20 pb-32 px-4 sm:px-8 md:px-10 bg-gradient-to-b from-transparent via-zinc-950/90 to-zinc-950/95 overflow-hidden">
        {/* Overlay to ensure readability on mobile */}
        <div className="absolute inset-0 bg-black/60 sm:bg-black/50 backdrop-blur-xl z-[-1]" />

        <div className="max-w-6xl mx-auto">
          <FadeInOnScroll delay={0}>
            <div className="text-center mb-10 sm:mb-16">
              <h2 className="text-3xl md:text-5xl text-white mb-2 sm:mb-4 font-bold tracking-tight">Earn Coins</h2>
            </div>
          </FadeInOnScroll>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20 sm:mb-24">
            <FadeInOnScroll delay={100}>
              <CutTheCake wishId={data} addCurrency={addCurrency} showToast={showToast} visitorName={visitorName} setVisitorName={setVisitorName} />
            </FadeInOnScroll>
            
            <FadeInOnScroll delay={200}>
              <WhackAMole imageUrl={parsedData.i} name={parsedData.n} addCurrency={addCurrency} />
            </FadeInOnScroll>
            
            <FadeInOnScroll delay={300}>
              <FlappyBird imageUrl={parsedData.i} name={parsedData.n} addCurrency={addCurrency} />
            </FadeInOnScroll>
          </div>

          <FadeInOnScroll delay={100}>
            <div className="text-center mb-8 sm:mb-10 pointer-events-auto">
              <ShoppingCart className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-3 sm:mb-4 text-yellow-500" />
              <h2 className="text-3xl md:text-5xl text-white mb-4 font-bold tracking-tight">The Prank Shop</h2>
            </div>
          </FadeInOnScroll>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto pointer-events-auto">
            <FadeInOnScroll delay={200}>
              <button onClick={() => handlePrankIntent(30, 'cow')} disabled={currency < 30} className="w-full flex items-center justify-between bg-black/50 border border-white/10 p-5 sm:p-6 rounded-3xl hover:bg-zinc-800 disabled:opacity-50 text-left transition-colors backdrop-blur-md">
                <div>
                  <h4 className="text-xl sm:text-2xl font-bold text-white mb-1">Cow Attack 🐄</h4>
                  <p className="text-zinc-400 text-xs sm:text-sm">A hungry cow eats their photo.</p>
                </div>
                <span className="font-bold text-yellow-500 bg-yellow-500/10 px-3 sm:px-4 py-2 rounded-full text-sm sm:text-base">30 Coins</span>
              </button>
            </FadeInOnScroll>

            <FadeInOnScroll delay={300}>
              <button onClick={() => handlePrankIntent(50, 'pie')} disabled={currency < 50} className="w-full flex items-center justify-between bg-black/50 border border-white/10 p-5 sm:p-6 rounded-3xl hover:bg-zinc-800 disabled:opacity-50 text-left transition-colors backdrop-blur-md">
                <div>
                  <h4 className="text-xl sm:text-2xl font-bold text-white mb-1">Cake Smash 🎂</h4>
                  <p className="text-zinc-400 text-xs sm:text-sm">Drop a giant cake on the screen.</p>
                </div>
                <span className="font-bold text-yellow-500 bg-yellow-500/10 px-3 sm:px-4 py-2 rounded-full text-sm sm:text-base">50 Coins</span>
              </button>
            </FadeInOnScroll>
          </div>
        </div>
      </section>
    </div>
  );
}