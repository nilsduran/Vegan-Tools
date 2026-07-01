import { useState, useRef, useEffect } from "react";
import { Scanner } from "./components/Scanner";
import { Result } from "./components/Result";
import { FallbackCapture } from "./components/FallbackCapture";
import { checkBarcode, ProductResult } from "./services/openFoodFacts";
import { analyzeIngredientsImage, searchBarcodeWithGemini } from "./services/gemini";
import { Loader2, ScanLine, Camera, Search, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type ViewState = 'scanner' | 'loading' | 'result' | 'fallback-capture' | 'analyzing-image' | 'deep-searching';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('TIMEOUT'));
    }, ms);
    promise
      .then(value => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(reason => {
        clearTimeout(timer);
        reject(reason);
      });
  });
}

export default function App() {
  const [view, setView] = useState<ViewState>('scanner');
  const [result, setResult] = useState<ProductResult | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const searchIdRef = useRef(0);

  const handleScan = async (barcode: string) => {
    const currentSearchId = ++searchIdRef.current;
    setScannedCode(barcode);
    setView('loading');
    
    const offWrapper = (async () => {
      try {
        const res = await checkBarcode(barcode);
        if (res && res.status !== 'unknown') return res;
      } catch (e) {
        // Silently fail, Gemini will take over
      }
      throw new Error("OFF not found");
    })();

    const geminiWrapper = (async () => {
      try {
        const res = await searchBarcodeWithGemini(barcode, false);
        if (res && res.status !== 'unknown') return { ...res, barcode };
      } catch (e) {
        console.error("Gemini error:", e);
      }
      throw new Error("Gemini not found");
    })();

    try {
      // Race them! The first one to find a valid result wins. Max 10 seconds.
      const firstValidRes = await withTimeout(Promise.any([offWrapper, geminiWrapper]), 10000);
      
      if (currentSearchId !== searchIdRef.current) return;
      
      setResult(firstValidRes);
      setView('result');
    } catch (e) {
      // Both failed (AggregateError) or Timeout
      if (currentSearchId !== searchIdRef.current) return;
      
      setResult({
        status: 'unknown',
        reason: 'Producte no trobat a la base de dades ni a Internet. Pots escanejar la llista d\'ingredients en el seu lloc.',
        barcode
      });
      setView('result');
    }
  };

  const handleDeepSearch = async (barcode: string) => {
    const currentSearchId = ++searchIdRef.current;
    setView('deep-searching');
    
    try {
      // Max 30 seconds for deep search
      const res = await withTimeout(searchBarcodeWithGemini(barcode, true), 30000);
      
      if (currentSearchId !== searchIdRef.current) return;

      if (res) {
        setResult({ ...res, barcode });
      } else {
        setResult({
          status: 'unknown',
          reason: 'No s\'ha pogut trobar informació amb la cerca profunda.',
          barcode
        });
      }
    } catch (e) {
      if (currentSearchId !== searchIdRef.current) return;
      
      setResult({
        status: 'unknown',
        reason: 'La cerca profunda ha trigat massa o ha fallat. Si us plau, intenta-ho de nou.',
        barcode
      });
    }
    setView('result');
  };

  const handleCapture = async (imageSrc: string) => {
    const currentSearchId = ++searchIdRef.current;
    setView('analyzing-image');
    
    try {
      const res = await withTimeout(analyzeIngredientsImage(imageSrc), 30000);
      if (currentSearchId !== searchIdRef.current) return;
      setResult(res);
    } catch (e) {
      if (currentSearchId !== searchIdRef.current) return;
      setResult({
        status: 'unknown',
        reason: 'S\'ha esgotat el temps d\'espera o hi ha hagut un error en analitzar la imatge.'
      });
    }
    setView('result');
  };

  const reset = () => {
    searchIdRef.current++; // Cancel any ongoing searches
    setResult(null);
    setScannedCode(null);
    setManualBarcode(''); // Reset manual barcode input
    setView('scanner');
  };

  const handleBarcodeEdit = (newBarcode: string) => {
    searchIdRef.current++; // Stop the ongoing search
    setScannedCode(newBarcode);
    setManualBarcode(newBarcode);
    setView('scanner'); // Go back to scanner view so they can submit it
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const barcodeParam = params.get('barcode');
    if (barcodeParam) {
      // Clean up the URL so refreshing doesn't keep scanning
      window.history.replaceState({}, document.title, window.location.pathname);
      // Small timeout to ensure component is fully mounted
      setTimeout(() => handleScan(barcodeParam), 10);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col items-center p-6">
      <header className="w-full max-w-md py-8 flex items-center justify-center gap-3">
        <ScanLine className="w-10 h-10 text-emerald-600" />
        <h1 className="text-3xl font-bold tracking-tight text-stone-800">Escàner Vegà</h1>
      </header>

      <main className="flex-1 w-full flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {view === 'scanner' && (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full flex flex-col items-center"
            >
              <Scanner onScan={handleScan} />
              
              <div className="w-full max-w-md mt-6 flex gap-2">
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="Introdueix codi..."
                  className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualBarcode.trim()) {
                      handleScan(manualBarcode.trim());
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (manualBarcode.trim()) {
                      handleScan(manualBarcode.trim());
                    }
                  }}
                  disabled={!manualBarcode.trim()}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 shadow-sm"
                >
                  Cercar
                </button>
              </div>

              <p className="text-center mt-6 text-stone-500 font-medium text-lg">
                Apunta la càmera al codi de barres d'un producte
              </p>

              <div className="relative w-full max-w-md my-8 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-300"></div>
                </div>
                <div className="relative bg-stone-50 px-4 text-sm text-stone-500 font-medium uppercase tracking-widest">
                  O
                </div>
              </div>

              <button
                onClick={() => setView('fallback-capture')}
                className="w-full max-w-md py-4 px-6 bg-indigo-600 text-white rounded-2xl font-semibold flex items-center justify-center gap-3 hover:bg-indigo-700 active:scale-[0.98] transition-all text-lg shadow-lg shadow-indigo-200"
              >
                <Camera className="w-6 h-6" />
                Escanejar Ingredients Directament
              </button>
            </motion.div>
          )}

          {view === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center w-full max-w-md"
            >
              <div className="bg-white p-8 rounded-3xl shadow-xl w-full flex flex-col items-center text-center border border-stone-100">
                <Loader2 className="w-16 h-16 text-emerald-600 animate-spin mb-6" />
                <h2 className="text-2xl font-bold text-stone-800 mb-2">Buscant...</h2>
                
                <div className="w-full mb-6">
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
                    Codi detectat (Pots editar-lo)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={scannedCode || ''}
                      onChange={(e) => handleBarcodeEdit(e.target.value)}
                      className="flex-1 min-w-0 bg-stone-100 px-4 py-3 rounded-xl font-mono text-stone-700 text-lg tracking-wider border-2 border-transparent focus:border-emerald-500 focus:bg-white focus:outline-none transition-all text-center shadow-inner"
                    />
                    <button
                      onClick={() => scannedCode?.trim() && handleScan(scannedCode.trim())}
                      className="px-4 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 active:scale-95 transition-all flex items-center justify-center"
                      title="Tornar a buscar"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <p className="text-stone-500 font-medium mb-6">
                  Buscant informació del producte a les bases de dades...
                </p>

                <button
                  onClick={reset}
                  className="px-6 py-2 rounded-full border border-stone-200 text-stone-500 font-medium hover:bg-stone-50 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel·lar
                </button>
              </div>
            </motion.div>
          )}

          {view === 'analyzing-image' && (
            <motion.div
              key="analyzing-image"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-6" />
              <p className="text-stone-600 font-medium text-xl">Analitzant els ingredients...</p>
            </motion.div>
          )}

          {view === 'deep-searching' && (
            <motion.div
              key="deep-searching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center w-full max-w-md"
            >
              <div className="bg-white p-8 rounded-3xl shadow-xl w-full flex flex-col items-center text-center border border-stone-100">
                <Sparkles className="w-16 h-16 text-indigo-600 animate-pulse mb-6" />
                <h2 className="text-2xl font-bold text-stone-800 mb-2">Cerca profunda...</h2>
                
                <div className="w-full mb-6">
                  <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
                    Codi detectat (Pots editar-lo)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={scannedCode || ''}
                      onChange={(e) => handleBarcodeEdit(e.target.value)}
                      className="flex-1 min-w-0 bg-stone-100 px-4 py-3 rounded-xl font-mono text-stone-700 text-lg tracking-wider border-2 border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none transition-all text-center shadow-inner"
                    />
                    <button
                      onClick={() => scannedCode?.trim() && handleScan(scannedCode.trim())}
                      className="px-4 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 active:scale-95 transition-all flex items-center justify-center"
                      title="Tornar a buscar"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <p className="text-stone-500 font-medium mb-2">
                  Cercant informació del producte a Internet...
                </p>
                <p className="text-stone-400 text-sm mb-6">Això pot trigar uns segons</p>

                <button
                  onClick={reset}
                  className="px-6 py-2 rounded-full border border-stone-200 text-stone-500 font-medium hover:bg-stone-50 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel·lar
                </button>
              </div>
            </motion.div>
          )}

          {view === 'result' && result && (
            <Result 
              key="result"
              result={result} 
              onScanAnother={reset} 
              onFallback={() => setView('fallback-capture')}
              onDeepSearch={handleDeepSearch}
            />
          )}

          {view === 'fallback-capture' && (
            <motion.div
              key="fallback-capture"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full"
            >
              <FallbackCapture onCapture={handleCapture} />
              <button
                onClick={reset}
                className="mt-8 w-full max-w-md mx-auto py-4 px-6 bg-stone-200 text-stone-700 rounded-2xl font-semibold flex items-center justify-center hover:bg-stone-300 active:scale-[0.98] transition-all text-lg"
              >
                Cancel·lar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
