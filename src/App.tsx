/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { Send, Download, Loader2, Sparkles, RefreshCw, Info, AlertCircle, Type as TypeIcon, AlignLeft, AlignCenter, AlignRight, Key } from 'lucide-react';

// Declare window interface for AI Studio global methods
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const [quote, setQuote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [textConfig, setTextConfig] = useState({
    color: '#1a1a1a',
    fontSize: 24,
    opacity: 0.9,
    textAlign: 'center' as 'left' | 'center' | 'right',
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadingMessages = [
    "Understanding the emotion...",
    "Sketching the loneliness...",
    "Adding paper texture...",
    "Inking the thoughts...",
    "Finalizing the aesthetic...",
  ];

  const generateImage = async () => {
    if (!quote.trim()) return;

    // API Key Selection check for Shared/Live environment
    if (typeof window !== 'undefined' && window.aistudio) {
      try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await window.aistudio.openSelectKey();
          // Instructions say to proceed assuming success
        }
      } catch (e) {
        console.error("Key selection error:", e);
      }
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);
    
    let messageIndex = 0;
    const interval = setInterval(() => {
      setLoadingMessage(loadingMessages[messageIndex % loadingMessages.length]);
      messageIndex++;
    }, 2000);

    try {
      // Create a fresh instance to use the latest selected API key
      const currentAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const model = "gemini-2.5-flash-image";
      
      const prompt = `
        Create a vertical 9:16 aspect ratio image. 
        Style: minimalistic black pen scribble sketch on a warm paper texture (yellow/brown tone).
        Mood: dark, emotional, lonely, minimal.
        Character: abstract human figure, faceless or distorted.
        Composition: subject centered or slightly lower.
        DO NOT include any text, letters, or symbols in the image. 
        The image should be a clean background with the sketch only.
      `;

      const response = await currentAI.models.generateContent({
        model: model,
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "9:16",
          },
        },
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          setGeneratedImage(`data:image/png;base64,${base64Data}`);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        throw new Error("No image was generated. Please try again.");
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      if (err.message?.includes("Requested entity was not found")) {
        setError("API Key issue detected. Please try selecting your key again.");
        if (window.aistudio) window.aistudio.openSelectKey();
      } else {
        setError(err.message || "Something went wrong while generating the image.");
      }
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  const downloadImage = async () => {
    if (!generatedImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = generatedImage;

    await new Promise((resolve) => {
      img.onload = resolve;
    });

    canvas.width = 1080;
    canvas.height = 1920;
    ctx.drawImage(img, 0, 0, 1080, 1920);

    ctx.fillStyle = textConfig.color;
    ctx.globalAlpha = textConfig.opacity;
    ctx.textAlign = textConfig.textAlign;
    ctx.textBaseline = 'top';
    ctx.font = `bold 64px "Noto Sans Devanagari", sans-serif`;

    const lines = quote.split('\n');
    const lineHeight = 80;
    const startY = 150;
    
    // Calculate X based on alignment
    let x = 540; // center
    if (textConfig.textAlign === 'left') x = 80;
    if (textConfig.textAlign === 'right') x = 1000;

    lines.forEach((line, index) => {
      ctx.fillText(line, x, startY + (index * lineHeight));
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png', 1.0);
    link.download = `reel-sketch-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-paper text-ink selection:bg-ink/10">
      <canvas ref={canvasRef} className="hidden" />

      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="serif text-4xl md:text-5xl font-bold mb-2 tracking-tight">
          Aesthetic Reel Sketch
        </h1>
        <p className="text-muted-foreground italic text-sm md:text-base opacity-60">
          Perfect text accuracy. Minimalist emotional sketches.
        </p>
      </motion.header>

      <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest font-semibold opacity-40">
              Your Emotional Line (Hindi/Hinglish)
            </label>
            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="e.g., 'Kuch baatein ankahi hi reh gayi...'"
              className="w-full h-32 p-4 bg-white/50 border border-ink/10 rounded-2xl focus:ring-2 focus:ring-ink/20 focus:border-ink/20 outline-none transition-all resize-none hindi text-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-white/20 border border-ink/5 rounded-3xl">
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Appearance</label>
              <div className="flex flex-wrap gap-2">
                {['#1a1a1a', '#4a4a4a', '#8e8e8e', '#f5f2ed'].map(c => (
                  <button
                    key={c}
                    onClick={() => setTextConfig(prev => ({ ...prev, color: c }))}
                    className={`w-6 h-6 rounded-full border border-ink/10 transition-transform ${textConfig.color === c ? 'scale-125 ring-2 ring-ink/20' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <input 
                type="range" 
                min="0.1" max="1" step="0.1" 
                value={textConfig.opacity}
                onChange={(e) => setTextConfig(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                className="w-full accent-ink"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Alignment</label>
              <div className="flex gap-2">
                {(['left', 'center', 'right'] as const).map(align => (
                  <button
                    key={align}
                    onClick={() => setTextConfig(prev => ({ ...prev, textAlign: align }))}
                    className={`p-2 hover:bg-ink/5 rounded-lg transition-colors ${textConfig.textAlign === align ? 'bg-ink/10 ring-1 ring-ink/20' : ''}`}
                    title={`${align.charAt(0).toUpperCase() + align.slice(1)} Align`}
                  >
                    {align === 'left' && <AlignLeft className="w-4 h-4 opacity-60" />}
                    {align === 'center' && <AlignCenter className="w-4 h-4 opacity-60" />}
                    {align === 'right' && <AlignRight className="w-4 h-4 opacity-60" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={generateImage}
            disabled={isGenerating || !quote.trim()}
            className="w-full py-4 bg-ink text-paper rounded-full font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Sketch...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Create Sketch</span>
              </>
            )}
          </button>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 text-sm"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          <div className="p-6 bg-white/30 border border-ink/5 rounded-3xl space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-40">
              <Info className="w-4 h-4" />
              <span>Live Mode Note</span>
            </div>
            <p className="text-[11px] opacity-50 leading-relaxed">
              In shared mode, you'll be asked to select your Gemini API key. This ensures the app uses your own quota for image generation.
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative aspect-[9/16] w-full max-w-[320px] bg-white/50 border border-ink/10 rounded-[2rem] overflow-hidden shadow-2xl flex items-center justify-center group">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4"
                >
                  <div className="relative">
                    <Loader2 className="w-12 h-12 animate-spin opacity-10" />
                    <RefreshCw className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin opacity-20" />
                  </div>
                  <p className="serif italic text-lg opacity-40 animate-pulse">
                    {loadingMessage}
                  </p>
                </motion.div>
              ) : generatedImage ? (
                <motion.div key="preview" className="relative w-full h-full">
                  <img
                    src={generatedImage}
                    alt="Generated Sketch"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div 
                    className="absolute inset-x-0 top-[10%] px-6 whitespace-pre-wrap hindi font-bold leading-tight select-none"
                    style={{ 
                      color: textConfig.color, 
                      opacity: textConfig.opacity,
                      fontSize: `${textConfig.fontSize}px`,
                      textAlign: textConfig.textAlign
                    }}
                  >
                    {quote}
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center p-12 text-center space-y-4 opacity-10"
                >
                  <Sparkles className="w-16 h-16" />
                  <p className="serif italic">Your sketch will appear here</p>
                </motion.div>
              )}
            </AnimatePresence>

            {generatedImage && !isGenerating && (
              <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                <button
                  onClick={downloadImage}
                  className="p-4 bg-paper text-ink rounded-full shadow-2xl hover:scale-110 transition-transform"
                >
                  <Download className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>

          {generatedImage && !isGenerating && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setTextConfig(prev => ({ ...prev, fontSize: Math.max(12, prev.fontSize - 2) }))}
                  className="p-2 hover:bg-ink/5 rounded-lg transition-colors"
                >
                  <TypeIcon className="w-4 h-4 opacity-40" />
                  <span className="text-[10px] font-bold">-</span>
                </button>
                <span className="text-xs font-mono opacity-40">{textConfig.fontSize}px</span>
                <button
                  onClick={() => setTextConfig(prev => ({ ...prev, fontSize: Math.min(48, prev.fontSize + 2) }))}
                  className="p-2 hover:bg-ink/5 rounded-lg transition-colors"
                >
                  <TypeIcon className="w-4 h-4 opacity-40" />
                  <span className="text-[10px] font-bold">+</span>
                </button>
              </div>
              <button
                onClick={downloadImage}
                className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
              >
                <Download className="w-4 h-4" />
                <span>Download for Reels</span>
              </button>
            </div>
          )}
        </motion.div>
      </main>

      <footer className="mt-20 text-center opacity-20 text-[10px] uppercase tracking-[0.2em]">
        &copy; 2026 Aesthetic Reel Sketch Creator &bull; Powered by Gemini AI
      </footer>
    </div>
  );
}
