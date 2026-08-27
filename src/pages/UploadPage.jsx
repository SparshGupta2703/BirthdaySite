import React, { useState } from 'react';
import axios from 'axios';
import { UploadCloud, Loader2, Copy, Check } from 'lucide-react';
import { supabase } from '../supabase';

export default function UploadPage() {
  const [formData, setFormData] = useState({ name: '', imageUrl: '', message: '', senderName: '', expiryHours: 24 });
  const [isUploading, setIsUploading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET); 
      const res = await axios.post(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, uploadData);
      setFormData({ ...formData, imageUrl: res.data.secure_url });
    } catch (error) {
      alert('Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const generateLink = async (e) => {
    e.preventDefault();
    const expiryTimestamp = Date.now() + (formData.expiryHours * 60 * 60 * 1000);
    const shortId = Math.random().toString(36).substring(2, 8); // Generate 6-char ID
    
    const { error } = await supabase.from('wishes').insert([{
      id: shortId,
      name: formData.name,
      image_url: formData.imageUrl,
      message: formData.message,
      sender_name: formData.senderName,
      expires_at: expiryTimestamp
    }]);

    if (!error) {
      setShareLink(`${window.location.origin}/wish/${shortId}`);
    } else {
      alert("Database error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-950">
      <form onSubmit={generateLink} className="max-w-md w-full bg-black border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-3xl mb-6 text-white font-medium">Create the Trap</h1>
        <div className="space-y-4">
          <input required type="text" placeholder="Victim's Name" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white" onChange={(e) => setFormData({...formData, name: e.target.value})} />
          <input required type="text" placeholder="Your Name (From)" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white" onChange={(e) => setFormData({...formData, senderName: e.target.value})} />
          <textarea required placeholder="Sweet message (to lure them in)" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white h-24 resize-none" onChange={(e) => setFormData({...formData, message: e.target.value})} />
          <select className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white" onChange={(e) => setFormData({...formData, expiryHours: Number(e.target.value)})}>
            <option value={1}>Expire in 1 Hour</option>
            <option value={24}>Expire in 24 Hours</option>
          </select>
          <div>
            <div className="relative">
              <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="w-full bg-zinc-900 border border-zinc-800 border-dashed rounded-lg p-6 flex flex-col items-center text-zinc-500">
                {isUploading ? <Loader2 className="w-6 h-6 animate-spin mb-2" /> : <UploadCloud className="w-6 h-6 mb-2" />}
                <span>{isUploading ? 'Uploading...' : 'Click to upload photo'}</span>
              </div>
            </div>
          </div>
          {!shareLink ? (
            <button type="submit" disabled={!formData.name || !formData.imageUrl || isUploading} className="w-full bg-white text-black font-bold rounded-lg py-3 mt-4 disabled:opacity-50">Generate Shareable Link</button>
          ) : (
            <div className="mt-4 p-4 bg-zinc-900 border border-green-500/30 rounded-lg flex gap-2">
              <input type="text" readOnly value={shareLink} className="flex-1 bg-black text-xs text-zinc-400 px-3 rounded border border-zinc-800 outline-none" />
              <button type="button" onClick={() => { navigator.clipboard.writeText(shareLink); setCopied(true); }} className="bg-white text-black p-2 rounded">{copied ? <Check size={18} /> : <Copy size={18} />}</button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}