import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { MenuDisplay } from './components/MenuDisplay';
import { analyzeMenu } from './services/geminiService';
import { MenuData } from './types';
import { Loader2, ArrowLeft, UtensilsCrossed, X, FileText, Image as ImageIcon, Leaf } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const loadingQuotes = [
  "Llegint el menú...",
  "Buscant plats vegans...",
  "Buscant maneres de veganitzar els plats...",
  "Els animals t'ho agraeixen 💚",
  "Analitzant els ingredients...",
  "Descobrint joies amagades...",
  "Preparant les teves opcions...",
  "Desxifrant la lletra petita...",
  "Buscant el tofu amagat...",
  "Assegurant-nos que no hi ha formatge d'estranquis...",
  "Comprovant el brou de les sopes...",
  "A la recerca de l'hummus perfecte...",
  "Escanejant al·lèrgens i ingredients d'origen animal...",
  "Separant el gra de la palla...",
  "Negociant amb el xef virtual...",
  "Calculant el nivell de 'plant-based'...",
  "Creant el teu menú personalitzat...",
  "Gairebé ho tenim...",
  "La paciència és una virtut (i més si ets vegà)...",
  "Revisant les salses i els amaniments..."
];

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    if (!isProcessing) {
      setQuoteIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setQuoteIndex((prev) => {
        if (prev < 3) return prev + 1;
        let next = prev;
        while (next === prev) {
          next = Math.floor(Math.random() * (loadingQuotes.length - 3)) + 3;
        }
        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleFilesSelect = (files: File[]) => {
    setSelectedFiles(prev => [...prev, ...files]);
    setError(null);
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const processMenu = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsProcessing(true);
    setError(null);
    try {
      const data = await analyzeMenu(selectedFiles);
      setMenuData(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'No s\'ha pogut analitzar el menú. Si us plau, torna-ho a provar.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setMenuData(null);
    setError(null);
    setSelectedFiles([]);
  };

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8 flex flex-col items-center relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-emerald-50/50 to-transparent -z-10 pointer-events-none" />
      
      {/* Leaves for all screens */}
      <Leaf className="absolute top-12 left-[5%] md:left-[10%] text-emerald-200/60 -rotate-12 -z-10" size={48} />
      <Leaf className="absolute top-32 right-[5%] md:right-[15%] text-emerald-200/60 rotate-45 -z-10" size={64} />
      <Leaf className="absolute top-64 left-[10%] md:left-[20%] text-emerald-100/50 rotate-90 -z-10" size={32} />
      <Leaf className="absolute top-20 right-[30%] text-emerald-100/50 -rotate-45 -z-10" size={28} />
      <Leaf className="absolute top-48 left-[8%] text-emerald-200/40 rotate-[120deg] -z-10" size={40} />
      <Leaf className="absolute top-80 right-[8%] text-emerald-100/50 rotate-[15deg] -z-10" size={36} />
      <Leaf className="absolute top-[400px] left-[12%] text-emerald-50/80 -rotate-[60deg] -z-10" size={56} />
      <Leaf className="absolute top-[500px] right-[15%] text-emerald-100/40 rotate-[80deg] -z-10" size={48} />
      <Leaf className="absolute top-[250px] left-[85%] text-emerald-200/30 rotate-[200deg] -z-10" size={32} />
      <Leaf className="absolute top-[150px] left-[3%] text-emerald-100/40 rotate-[30deg] -z-10" size={24} />
      
      {/* Extra leaves for larger screens */}
      <Leaf className="absolute top-24 right-[45%] text-emerald-100/40 -rotate-45 -z-10 hidden md:block" size={40} />
      <Leaf className="absolute top-80 right-[25%] text-emerald-200/50 rotate-12 -z-10 hidden lg:block" size={56} />
      <Leaf className="absolute top-96 left-[35%] text-emerald-100/60 -rotate-90 -z-10 hidden xl:block" size={48} />
      <Leaf className="absolute top-40 left-[2%] text-emerald-50/80 rotate-180 -z-10 hidden 2xl:block" size={72} />
      <Leaf className="absolute top-[600px] left-[5%] text-emerald-100/40 rotate-[45deg] -z-10 hidden lg:block" size={64} />
      <Leaf className="absolute top-[450px] right-[5%] text-emerald-50/50 -rotate-[30deg] -z-10 hidden xl:block" size={80} />
      
      <AnimatePresence mode="wait">
        {!menuData && !isProcessing && (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-2xl mt-12 relative"
          >
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-6 shadow-sm relative">
                <Leaf className="text-emerald-600 absolute -top-3 -right-5 rotate-[24deg]" size={28} />
                <UtensilsCrossed className="text-emerald-700" size={36} />
              </div>
              <h1 className="text-4xl font-serif font-semibold mb-4 text-[#2c2c2a]">Lector de Menús Herbívor</h1>
              <p className="text-lg text-[#7a7a75] max-w-lg mx-auto">
                Puja qualsevol menú de restaurant per veure a l'instant què és vegà, vegetarià o fàcilment modificable.
              </p>
            </div>

            <FileUpload onFilesSelect={handleFilesSelect} />
            
            {selectedFiles.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-[#2c2c2a] uppercase tracking-wider mb-3">
                  Fitxers seleccionats ({selectedFiles.length})
                </h3>
                <div className="space-y-2 mb-6">
                  {selectedFiles.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#eae9e4] shadow-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        {file.type === 'application/pdf' ? (
                          <FileText className="text-blue-500 shrink-0" size={20} />
                        ) : (
                          <ImageIcon className="text-emerald-500 shrink-0" size={20} />
                        )}
                        <span className="text-sm text-[#2c2c2a] truncate">{file.name}</span>
                      </div>
                      <button 
                        onClick={() => removeFile(idx)}
                        className="p-1.5 text-[#7a7a75] hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors shrink-0"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={processMenu}
                  className="w-full bg-[#2c2c2a] hover:bg-[#1a1a19] text-white font-medium py-3.5 px-6 rounded-xl transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  <UtensilsCrossed size={18} />
                  Processar Menú
                </button>
              </div>
            )}
            
            {error && (
              <div className="mt-6 p-4 bg-rose-50 text-rose-800 rounded-xl border border-rose-100 text-sm text-center">
                {error}
              </div>
            )}
          </motion.div>
        )}

        {isProcessing && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex flex-col items-center justify-center bg-[#fcfbf9] z-50 px-4 text-center"
          >
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-6" />
            <div className="h-20 relative w-full max-w-md mx-auto flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={quoteIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3 }}
                  className="absolute flex flex-col items-center"
                >
                  <h2 className="text-2xl font-serif font-medium mb-2">{loadingQuotes[quoteIndex]}</h2>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {menuData && !isProcessing && (
          <motion.div 
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <div className="max-w-3xl mx-auto mb-12">
              <button 
                onClick={handleReset}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#7a7a75] hover:text-[#2c2c2a] transition-colors"
              >
                <ArrowLeft size={16} />
                Analitzar un altre menú
              </button>
            </div>
            
            <MenuDisplay data={menuData} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
