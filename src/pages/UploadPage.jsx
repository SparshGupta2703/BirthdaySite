import React, { useState, useCallback } from 'react';
import axios from 'axios';
import Cropper from 'react-easy-crop';
import { UploadCloud, Loader2, Copy, Check, Eye } from 'lucide-react';
import { supabase } from '../supabase';
import { getCroppedImg } from '../cropImage';

export default function UploadPage() {
  const [formData, setFormData] = useState({ name: '', message: '', senderName: '' });
  
  // Cropper States
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  
  // App States
  const [isUploading, setIsUploading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  // Read local file and load it into the cropper
  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
    }
  };

  const readFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result), false);
      reader.readAsDataURL(file);
    });
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleProcessAndUpload = async (e) => {
    e.preventDefault();
    if (!imageSrc || !croppedAreaPixels) return alert("Please select and align an image!");
    
    setIsUploading(true);

    try {
      // 1. Cut the image using our helper
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

      // 2. Upload the cropped Blob to Cloudinary
      const uploadData = new FormData();
      uploadData.append('file', croppedImageBlob);
      uploadData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET); 
      
      const cloudinaryRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, 
        uploadData
      );
      
      const finalImageUrl = cloudinaryRes.data.secure_url;

      // 3. Save to Supabase
      const expiryTimestamp = Date.now() + (24 * 60 * 60 * 1000); // 24 Hours
      const shortId = Math.random().toString(36).substring(2, 8);
      
      const { error } = await supabase.from('wishes').insert([{
        id: shortId,
        name: formData.name,
        image_url: finalImageUrl,
        message: formData.message,
        sender_name: formData.senderName,
        expires_at: expiryTimestamp
      }]);

      if (!error) {
        setShareLink(`${window.location.origin}/wish/${shortId}`);
      } else {
        alert("Database error: Could not save wish.");
        console.error(error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to crop and upload image.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black text-[#E1E0CC]">
      
      {/* Background styling to match the new cinematic theme */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#101010] to-black -z-10" />

      <div className="max-w-2xl w-full bg-[#101010] border border-white/10 rounded-[2rem] p-8 shadow-2xl relative z-10">
        <h1 className="text-4xl mb-2 text-white font-normal" style={{ fontFamily: '"Instrument Serif", serif' }}>
          Initialize Target
        </h1>
        <p className="text-gray-400 text-sm mb-8">Align the eyes to activate tracking protocols.</p>
        
        <form onSubmit={handleProcessAndUpload} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* LEFT COLUMN: The Alignment Tool */}
          <div className="flex flex-col gap-4">
            {!imageSrc ? (
              <div className="relative w-full aspect-[3/4] bg-black border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center text-gray-500 hover:bg-white/5 transition-colors group cursor-pointer">
                <input type="file" accept="image/*" onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                <UploadCloud className="w-10 h-10 mb-4 group-hover:scale-110 transition-transform text-white/50" />
                <span className="text-sm font-medium text-white/70">Click to upload photo</span>
              </div>
            ) : (
              <div className="relative w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden border border-white/20 shadow-inner">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={3 / 4} // Portrait aspect ratio
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  showGrid={false}
                />
                
                {/* THE EYE ALIGNMENT OVERLAY */}
                <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center">
                  <div className="w-full flex justify-between px-[25%] absolute top-[35%] -translate-y-1/2">
                    <div className="w-12 h-12 border-4 border-yellow-500 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.5)] flex items-center justify-center bg-yellow-500/20">
                      <div className="w-1 h-1 bg-yellow-500 rounded-full" />
                    </div>
                    <div className="w-12 h-12 border-4 border-yellow-500 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.5)] flex items-center justify-center bg-yellow-500/20">
                      <div className="w-1 h-1 bg-yellow-500 rounded-full" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 bg-black/80 px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2 text-xs font-bold text-yellow-500 border border-yellow-500/30">
                    <Eye size={14} /> Drag & Zoom to align eyes
                  </div>
                </div>
              </div>
            )}
            
            {/* Zoom Slider */}
            {imageSrc && (
              <div className="w-full flex items-center gap-3 bg-black p-3 rounded-xl border border-white/10">
                <span className="text-xs text-gray-400">Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(e.target.value)}
                  className="flex-1 accent-yellow-500"
                />
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: The Details */}
          <div className="flex flex-col justify-between">
            <div className="space-y-4">
              <input required type="text" placeholder="Target's Name" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/40 transition-colors" onChange={(e) => setFormData({...formData, name: e.target.value})} />
              <input required type="text" placeholder="Your Name (From)" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/40 transition-colors" onChange={(e) => setFormData({...formData, senderName: e.target.value})} />
              <textarea required placeholder="Sweet message (to lure them in)" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white h-32 resize-none focus:outline-none focus:border-white/40 transition-colors" onChange={(e) => setFormData({...formData, message: e.target.value})} />
            </div>

            {!shareLink ? (
              <button type="submit" disabled={!formData.name || !imageSrc || isUploading} className="w-full bg-white text-black font-bold rounded-xl py-4 mt-8 disabled:opacity-50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                {isUploading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : 'Crop & Generate Link'}
              </button>
            ) : (
              <div className="mt-8 p-4 bg-green-950/30 border border-green-500/30 rounded-xl flex flex-col gap-3">
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
      </div>
    </div>
  );
}