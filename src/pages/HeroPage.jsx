import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Menu, X, Play, ShoppingCart, Clock } from 'lucide-react';
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

// --- GAME 1: WHACK-A-MOLE ---
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
      playSound('whack.mp3'); // Sound added!
      addCurrency(2); setActiveHole(null); 
      confetti({ particleCount: 15, spread: 40, origin: { y: 0.8 }, colors: ['#facc15', '#ffffff'] });
    }
  };

  return (
    <div className="bg-zinc-900/90 border border-white/10 rounded-3xl p-6 flex flex-col items-center shadow-2xl relative z-20 pointer-events-auto backdrop-blur-md">
      <h3 className="text-2xl text-white mb-2 font-medium">Whack-a-{name}</h3>
      <div className="flex gap-4 mb-6 text-zinc-400 text-sm font-medium">
        <span className="flex items-center gap-1"><Clock size={14}/> {timeLeft}s</span>
        <span>Earns: 2 Coins</span>
      </div>
      {!playing && timeLeft === 0 ? (
        <button onClick={() => { setPlaying(true); setTimeLeft(15); }} className="flex items-center gap-2 bg-yellow-500 text-black px-6 py-3 rounded-full font-bold hover:bg-yellow-400 mb-4 transition-transform active:scale-95"><Play size={18} /> Start (15s)</button>
      ) : (
        <div className="grid grid-cols-3 gap-2 w-full max-w-[200px] mb-4">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
            <div key={index} className="aspect-square bg-black rounded-xl overflow-hidden relative border border-white/5 cursor-pointer" onClick={() => whack(index)}>
              <div className="absolute bottom-0 w-full h-1/3 bg-black/60 rounded-t-full z-10 pointer-events-none" />
              <img src={imageUrl} alt="Face" className={`absolute bottom-0 w-full h-[80%] object-cover object-top rounded-t-full transition-transform duration-100 ${activeHole === index ? 'translate-y-0' : 'translate-y-full'}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- GAME 2: DIZZY SPIN ---
const SpinTheFace = ({ imageUrl, name, addCurrency }) => {
  const [clicks, setClicks] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!playing || timeLeft <= 0) { if (timeLeft === 0 && playing) setPlaying(false); return; }
    const timerInterval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timerInterval);
  }, [playing, timeLeft]);

  return (
    <div className="bg-zinc-900/90 border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center shadow-2xl text-center relative z-20 pointer-events-auto backdrop-blur-md">
      <h3 className="text-2xl text-white mb-2 font-medium">Dizzy {name}</h3>
      <div className="flex gap-4 mb-6 text-zinc-400 text-sm font-medium">
        <span className="flex items-center gap-1"><Clock size={14}/> {timeLeft}s</span>
        <span>Earns: 1 Coin/Click</span>
      </div>
      {!playing && timeLeft === 0 ? (
        <button onClick={() => { setClicks(0); setPlaying(true); setTimeLeft(10); }} className="flex items-center gap-2 bg-yellow-500 text-black px-6 py-3 rounded-full font-bold hover:bg-yellow-400 mb-4 transition-transform active:scale-95"><Play size={18} /> Start (10s)</button>
      ) : (
        <button onClick={() => { if (playing) { playSound('spin.wav'); setClicks(c => c + 1); addCurrency(1); } }} className="relative group cursor-pointer focus:outline-none transition-transform active:scale-90">
          <div className="absolute inset-0 bg-white/10 blur-xl rounded-full" />
          <img src={imageUrl} alt="Spinning" className="relative w-32 h-32 rounded-full border-4 border-white object-cover shadow-2xl" style={{ transition: 'transform 0.1s linear', transform: `rotate(${clicks * 45}deg) scale(${1 + (clicks % 5 === 0 && clicks > 0 ? 0.1 : 0)})` }} />
        </button>
      )}
      <p className="text-zinc-500 mt-6 text-sm h-6">{clicks > 0 && `Spun ${clicks} times!`}</p>
    </div>
  );
};

// --- GAME 3: FLAPPY BIRD (OPTIMIZED) ---
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
    if (playing && !gameOver) {
      playSound('jump.mp3'); // Sound added!
      velocity.current = -7; // Soft jump
    }
  };

  useEffect(() => {
    if (!playing || gameOver) return;
    const gameLoop = () => {
      velocity.current += 0.5; // Soft gravity
      birdY.current += velocity.current;

      if (Date.now() - lastPipeTime.current > 2000) {
        pipes.current.push({ x: 300, gapTop: Math.random() * 80 + 20, passed: false });
        lastPipeTime.current = Date.now();
      }

      let hit = false;
      pipes.current.forEach(pipe => {
        pipe.x -= 3;
        if (pipe.x < 40 && !pipe.passed) { 
          pipe.passed = true; 
          playSound('cha-ching.mp3'); // Score sound!
          setScore(s => { addCurrency(1); return s + 1; }); 
        }
        
        // Gap size is 140 for easy playing
        if (pipe.x < 60 && pipe.x + 40 > 40 && (birdY.current < pipe.gapTop || birdY.current + 20 > pipe.gapTop + 140)) hit = true;
      });

      pipes.current = pipes.current.filter(p => p.x > -50);
      if (birdY.current > 240 || birdY.current < -20) hit = true;

      if (hit) { 
        playSound('fart.mp3'); // Crash sound!
        setGameOver(true); 
        setPlaying(false); 
      }
      setTick(t => t + 1);
    };

    frameId.current = setInterval(gameLoop, 30);
    return () => clearInterval(frameId.current);
  }, [playing, gameOver, addCurrency]);

  return (
    <div className="bg-zinc-900/90 border border-white/10 rounded-3xl p-6 flex flex-col items-center shadow-2xl relative z-20 pointer-events-auto backdrop-blur-md">
      <h3 className="text-2xl text-white mb-2 font-medium">Flappy {name}</h3>
      <div className="flex gap-4 mb-4 text-zinc-400 text-sm font-medium">
        <span>Score: {score}</span>
        <span>Earns: 1 Coin/Pipe</span>
      </div>

      <div className="w-full max-w-[240px] h-48 bg-sky-900/50 rounded-xl relative overflow-hidden border border-white/10 select-none touch-none" onPointerDown={jump}>
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
            <button onClick={startGame} className="bg-white text-black px-6 py-2 rounded-full font-bold">Play</button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80 z-20">
            <span className="text-xl font-bold text-white mb-2">CRASHED!</span>
            <button onClick={startGame} className="bg-white text-black px-6 py-2 rounded-full font-bold">Retry</button>
          </div>
        )}
      </div>

      {/* Mobile Jump Button */}
      {playing && (
        <button onPointerDown={jump} className="md:hidden mt-4 w-full bg-yellow-500 text-black font-black text-xl py-3 rounded-xl active:scale-95 transition-transform select-none">
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
  const bgRef = useRef(null);
  const topRef = useRef(null);

  const [currency, setCurrency] = useState(200); 
  const [visitorName, setVisitorName] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  
  const [hasFlies, setHasFlies] = useState(false);
  const [cakeMarks, setCakeMarks] = useState([]);

  const [cowPhase, setCowPhase] = useState('idle'); 
  const [bites, setBites] = useState(0); 
  const [isPieing, setIsPieing] = useState(false);

  useEffect(() => {
    const fetchWish = async () => {
      try {
        const { data: dbData, error: dbError } = await supabase.from('wishes').select('*').eq('id', data).single();
        if (dbError || !dbData || Date.now() > dbData.expires_at) { setError("Wish has expired."); return; }

        setParsedData({ n: dbData.name, i: dbData.image_url, m: dbData.message, s: dbData.sender_name });

        const tenMins = 10 * 60 * 1000;
        if (Date.now() - dbData.pooped_at < tenMins) {
          setHasFlies(true);
          setToastMessage(`💩 ${dbData.pooped_by || 'Someone'} ruined this site with poop!`);
          setTimeout(() => setToastMessage(''), 5000);
        }
        
        if (Date.now() - dbData.caked_at < tenMins) {
          setCakeMarks([{ id: 'initial_db', top: Math.random() * 70 + 10 + '%', left: Math.random() * 70 + 10 + '%', rotation: Math.random() * 360, timestamp: dbData.caked_at }]);
          if (!dbData.pooped_at || Date.now() - dbData.pooped_at >= tenMins) {
             setToastMessage(`🎂 ${dbData.caked_by || 'Someone'} threw a cake at this!`);
             setTimeout(() => setToastMessage(''), 5000);
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

  const buyPrank = async (cost, type) => {
    if (currency < cost || cowPhase !== 'idle') return;
    let vName = visitorName;
    if (!vName) {
      vName = window.prompt("Enter your name to buy pranks:");
      if (!vName) return;
      setVisitorName(vName);
    }

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
          await supabase.from('wishes').update({ pooped_at: Date.now(), pooped_by: vName }).eq('id', data);
        }, 11500);
      }

      if (type === 'pie') {
        setIsPieing(true);
        setTimeout(() => playSound('splat.mp3'), 1500);
        setTimeout(async () => {
          setIsPieing(false);
          setCakeMarks(prev => [...prev, { id: Date.now(), top: Math.random() * 70 + 5 + '%', left: Math.random() * 70 + 5 + '%', rotation: Math.random() * 360, timestamp: Date.now() }]);
          await supabase.from('wishes').update({ caked_at: Date.now(), caked_by: vName }).eq('id', data);
        }, 4500);
      }
    }, 800);
  };

  useEffect(() => {
    const handleOrientation = (e) => {
      if (!bgRef.current || window.scrollY > window.innerHeight || cowPhase !== 'idle') return;
      let { beta, gamma } = e; 
      if (beta === null || gamma === null) return;
      beta = Math.max(-45, Math.min(45, beta)); 
      gamma = Math.max(-45, Math.min(45, gamma)); 
      bgRef.current.style.transform = `perspective(1000px) scale(1.08) rotateX(${(beta / 45) * -8}deg) rotateY(${(gamma / 45) * 8}deg)`;
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [cowPhase]);

  if (error) return <div className="h-screen flex items-center justify-center bg-black text-white text-2xl">{error}</div>;
  if (!parsedData) return <div className="h-screen bg-black" />;

  const getSiteTransform = () => {
    if (cowPhase === 'zooming') return 'scale-[4] -translate-y-[10vh] opacity-0'; 
    if (cowPhase !== 'idle') return 'scale-[0.25] translate-y-[20vh] rounded-[100px] shadow-[0_0_100px_black] pointer-events-none overflow-hidden'; 
    return 'scale-100 translate-y-0 opacity-100'; 
  };

  return (
    <>
      <div ref={topRef} className="absolute top-0 left-0 w-full h-1" />

      {/* Stable Background for cow sequence */}
      <div className={`fixed inset-0 z-[-1] transition-opacity duration-1000 bg-cover bg-center ${cowPhase !== 'idle' ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundImage: "url('/stable.jpg')" }} />

      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-zinc-900 border border-white/20 text-white px-6 py-3 rounded-full font-medium shadow-2xl animate-bounce">
          {toastMessage}
        </div>
      )}

      <div className="fixed top-20 right-5 sm:right-8 z-[60] bg-black/80 backdrop-blur-md border border-yellow-500/50 text-yellow-400 px-4 py-2 rounded-full font-bold shadow-[0_0_15px_rgba(234,179,8,0.3)]">
        🪙 {currency} Coins
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
      `}</style>

      {/* --- COW & PIE ANIMATIONS --- */}
      {(cowPhase !== 'idle' && cowPhase !== 'shrinking') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden">
          {(cowPhase === 'walking' || cowPhase === 'pooping' || cowPhase === 'leaving') && (
            <img src="/cow.png" className="absolute w-[40vw] max-w-[500px] object-contain drop-shadow-2xl z-[101]" style={{ animation: cowPhase === 'walking' ? 'cowWalkIn 2.5s ease-out forwards' : cowPhase === 'leaving' ? 'cowWalkOut 1.5s ease-in forwards' : 'none', transform: cowPhase === 'pooping' ? 'translateX(-5vw)' : '' }} />
          )}
          {(cowPhase === 'pooping' || cowPhase === 'leaving' || cowPhase === 'zooming') && (
            <div className="absolute inset-0 flex items-center justify-center z-[100]">
              <div className={`transition-transform duration-[2000ms] ${cowPhase === 'zooming' ? 'scale-[4]' : 'scale-100'}`}>
                <div className="relative animate-[poopDrop_0.4s_ease-in_forwards]">
                  <img src="/poop.png" className="w-[15vw] h-[15vw] max-w-[200px] max-h-[200px] object-contain drop-shadow-2xl" />
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
          <img src="/cake.png" className="w-96 h-96 object-contain animate-[dropAndTilt_1.5s_ease-in_forwards] relative z-[102]" />
          <div className="absolute inset-0 flex items-center justify-center z-[101]">
            <svg viewBox="0 0 100 100" className="w-[150vw] h-[150vw] opacity-0 animate-[splatExplode_3s_ease-out_1.2s_forwards]" style={{ fill: '#3b82f6' }}>
              <path d="M50 10 C 60 30, 80 20, 75 40 C 95 45, 80 60, 90 75 C 70 70, 60 95, 50 80 C 40 95, 30 70, 10 75 C 20 60, 5 45, 25 40 C 20 20, 40 30, 50 10 Z" />
            </svg>
          </div>
        </div>
      )}

      {/* --- MAIN SITE WRAPPER --- */}
      <div className={`relative w-full text-white z-10 transition-all duration-[1200ms] ease-in-out origin-center ${getSiteTransform()}`}>
        
        {/* Parallax Background */}
        <div className="fixed inset-0 z-0 bg-black overflow-hidden flex items-center justify-center">
          <div ref={bgRef} className="w-full h-full relative transition-transform duration-[400ms] ease-out will-change-transform" style={{ transform: 'perspective(1000px) scale(1.05) rotateX(0deg) rotateY(0deg)' }}>
            <img src={parsedData.i} className={`w-full h-full object-cover transition-opacity duration-300 ${bites >= 3 ? 'opacity-0' : 'opacity-100'}`} />
            
            {bites >= 1 && <div className="absolute -top-[10%] -right-[10%] w-[50vw] h-[50vw] bg-black rounded-full" />}
            {bites >= 2 && <div className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] bg-black rounded-full" />}
            {bites >= 3 && <div className="absolute inset-0 bg-black" />} 
            
            {cakeMarks.length > 0 && (
              <div className="absolute inset-0 opacity-80 pointer-events-none">
                {cakeMarks.map((m) => (
                  <svg key={m.id} viewBox="0 0 100 100" className="absolute w-40 h-40 fill-blue-500/80" style={{ top: m.top, left: m.left, transform: `rotate(${m.rotation}deg)` }}>
                    <path d="M50 10 C 60 30, 80 20, 75 40 C 95 45, 80 60, 90 75 C 70 70, 60 95, 50 80 C 40 95, 30 70, 10 75 C 20 60, 5 45, 25 40 C 20 20, 40 30, 50 10 Z" />
                  </svg>
                ))}
              </div>
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/90 pointer-events-none" />
        </div>

        <nav className="fixed top-0 w-full z-50 px-5 py-4 flex justify-end pointer-events-none">
          <Link to="/" className="text-[16px] text-white/70 hover:text-white bg-black/40 px-5 py-2.5 rounded-full backdrop-blur-md border border-white/10 pointer-events-auto">Create new wish</Link>
        </nav>

        <main className="relative z-10 h-screen flex flex-col justify-center px-5 sm:px-10 pointer-events-none">
          <div className="max-w-2xl relative pointer-events-auto">
            {hasFlies && (
              <>
                <div className="fly" style={{ top: '-50px', left: '100px', animationDelay: '0s' }}>🪰</div>
                <div className="fly" style={{ top: '50px', left: '-20px', animationDelay: '0.5s' }}>🪰</div>
                <div className="fly" style={{ top: '20px', right: '50px', animationDelay: '1s' }}>🪰</div>
              </>
            )}
            <h1 className="select-none mb-4 font-medium" style={{ fontSize: 'clamp(40px, 8vw, 72px)', lineHeight: 1.1, filter: 'blur(3px)' }}>
              Happy Birthday,<br/>{parsedData.n}!
            </h1>
            <p className="text-white/90 mb-8 min-h-[80px]" style={{ fontSize: 'clamp(20px, 4vw, 32px)', lineHeight: 1.4 }}>
              {displayed}
              {!done && <span className="inline-block w-[3px] h-[1em] bg-white align-middle ml-[4px]" style={{ animation: 'blink 1s step-end infinite' }} />}
            </p>
            <div className="text-white/60 text-[20px] sm:text-[24px] italic">— From {parsedData.s || 'Anonymous'}</div>
          </div>
        </main>

        {/* IMAGE CUTOFF FIX: bg-transparent + smooth fade out to black over games */}
        <section className="relative z-20 min-h-screen pt-32 pb-24 px-5 sm:px-8 md:px-10 bg-gradient-to-b from-transparent via-zinc-950/90 to-zinc-950/95">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 mt-10">
              <h2 className="text-4xl md:text-5xl text-white mb-4 font-medium">Earn Coins</h2>
            </div>
            
            {/* 3 Games Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
              <WhackAMole imageUrl={parsedData.i} name={parsedData.n} addCurrency={addCurrency} />
              <SpinTheFace imageUrl={parsedData.i} name={parsedData.n} addCurrency={addCurrency} />
              <FlappyBird imageUrl={parsedData.i} name={parsedData.n} addCurrency={addCurrency} />
            </div>

            <div className="text-center mb-10 pointer-events-auto">
              <ShoppingCart className="w-10 h-10 mx-auto mb-4 text-yellow-500" />
              <h2 className="text-4xl md:text-5xl text-white mb-4 font-medium">The Prank Shop</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto pointer-events-auto">
              <button onClick={() => buyPrank(30, 'cow')} disabled={currency < 30} className="flex items-center justify-between bg-black/50 border border-white/10 p-6 rounded-3xl hover:bg-zinc-800 disabled:opacity-50 text-left transition-colors backdrop-blur-md">
                <div>
                  <h4 className="text-2xl font-bold text-white mb-1">Cow Attack 🐄</h4>
                  <p className="text-zinc-400 text-sm">A hungry cow eats their photo.</p>
                </div>
                <span className="font-bold text-yellow-500 bg-yellow-500/10 px-4 py-2 rounded-full">30 Coins</span>
              </button>
              <button onClick={() => buyPrank(50, 'pie')} disabled={currency < 50} className="flex items-center justify-between bg-black/50 border border-white/10 p-6 rounded-3xl hover:bg-zinc-800 disabled:opacity-50 text-left transition-colors backdrop-blur-md">
                <div>
                  <h4 className="text-2xl font-bold text-white mb-1">Cake Smash 🎂</h4>
                  <p className="text-zinc-400 text-sm">Drop a giant cake on the screen.</p>
                </div>
                <span className="font-bold text-yellow-500 bg-yellow-500/10 px-4 py-2 rounded-full">50 Coins</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}