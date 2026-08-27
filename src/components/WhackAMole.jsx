import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Play, Clock } from 'lucide-react';

export default function WhackAMole({ imageUrl, name, addCurrency }) {
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
      addCurrency(2); 
      setActiveHole(null); 
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
        <button onClick={() => { setPlaying(true); setTimeLeft(15); }} className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-zinc-200 mb-4">
          <Play size={18} /> Start (15s)
        </button>
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
}