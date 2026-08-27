import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Menu, X, Play, ShoppingCart, Clock } from 'lucide-react';

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
        if (i === text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [text, speed, startDelay]);

  return { displayed, done };
};

// --- Games (Unchanged logic, compacted for brevity) ---
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
      addCurrency(2); setActiveHole(null); 
      confetti({ particleCount: 15, spread: 40, origin: { y: 0.8 }, colors: ['#facc15', '#ffffff'] });
    }
  };

  return (
    <div className="bg-black/40 border border-white/10 rounded-3xl p-8 flex flex-col items-center shadow-2xl relative z-20 pointer-events-auto">
      <h3 className="text-3xl text-white mb-2 font-medium">Whack-a-{name}</h3>
      <div className="flex gap-4 mb-6 text-zinc-400 font-medium">
        <span className="flex items-center gap-1"><Clock size={16}/> {timeLeft}s</span>
        <span>Earns: 2 Coins</span>
      </div>
      {!playing && timeLeft === 0 ? (
        <button onClick={() => { setPlaying(true); setTimeLeft(15); }} className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-zinc-200 mb-4"><Play size={18} /> Start (15s)</button>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:gap-6 w-full max-w-sm mb-4">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
            <div key={index} className="aspect-square bg-zinc-900 rounded-2xl overflow-hidden relative border border-white/5 cursor-pointer" onClick={() => whack(index)}>
              <div className="absolute bottom-0 w-full h-1/3 bg-black/60 rounded-t-full z-10 pointer-events-none" />
              <img src={imageUrl} alt="Face" className={`absolute bottom-0 w-full h-[80%] object-cover object-top rounded-t-full transition-transform duration-100 ${activeHole === index ? 'translate-y-0' : 'translate-y-full'}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
    <div className="bg-black/40 border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl text-center relative z-20 pointer-events-auto">
      <h3 className="text-3xl text-white mb-2 font-medium">Dizzy {name}</h3>
      <div className="flex gap-4 mb-8 text-zinc-400 font-medium">
        <span className="flex items-center gap-1"><Clock size={16}/> {timeLeft}s</span>
        <span>Earns: 1 Coin/Click</span>
      </div>
      {!playing && timeLeft === 0 ? (
        <button onClick={() => { setClicks(0); setPlaying(true); setTimeLeft(10); }} className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-zinc-200 mb-4"><Play size={18} /> Start (10s)</button>
      ) : (
        <button onClick={() => { if (playing) { setClicks(c => c + 1); addCurrency(1); } }} className="relative group cursor-pointer focus:outline-none">
          <div className="absolute inset-0 bg-white/20 blur-xl rounded-full group-hover:bg-white/40" />
          <img src={imageUrl} alt="Spinning" className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full border-4 border-white object-cover shadow-2xl" style={{ transition: 'transform 0.1s linear', transform: `rotate(${clicks * 45}deg) scale(${1 + (clicks % 5 === 0 && clicks > 0 ? 0.1 : 0)})` }} />
        </button>
      )}
      <p className="text-white mt-8 h-6">{clicks > 0 && `Spun ${clicks} times!`}</p>
    </div>
  );
};

// --- Main Page ---
export default function HeroPage() {
  const { data } = useParams();
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);
  const bgRef = useRef(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [currency, setCurrency] = useState(0); 
  const [isCrumbling, setIsCrumbling] = useState(false);
  const [hasFlies, setHasFlies] = useState(false);
  const [isPieing, setIsPieing] = useState(false);
  const [hasCakeMarks, setHasCakeMarks] = useState(false);

  useEffect(() => {
    try {
      const decodedString = decodeURIComponent(atob(data));
      const payload = JSON.parse(decodedString);
      if (Date.now() > payload.x) { setError("Wish has expired."); return; }
      setParsedData(payload);
    } catch (err) { setError("Invalid link."); }
  }, [data]);

  const { displayed, done } = useTypewriter(parsedData?.m || "", 45, 800);
  const addCurrency = (amount) => setCurrency(prev => prev + amount);

  const buyPrank = (cost, type) => {
    if (currency >= cost) {
      setCurrency(c => c - cost);
      playSound('cha-ching.mp3');
      
      // Auto-scroll to top so they see the prank
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Delay the prank slightly to allow scrolling to finish
      setTimeout(() => {
        if (type === 'poop') {
          setTimeout(() => playSound('fart.mp3'), 500);
          setIsCrumbling(true);
          setTimeout(() => {
            setIsCrumbling(false);
            setHasFlies(true);
            playSound('buzz.mp3'); 
          }, 4000); 
        }

        if (type === 'pie') {
          setIsPieing(true);
          setTimeout(() => playSound('splat.mp3'), 1500);
          setTimeout(() => {
            setIsPieing(false);
            setHasCakeMarks(true); // Leave permanent blue splatters
          }, 4500);
        }
      }, 800); // 800ms scroll delay
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!bgRef.current || window.scrollY > window.innerHeight || isCrumbling) return;
      const { innerWidth, innerHeight } = window;
      const rotateX = ((e.clientY / innerHeight - 0.5) * 2) * -8; 
      const rotateY = ((e.clientX / innerWidth - 0.5) * 2) * 8;
      bgRef.current.style.transform = `perspective(1000px) scale(1.08) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };
    const handleMouseLeave = () => { if (bgRef.current) bgRef.current.style.transform = `perspective(1000px) scale(1.05) rotateX(0deg) rotateY(0deg)`; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseleave', handleMouseLeave); };
  }, [isCrumbling]);

  if (error) return <div className="h-screen flex items-center justify-center bg-black text-white text-2xl">{error}</div>;
  if (!parsedData) return <div className="h-screen bg-black" />;

  return (
    <>
      <div className="fixed top-20 right-5 sm:right-8 z-50 bg-black/80 backdrop-blur-md border border-yellow-500/50 text-yellow-400 px-4 py-2 rounded-full font-bold shadow-[0_0_15px_rgba(234,179,8,0.3)]">
        🪙 {currency} Coins
      </div>

      <style>{`
        @keyframes flyBuzz {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(20px, -30px) rotate(45deg); }
          50% { transform: translate(-30px, -10px) rotate(-20deg); }
          75% { transform: translate(15px, 20px) rotate(60deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        .fly { animation: flyBuzz 2s infinite linear; position: absolute; font-size: 2rem; pointer-events: none; z-index: 50; }
        
        @keyframes dropAndTilt {
          0% { transform: translateY(-100vh) rotate(0deg); }
          70% { transform: translateY(0) rotate(0deg); }
          90% { transform: translateY(0) rotate(45deg); opacity: 1; }
          100% { transform: translateY(0) rotate(90deg); opacity: 0; }
        }
        @keyframes splatExplode {
          0% { transform: scale(0); opacity: 0; }
          10% { transform: scale(1); opacity: 0.9; }
          80% { transform: scale(1.1) translateY(5%); opacity: 0.9; }
          100% { transform: scale(1.2) translateY(10%); opacity: 0; }
        }
      `}</style>

      {/* External Poop Graphic */}
      {isCrumbling && (
        <div className="fixed inset-0 z-[1] flex items-center justify-center pointer-events-none animate-pulse">
           <img src="/poop.png" alt="Poop" className="w-[40vw] h-[40vw] object-contain drop-shadow-2xl" />
        </div>
      )}

      {/* Blue Cake Splash Graphic */}
      {isPieing && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-center">
          <img src="/cake.png" alt="Cake" className="w-96 h-96 object-contain animate-[dropAndTilt_1.5s_ease-in_forwards] relative z-[102]" />
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden z-[101]">
            <svg viewBox="0 0 100 100" className="w-[150vw] h-[150vw] opacity-0 animate-[splatExplode_3s_ease-out_1.2s_forwards]" style={{ fill: '#3b82f6' }}>
              <path d="M50 10 C 60 30, 80 20, 75 40 C 95 45, 80 60, 90 75 C 70 70, 60 95, 50 80 C 40 95, 30 70, 10 75 C 20 60, 5 45, 25 40 C 20 20, 40 30, 50 10 Z" />
            </svg>
          </div>
        </div>
      )}

      <div className={`relative w-full text-white transition-all duration-[2000ms] ease-in-out origin-center z-10 ${isCrumbling ? 'scale-0 rotate-[720deg] opacity-0 blur-xl' : 'scale-100 rotate-0 opacity-100'}`}>
        
        {/* Parallax Background with Persistent Marks */}
        <div className="fixed inset-0 z-0 bg-black overflow-hidden flex items-center justify-center">
          <div ref={bgRef} className="w-full h-full relative transition-transform duration-[400ms] ease-out will-change-transform" style={{ transform: 'perspective(1000px) scale(1.05) rotateX(0deg) rotateY(0deg)' }}>
            <img src={parsedData.i} alt="Background" className="w-full h-full object-cover" />
            
            {/* Persistent Blue Splatters */}
            {hasCakeMarks && (
              <div className="absolute inset-0 opacity-80 pointer-events-none">
                <svg viewBox="0 0 100 100" className="absolute top-[20%] left-[20%] w-48 h-48 fill-blue-500/80 transform rotate-12">
                  <path d="M50 10 C 60 30, 80 20, 75 40 C 95 45, 80 60, 90 75 C 70 70, 60 95, 50 80 C 40 95, 30 70, 10 75 C 20 60, 5 45, 25 40 C 20 20, 40 30, 50 10 Z" />
                </svg>
                <svg viewBox="0 0 100 100" className="absolute top-[60%] right-[10%] w-64 h-64 fill-blue-500/70 transform -rotate-45">
                  <path d="M50 10 C 60 30, 80 20, 75 40 C 95 45, 80 60, 90 75 C 70 70, 60 95, 50 80 C 40 95, 30 70, 10 75 C 20 60, 5 45, 25 40 C 20 20, 40 30, 50 10 Z" />
                </svg>
              </div>
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/90 pointer-events-none" />
        </div>

        <nav className="fixed top-0 w-full z-50 px-5 sm:px-8 py-4 flex justify-end items-center pointer-events-none">
          <div className="hidden md:block pointer-events-auto">
            <Link to="/" className="text-[16px] text-white/70 hover:text-white bg-black/40 px-5 py-2.5 rounded-full backdrop-blur-md border border-white/10">Create new wish</Link>
          </div>
        </nav>

        <main className="relative z-10 h-screen flex flex-col justify-center px-5 sm:px-8 md:px-10 pointer-events-none">
          <div className="max-w-2xl relative pointer-events-auto">
            {hasFlies && (
              <>
                <div className="fly" style={{ top: '-50px', left: '100px', animationDelay: '0s' }}>🪰</div>
                <div className="fly" style={{ top: '50px', left: '-20px', animationDelay: '0.5s' }}>🪰</div>
                <div className="fly" style={{ top: '20px', right: '50px', animationDelay: '1s' }}>🪰</div>
              </>
            )}
            <h1 className="select-none mb-4 text-white font-medium" style={{ fontSize: 'clamp(40px, 8vw, 72px)', lineHeight: 1.1, filter: 'blur(3px)' }}>
              Happy Birthday,<br/>{parsedData.n}!
            </h1>
            <p className="text-white/90 mb-8 min-h-[80px]" style={{ fontSize: 'clamp(20px, 4vw, 32px)', lineHeight: 1.4 }}>
              {displayed}
              {!done && <span className="inline-block w-[3px] h-[1em] bg-white align-middle ml-[4px]" style={{ animation: 'blink 1s step-end infinite' }} />}
            </p>
            <div className="text-white/60 text-[20px] sm:text-[24px] italic">— From {parsedData.s || 'Anonymous'}</div>
          </div>
        </main>

        <section className="relative z-20 min-h-screen bg-zinc-950/90 backdrop-blur-xl px-5 sm:px-8 md:px-10 py-24 border-t border-white/10">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl text-white mb-4 font-medium">Earn Coins</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
              <WhackAMole imageUrl={parsedData.i} name={parsedData.n} addCurrency={addCurrency} />
              <SpinTheFace imageUrl={parsedData.i} name={parsedData.n} addCurrency={addCurrency} />
            </div>

            <div className="text-center mb-10 pointer-events-auto">
              <ShoppingCart className="w-10 h-10 mx-auto mb-4 text-yellow-500" />
              <h2 className="text-4xl md:text-5xl text-white mb-4 font-medium">The Prank Shop</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto pointer-events-auto">
              <button onClick={() => buyPrank(30, 'poop')} disabled={currency < 30} className="flex items-center justify-between bg-zinc-900 border border-zinc-700 p-6 rounded-2xl hover:bg-zinc-800 disabled:opacity-50 text-left transition-colors">
                <div>
                  <h4 className="text-2xl font-bold text-white mb-1">Collapse the Web 💩</h4>
                  <p className="text-zinc-400 text-sm">Destroy this site into a pile of dung.</p>
                </div>
                <span className="font-bold text-yellow-500 bg-yellow-500/10 px-4 py-2 rounded-full whitespace-nowrap">30 Coins</span>
              </button>
              <button onClick={() => buyPrank(50, 'pie')} disabled={currency < 50} className="flex items-center justify-between bg-zinc-900 border border-zinc-700 p-6 rounded-2xl hover:bg-zinc-800 disabled:opacity-50 text-left transition-colors">
                <div>
                  <h4 className="text-2xl font-bold text-white mb-1">Cake Smash 🎂</h4>
                  <p className="text-zinc-400 text-sm">Drop a giant cake onto the screen.</p>
                </div>
                <span className="font-bold text-yellow-500 bg-yellow-500/10 px-4 py-2 rounded-full whitespace-nowrap">50 Coins</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}