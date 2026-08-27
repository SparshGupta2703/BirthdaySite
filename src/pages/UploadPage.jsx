import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import Cropper from 'react-easy-crop';
import { UploadCloud, Loader2, Copy, Check, Eye, ArrowRight } from 'lucide-react';
import { supabase } from '../supabase';
import { getCroppedImg } from '../cropImage';

// --- DRAGGABLE EYE COMPONENT ---
const DraggableEye = ({ x, y, setPos, label }) => {
  const ref = useRef(null);

  const handlePointerDown = (e) => {
    e.preventDefault();
    const parent = ref.current.parentElement;
    const rect = parent.getBoundingClientRect();

    const handlePointerMove = (moveEvent) => {
      const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const clientY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;
      let newX = ((clientX - rect.left) / rect.width) * 100;
      let newY = ((clientY - rect.top) / rect.height) * 100;
      newX = Math.max(0, Math.min(100, newX));
      newY = Math.max(0, Math.min(100, newY));
      setPos({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('touchmove', handlePointerMove);
      document.removeEventListener('touchend', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('touchmove', handlePointerMove, { passive: false });
    document.addEventListener('touchend', handlePointerUp);
  };

  return (
    <div
      ref={ref}
      onPointerDown={handlePointerDown}
      className="absolute w-12 h-12 bg-white/80 rounded-full border-4 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.8)] cursor-move flex items-center justify-center -translate-x-1/2 -translate-y-1/2 touch-none z-50"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className="w-3 h-3 bg-black rounded-full" />
      <span className="absolute -top-6 text-yellow-500 text-[10px] font-bold bg-black/80 px-2 py-1 rounded whitespace-nowrap">{label}</span>
    </div>
  );
};

export default function UploadPage() {
  const [step, setStep] = useState(1); 
  const [formData, setFormData] = useState({ name: '', message: '', senderName: '' });
  
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  
  const [croppedImageBlob, setCroppedImageBlob] = useState(null);
  const [croppedImagePreview, setCroppedImagePreview] = useState(null);
  const [eyeData, setEyeData] = useState({ leftEye: { x: 35, y: 40 }, rightEye: { x: 65, y: 40 } });

  const [isUploading, setIsUploading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  // FIX: Hook extracted properly to prevent the fatal blank-screen crash
  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => setImageSrc(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleNextStep = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      setCroppedImageBlob(blob);
      setCroppedImagePreview(URL.createObjectURL(blob));
      setStep(2);
    } catch (e) {
      console.error(e);
      alert("Failed to crop image.");
    }
  };

  const handleProcessAndUpload = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      const uploadData = new FormData();
      uploadData.append('file', croppedImageBlob);
      uploadData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET); 
      
      const cloudinaryRes = await axios.post(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, uploadData);
      const finalImageUrl = cloudinaryRes.data.secure_url;

      const packedSenderData = JSON.stringify({ name: formData.senderName, eyes: eyeData });
      const shortId = Math.random().toString(36).substring(2, 8);
      
      const { error } = await supabase.from('wishes').insert([{
        id: shortId,
        name: formData.name,
        image_url: finalImageUrl,
        message: formData.message,
        sender_name: packedSenderData, 
        expires_at: Date.now() + (24 * 60 * 60 * 1000)
      }]);

      if (!error) setShareLink(`${window.location.origin}/wish/${shortId}`);
      else alert("Database error.");
    } catch (err) {
      console.error(err);
      alert('Failed to upload image.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-black text-[#E1E0CC]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#101010] to-black -z-10" />

      <div className="max-w-4xl w-full bg-[#101010] border border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-2xl relative z-10">
        <h1 className="text-3xl sm:text-4xl mb-2 text-white font-bold tracking-tight">Initialize Target</h1>
        <p className="text-gray-400 text-sm mb-8">
          {step === 1 ? "Step 1: Crop the photo." : "Step 2: Drag the eyes over their real eyes."}
        </p>

        {step === 1 && (
          <div className="flex flex-col items-center">
            {!imageSrc ? (
              <div className="relative w-full max-w-sm aspect-[3/4] bg-black border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center text-gray-500 hover:bg-white/5 transition-colors group cursor-pointer mx-auto">
                <input type="file" accept="image/*" onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                <UploadCloud className="w-10 h-10 mb-4 group-hover:scale-110 transition-transform text-white/50" />
                <span className="text-sm font-medium text-white/70">Click to upload photo</span>
              </div>
            ) : (
              <div className="w-full max-w-sm flex flex-col gap-4 mx-auto">
                <div className="relative w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden border border-white/20 shadow-inner">
                  {/* FIX: Callback is properly formatted now */}
                  <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={3 / 4} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} showGrid={false} />
                </div>
                <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(e.target.value)} className="w-full accent-yellow-500" />
                <button onClick={handleNextStep} className="w-full bg-yellow-500 text-black font-bold py-3 rounded-xl hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2">
                  Confirm Crop <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleProcessAndUpload} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col items-center">
              <div className="relative w-full max-w-sm aspect-[3/4] bg-black rounded-2xl border border-white/20 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                <img src={croppedImagePreview} className="w-full h-full object-cover pointer-events-none" />
                <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                
                <DraggableEye x={eyeData.leftEye.x} y={eyeData.leftEye.y} setPos={(pos) => setEyeData(prev => ({...prev, leftEye: pos}))} label="Left Eye" />
                <DraggableEye x={eyeData.rightEye.x} y={eyeData.rightEye.y} setPos={(pos) => setEyeData(prev => ({...prev, rightEye: pos}))} label="Right Eye" />
                
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2 text-xs font-bold text-yellow-500 border border-yellow-500/30 whitespace-nowrap pointer-events-none">
                  <Eye size={14} /> Drag circles to the eyes
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between h-full max-w-sm mx-auto w-full">
              <div className="space-y-4">
                <input required type="text" placeholder="Target's Name" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors" onChange={(e) => setFormData({...formData, name: e.target.value})} />
                <input required type="text" placeholder="Your Name (From)" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors" onChange={(e) => setFormData({...formData, senderName: e.target.value})} />
                <textarea required placeholder="Sweet message (to lure them in)" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white h-24 resize-none focus:outline-none focus:border-yellow-500 transition-colors" onChange={(e) => setFormData({...formData, message: e.target.value})} />
              </div>

              {!shareLink ? (
                <button type="submit" disabled={!formData.name || isUploading} className="w-full bg-white text-black font-bold rounded-xl py-4 mt-6 disabled:opacity-50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                  {isUploading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : 'Generate Link'}
                </button>
              ) : (
                <div className="mt-6 p-4 bg-green-950/30 border border-green-500/30 rounded-xl flex flex-col gap-3">
                  <p className="text-green-400 text-sm font-medium">Link ready! Trap is set.</p>
                  <div className="flex gap-2">
                    <input type="text" readOnly value={shareLink} className="flex-1 bg-black text-xs text-gray-300 px-3 rounded-lg border border-white/10 outline-none" />
                    <button type="button" onClick={() => { navigator.clipboard.writeText(shareLink); setCopied(true); }} className="bg-white text-black p-2 rounded-lg hover:bg-gray-200 transition-colors">
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}