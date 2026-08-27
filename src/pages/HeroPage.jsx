import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Menu, X, ShoppingCart } from 'lucide-react';
import { supabase } from '../supabase'; 

// Import the new modular components
import WhackAMole from '../components/WhackAMole';
import FlappyBird from '../components/FlappyBird';

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

// --- Main Page ---
export default function HeroPage() {
  const { data } = useParams(); 
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);
  const bgRef = useRef(null);
  const topRef = useRef(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [currency, setCurrency] = useState(200); 
  const [visitorName, setVisitorName] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  
  const [hasFlies, setHasFlies] = useState(false);
  const [cakeMarks, setCakeMarks] = useState([]);

  // Cow Sequence States
  const [cowPhase, setCowPhase] = useState('idle'); 
  const [bites, setBites] = useState(0); 

  // Pie Prank States
  const [isPieing, setIsPieing] = useState(false);

  // Load from Supabase
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
          setCakeMarks([{ 
            id: 'initial_db', 
            top: Math.random() * 70 + 10 + '%', 
            left: Math.random() * 70 + 10 + '%', 
            rotation: Math.random() * 360,
            timestamp: dbData.caked_at
          }]);
          
          if (!dbData.pooped_at || Date.now() - dbData.pooped_at >= tenMins) {
             setToastMessage(`🎂 ${dbData.caked_by || 'Someone'} threw a cake at this!`);
             setTimeout(() => setToastMessage(''), 5000);
          }
        }
      } catch (err) { setError("Network error."); }
    };
    fetchWish();
  }, [data]);

  // Clean up old cake marks
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCakeMarks(marks => marks.filter(m => now - m.timestamp < 10 * 60 * 1000));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const { displayed, done } = useTypewriter(parsedData?.m || "", 45, 800);
  const addCurrency = (amount) => setCurrency(prev => prev + amount);

  const getVisitorName = () => {
    if (visitorName) return visitorName;
    const name = window.prompt("Enter your name to buy pranks:");
    if (name) setVisitorName(name);
    return name;
  };

  const buyPrank = async (cost, type) => {
    if (currency < cost || cowPhase !== 'idle') return;
    const vName = getVisitorName();
    if (!vName) return;

    setCurrency(c => c - cost);
    playSound('cha-ching.mp3');
    topRef.current?.scrollIntoView({ behavior: 'smooth' });

    setTimeout(async () => {
      if (type === 'cow') {
        setCowPhase('walking');
        setTimeout(() => { setBites(1); playSound('bite.mp3'); }, 2200); 
        setTimeout(() => { setBites(2); playSound('bite.mp3'); }, 2600); 
        setTimeout(() => { setBites(3); playSound('bite.mp3'); }, 3000); 
        
        setTimeout(() => { setCowPhase('pooping'); playSound('fart.mp3'); }, 3800);
        setTimeout(() => setCowPhase('leaving'), 4500);
        setTimeout(() => setCowPhase('zooming'), 5800);

        setTimeout(async () => {
          setCowPhase('idle');
          setBites(0);
          setHasFlies(true);
          playSound('buzz.mp3'); 
          await supabase.from('wishes').update({ pooped_at: Date.now(), pooped_by: vName }).eq('id', data);
        }, 9500);
      }

      if (type === 'pie') {
        setIsPieing(true);
        setTimeout(() => playSound('splat.mp3'), 1500);
        
        setTimeout(async () => {
          setIsPieing(false);
          const newMark = {
            id: Date.now(),
            top: Math.random() * 70 + 5 + '%', 
            left: Math.random() * 70 + 5 + '%', 
            rotation: Math.random() * 360,
            timestamp: Date.now()
          };
          setCakeMarks(prev => [...prev, newMark]);
          await supabase.from('wishes').update({ caked_at: Date.now(), caked_by: vName }).eq('id', data);
        }, 4500);
      }
    }, 800);
  };

useEffect(() => {
    // 1. Desktop Mouse Movement
    const handleMouseMove = (e) => {
      if (!bgRef.current || window.scrollY > window.innerHeight || cowPhase !== 'idle') return;
      const { innerWidth, innerHeight } = window;
      const rotateX = ((e.clientY / innerHeight - 0.5) * 2) * -8; 
      const rotateY = ((e.clientX / innerWidth - 0.5) * 2) * 8;
      bgRef.current.style.transform = `perspective(1000px) scale(1.08) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    // 2. Mobile Gyroscope / Accelerometer
    const handleOrientation = (e) => {
      if (!bgRef.current || window.scrollY > window.innerHeight || cowPhase !== 'idle') return;
      
      let { beta, gamma } = e; 
      if (beta === null || gamma === null) return;

      // Clamp the values so it doesn't spin wildly if they hold the phone weirdly
      beta = Math.max(-45, Math.min(45, beta)); // Tilt front-to-back
      gamma = Math.max(-45, Math.min(45, gamma)); // Tilt left-to-right

      // Map tilt angles to standard 8-degree rotation limits
      const rotateX = (beta / 45) * -8;
      const rotateY = (gamma / 45) * 8;

      bgRef.current.style.transform = `perspective(1000px) scale(1.08) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => { 
      if (bgRef.current) bgRef.current.style.transform = `perspective(1000px) scale(1.05) rotateX(0deg) rotateY(0deg)`; 
    };

    // Attach listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('deviceorientation', handleOrientation);

    return () => { 
      window.removeEventListener('mousemove', handleMouseMove); 
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [cowPhase]);

  if (error) return <div className="h-screen flex items-center justify-center bg-black text-white text-2xl">{error}</div>;
  if (!parsedData) return <div className="h-screen bg-black" />;

  return (
    <>
      <div ref={topRef} className="absolute top-0 left-0 w-full h-1" />

      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-zinc-900 border border-white/20 text-white px-6 py-3 rounded-full font-medium shadow-2xl animate-bounce">
          {toastMessage}
        </div>
      )}

      <div className="fixed top-20 right-5 sm:right-8 z-50 bg-black/80 backdrop-blur-md border border-yellow-500/50 text-yellow-400 px-4 py-2 rounded-full font-bold shadow-[0_0_15px_rgba(234,179,8,0.3)]">
        🪙 {currency} Coins
      </div>

      <style>{`
        @keyframes flyBuzz { 0% { transform: translate(0, 0) rotate(0deg); } 25% { transform: translate(20px, -30px) rotate(45deg); } 50% { transform: translate(-30px, -10px) rotate(-20deg); } 75% { transform: translate(15px, 20px) rotate(60deg); } 100% { transform: translate(0, 0) rotate(0deg); } }
        .fly { animation: flyBuzz 2s infinite linear; position: absolute; font-size: 2rem; pointer-events: none; z-index: 50; }
        
        @keyframes cowWalkIn { 0% { transform: translateX(-150vw); } 100% { transform: translateX(0vw); } }
        @keyframes cowWalkOut { 0% { transform: translateX(0vw); } 100% { transform: translateX(150vw); } }

        @keyframes dropAndTilt { 0% { transform: translateY(-100vh) rotate(0deg); } 70% { transform: translateY(0) rotate(0deg); } 90% { transform: translateY(0) rotate(45deg); opacity: 1; } 100% { transform: translateY(0) rotate(90deg); opacity: 0; } }
        @keyframes splatExplode { 0% { transform: scale(0); opacity: 0; } 10% { transform: scale(1); opacity: 0.9; } 80% { transform: scale(1.1) translateY(5%); opacity: 0.9; } 100% { transform: scale(1.2) translateY(10%); opacity: 0; } }
        
        @keyframes poopDrop { 
          0% { transform: translate(-80px, -20px) scale(0); opacity: 0; } 
          100% { transform: translate(0, 40px) scale(1); opacity: 1; } 
        }
        @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
      `}</style>

      {/* --- COW PRANK ANIMATIONS --- */}
      {(cowPhase !== 'idle') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden">
          {(cowPhase === 'walking' || cowPhase === 'pooping' || cowPhase === 'leaving') && (
            <div className="text-[250px] drop-shadow-2xl absolute"
                 style={{ 
                   animation: cowPhase === 'walking' ? 'cowWalkIn 2.2s linear forwards' : cowPhase === 'leaving' ? 'cowWalkOut 1.5s linear forwards' : 'none',
                   transform: cowPhase === 'pooping' ? 'translateX(0vw)' : ''
                 }}>
              🐄
            </div>
          )}

          {(cowPhase === 'pooping' || cowPhase === 'leaving' || cowPhase === 'zooming') && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`transition-transform duration-[2000ms] ease-in-out ${cowPhase === 'zooming' ? 'scale-[3]' : 'scale-100'}`}>
                <div className="relative animate-[poopDrop_0.4s_ease-in_forwards]">
                  <img src="/poop.png" alt="Poop" className="w-[30vw] h-[30vw] max-w-[300px] max-h-[300px] object-contain drop-shadow-2xl" />
                  {cowPhase === 'zooming' && (
                    <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-2 opacity-0 animate-[fadeIn_0.5s_ease-out_0.5s_forwards]">
                      <img src={parsedData.i} className="w-10 h-10 rounded-full border border-black object-cover" />
                      <img src={parsedData.i} className="w-8 h-8 rounded-full border border-black object-cover" />
                      <img src={parsedData.i} className="w-12 h-12 rounded-full border border-black object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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

      {/* --- MAIN SITE WRAPPER --- */}
      <div className={`relative w-full text-white z-10 transition-all duration-[2000ms] ease-in-out origin-center
        ${cowPhase === 'zooming' ? 'scale-[3] opacity-0' : 'scale-100 opacity-100'}`}>
        
        <div className="fixed inset-0 z-0 bg-black overflow-hidden flex items-center justify-center">
          <div ref={bgRef} className="w-full h-full relative transition-transform duration-[400ms] ease-out will-change-transform" style={{ transform: 'perspective(1000px) scale(1.05) rotateX(0deg) rotateY(0deg)' }}>
            
            <img src={parsedData.i} alt="Background" className={`w-full h-full object-cover transition-opacity duration-300 ${bites >= 3 ? 'opacity-0' : 'opacity-100'}`} />
            
            {bites >= 1 && <div className="absolute -top-[10%] -right-[10%] w-[50vw] h-[50vw] bg-black rounded-full" />}
            {bites >= 2 && <div className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] bg-black rounded-full" />}
            {bites >= 3 && <div className="absolute inset-0 bg-black" />} 
            
            {/* Dynamic Cake Marks */}
            {cakeMarks.length > 0 && (
              <div className="absolute inset-0 opacity-80 pointer-events-none">
                {cakeMarks.map((mark) => (
                  <svg 
                    key={mark.id}
                    viewBox="0 0 100 100" 
                    className="absolute w-40 h-40 fill-blue-500/80" 
                    style={{ 
                      top: mark.top, 
                      left: mark.left, 
                      transform: `rotate(${mark.rotation}deg)` 
                    }}
                  >
                    <path d="M50 10 C 60 30, 80 20, 75 40 C 95 45, 80 60, 90 75 C 70 70, 60 95, 50 80 C 40 95, 30 70, 10 75 C 20 60, 5 45, 25 40 C 20 20, 40 30, 50 10 Z" />
                  </svg>
                ))}
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
              
              {/* USING THE NEW MODULAR COMPONENTS */}
              <WhackAMole imageUrl={parsedData.i} name={parsedData.n} addCurrency={addCurrency} />
              <FlappyBird imageUrl={parsedData.i} name={parsedData.n} addCurrency={addCurrency} />
              
            </div>

            <div className="text-center mb-10 pointer-events-auto">
              <ShoppingCart className="w-10 h-10 mx-auto mb-4 text-yellow-500" />
              <h2 className="text-4xl md:text-5xl text-white mb-4 font-medium">The Prank Shop</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto pointer-events-auto">
              <button onClick={() => buyPrank(30, 'cow')} disabled={currency < 30} className="flex items-center justify-between bg-zinc-900 border border-zinc-700 p-6 rounded-2xl hover:bg-zinc-800 disabled:opacity-50 text-left transition-colors">
                <div>
                  <h4 className="text-2xl font-bold text-white mb-1">Cow Attack 🐄</h4>
                  <p className="text-zinc-400 text-sm">A hungry cow comes and eats their photo.</p>
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