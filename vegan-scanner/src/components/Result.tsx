import React from "react";
import { ProductResult } from "../services/openFoodFacts";
import { Leaf, HelpCircle, Beef, RefreshCcw, Camera, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface ResultProps {
  key?: React.Key;
  result: ProductResult;
  onScanAnother: () => void;
  onFallback?: () => void;
  onDeepSearch?: (barcode: string) => void;
}

export function Result({ result, onScanAnother, onFallback, onDeepSearch }: ResultProps) {
  const isVegan = result.status === 'vegan';
  const isVegetarian = result.status === 'vegetarian';
  const isNonVegetarian = result.status === 'non-vegetarian';
  const isUnknown = result.status === 'unknown';

  let Icon = HelpCircle;
  let colorClass = "text-stone-500";
  let bgClass = "bg-stone-100";
  let title = "Desconegut";

  if (isVegan) {
    Icon = Leaf;
    colorClass = "text-emerald-500";
    bgClass = "bg-emerald-50";
    title = "Vegà";
  } else if (isVegetarian) {
    Icon = Leaf;
    colorClass = "text-amber-500";
    bgClass = "bg-amber-50";
    title = "Vegetarià";
  } else if (isNonVegetarian) {
    Icon = Beef;
    colorClass = "text-red-500";
    bgClass = "bg-red-50";
    title = "No Vegetarià";
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center w-full max-w-md mx-auto p-8 bg-white rounded-[2rem] shadow-xl"
    >
      {result.image && (
        <img src={result.image} alt={result.productName} className="w-40 h-40 object-contain mb-8 rounded-2xl" referrerPolicy="no-referrer" />
      )}
      
      <div className={`w-28 h-28 rounded-full ${bgClass} flex items-center justify-center mb-6`}>
        <Icon className={`w-14 h-14 ${colorClass}`} />
      </div>

      <h2 className={`text-4xl font-bold mb-3 ${colorClass}`}>{title}</h2>
      
      {result.productName && (
        <h3 className="text-xl font-semibold text-stone-800 mb-3 text-center">{result.productName}</h3>
      )}

      <p className="text-stone-600 text-center mb-10 text-lg leading-relaxed">{result.reason}</p>

      <div className="flex flex-col gap-4 w-full">
        {isUnknown && onFallback && (
          <button
            onClick={onFallback}
            className="w-full py-4 px-6 bg-indigo-600 text-white rounded-2xl font-semibold flex items-center justify-center gap-3 hover:bg-indigo-700 active:scale-[0.98] transition-all text-lg"
          >
            <Camera className="w-6 h-6" />
            Escanejar Ingredients
          </button>
        )}
        
        {isUnknown && onDeepSearch && result.barcode && (
          <button
            onClick={() => onDeepSearch(result.barcode!)}
            className="w-full py-4 px-6 bg-purple-100 text-purple-700 rounded-2xl font-semibold flex items-center justify-center gap-3 hover:bg-purple-200 active:scale-[0.98] transition-all text-lg"
          >
            <Sparkles className="w-6 h-6" />
            Cerca profunda
          </button>
        )}

        <button
          onClick={onScanAnother}
          className="w-full py-4 px-6 bg-stone-100 text-stone-800 rounded-2xl font-semibold flex items-center justify-center gap-3 hover:bg-stone-200 active:scale-[0.98] transition-all text-lg"
        >
          <RefreshCcw className="w-6 h-6" />
          Escanejar un altre producte
        </button>
      </div>
    </motion.div>
  );
}
