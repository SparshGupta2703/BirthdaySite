import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import HeroPage from './pages/HeroPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        {/* The :data parameter will hold the encoded string */}
        <Route path="/wish/:data" element={<HeroPage />} />
      </Routes>
    </BrowserRouter>
  );
}