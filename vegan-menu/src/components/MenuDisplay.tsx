import React, { useState, useEffect, useMemo } from 'react';
import { MenuData, MenuItem, DietCategory } from '../types';
import { Leaf, AlertCircle, CheckCircle2, Info, ArrowDownUp, Filter, Menu as MenuIcon, X, PawPrint, Egg } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MenuDisplayProps {
  data: MenuData;
}

const CategoryBadge = ({ category }: { category: MenuItem['category'] }) => {
  if (category === 'vegan') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
        <Leaf size={10} />
        Vegà
      </span>
    );
  }
  if (category === 'vegetarian') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider">
        <Egg size={10} />
        Vegetarià
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-rose-100 text-rose-800 border border-rose-200 uppercase tracking-wider">
      <PawPrint size={10} />
      Carnívor
    </span>
  );
};

export function MenuDisplay({ data }: MenuDisplayProps) {
  const [activeFilters, setActiveFilters] = useState<DietCategory[]>(['vegan']);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'name-asc'>('default');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [includeModifications, setIncludeModifications] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  const sections = data?.sections || [];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const stats = useMemo(() => {
    let veganCount = 0;
    let vegetarianCount = 0;
    let veganizableCount = 0;
    let vegetarianizableCount = 0;

    sections.forEach(section => {
      (section.items || []).forEach(item => {
        if (item.category === 'vegan') {
          veganCount++;
        } else if (item.category === 'vegetarian') {
          vegetarianCount++;
        }
        
        if (item.modificationNote) {
          let becomesVegan = false;
          let becomesVegetarian = false;

          if (item.modifiableTo) {
            if (item.modifiableTo === 'vegan') becomesVegan = true;
            if (item.modifiableTo === 'vegetarian') becomesVegetarian = true;
          } else {
            const note = item.modificationNote.toLowerCase();
            if (note.includes('vegà') || note.includes('vegan')) {
              becomesVegan = true;
            } else if (note.includes('vegetarià') || note.includes('vegetarian')) {
              becomesVegetarian = true;
            } else {
              if (item.category === 'carnivore') becomesVegetarian = true;
              if (item.category === 'vegetarian') becomesVegan = true;
            }
          }

          if (becomesVegan) {
            veganizableCount++;
            if (item.category === 'carnivore') vegetarianizableCount++;
          } else if (becomesVegetarian) {
            vegetarianizableCount++;
          }
        }
      });
    });

    return { veganCount, vegetarianCount, veganizableCount, vegetarianizableCount };
  }, [sections]);

  const parsePrice = (priceStr?: string) => {
    if (!priceStr) return 0;
    const match = priceStr.match(/[\d,.]+/);
    if (!match) return 0;
    return parseFloat(match[0].replace(',', '.'));
  };

  const toggleFilter = (cat: DietCategory) => {
    setActiveFilters(prev => 
      prev.includes(cat) ? prev.filter(f => f !== cat) : [...prev, cat]
    );
  };

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isSidebarOpen]);

  // Memoize filtered and sorted sections
  const processedSections = useMemo(() => {
    return sections.map(section => {
      let items = section?.items || [];
      
      // Filter
      if (activeFilters.length > 0) {
        items = items.filter(item => {
          // If the item's native category is selected, show it
          if (activeFilters.includes(item.category)) return true;
          
          // If we include modifications and it has a modification note
          if (includeModifications && item.modificationNote) {
            if (item.modifiableTo) {
              // If the target modification diet is selected, show it
              if (activeFilters.includes(item.modifiableTo)) return true;
              // If it can be made vegan, it can implicitly be made vegetarian too
              if (item.modifiableTo === 'vegan' && activeFilters.includes('vegetarian')) return true;
            } else {
              // Fallback heuristic if AI didn't provide modifiableTo
              const note = item.modificationNote.toLowerCase();
              if (note.includes('vegà') || note.includes('vegan')) {
                if (activeFilters.includes('vegan') || activeFilters.includes('vegetarian')) return true;
              } else if (note.includes('vegetarià') || note.includes('vegetarian')) {
                if (activeFilters.includes('vegetarian')) return true;
              } else {
                // Assume it bumps up one level
                if (item.category === 'carnivore' && activeFilters.includes('vegetarian')) return true;
                if (item.category === 'vegetarian' && activeFilters.includes('vegan')) return true;
              }
            }
          }
          return false;
        });
      }

      // Sort
      if (sortBy !== 'default') {
        items = [...items].sort((a, b) => {
          if (sortBy === 'price-asc') return parsePrice(a.price) - parsePrice(b.price);
          if (sortBy === 'price-desc') return parsePrice(b.price) - parsePrice(a.price);
          if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
          return 0;
        });
      }

      return { ...section, items };
    });
  }, [sections, activeFilters, includeModifications, sortBy]);

  return (
    <div className="max-w-5xl mx-auto w-full pb-20 flex flex-col md:flex-row gap-8 relative">
      
      {/* Mobile Header with Hamburger (Floating) */}
      <div className="md:hidden fixed bottom-6 right-6 z-40">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="bg-[#2c2c2a] text-white shadow-xl p-4 rounded-full transition-transform hover:scale-105 flex items-center justify-center"
        >
          <MenuIcon size={24} />
        </button>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#fcfbf9] shadow-2xl md:shadow-none p-6 overflow-y-auto transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:w-64 md:p-0 md:pl-4 md:bg-transparent md:h-[calc(100vh-3rem)] md:sticky md:top-6 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-8 md:hidden">
          <h2 className="text-xl font-serif font-semibold text-[#2c2c2a]">Menú</h2>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 -mr-2 text-[#7a7a75] hover:bg-[#f0efe9] rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-8">
          {/* Filters */}
          <div>
            <h3 className="text-sm font-semibold text-[#2c2c2a] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Filter size={14} /> Filtres
            </h3>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setActiveFilters([])}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeFilters.length === 0 ? 'bg-[#2c2c2a] text-white' : 'hover:bg-[#f0efe9] text-[#5a5a55]'}`}
              >
                Tots els plats
              </button>
              <button 
                onClick={() => toggleFilter('vegan')}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${activeFilters.includes('vegan') ? 'bg-emerald-100 text-emerald-800 font-medium' : 'hover:bg-emerald-50 text-[#5a5a55]'}`}
              >
                <span className="flex items-center gap-2"><Leaf size={14} /> Vegà</span>
                {activeFilters.includes('vegan') && <CheckCircle2 size={14} />}
              </button>
              <button 
                onClick={() => toggleFilter('vegetarian')}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${activeFilters.includes('vegetarian') ? 'bg-amber-100 text-amber-800 font-medium' : 'hover:bg-amber-50 text-[#5a5a55]'}`}
              >
                <span className="flex items-center gap-2"><Egg size={14} /> Vegetarià</span>
                {activeFilters.includes('vegetarian') && <CheckCircle2 size={14} />}
              </button>
              <button 
                onClick={() => toggleFilter('carnivore')}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${activeFilters.includes('carnivore') ? 'bg-rose-100 text-rose-800 font-medium' : 'hover:bg-rose-50 text-[#5a5a55]'}`}
              >
                <span className="flex items-center gap-2"><PawPrint size={14} /> Carnívor</span>
                {activeFilters.includes('carnivore') && <CheckCircle2 size={14} />}
              </button>
            </div>

            {/* Toggle for modifications */}
            <div className="mt-3 pt-3 border-t border-[#eae9e4]">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative inline-flex items-center">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={includeModifications}
                    onChange={(e) => setIncludeModifications(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-[#d1d0cb] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </div>
                <span className="text-xs text-[#5a5a55] group-hover:text-[#2c2c2a] transition-colors leading-tight">
                  Incloure plats adaptables
                </span>
              </label>
            </div>
          </div>

          {/* Sort */}
          <div>
            <h3 className="text-sm font-semibold text-[#2c2c2a] uppercase tracking-wider mb-3 flex items-center gap-2">
              <ArrowDownUp size={14} /> Ordenar
            </h3>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-white border border-[#eae9e4] rounded-lg px-3 py-2 text-sm text-[#2c2c2a] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="default">Per defecte (Menú)</option>
              <option value="price-asc">Preu: de més baix a més alt</option>
              <option value="price-desc">Preu: de més alt a més baix</option>
              <option value="name-asc">Nom: A-Z</option>
            </select>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-[#2c2c2a] uppercase tracking-wider mb-3">
              Seccions
            </h3>
            <div className="flex flex-col gap-1">
              {processedSections.map((section, idx) => {
                if (section.items.length === 0) return null;
                return (
                  <a 
                    key={idx}
                    href={`#section-${idx}`}
                    onClick={() => setIsSidebarOpen(false)}
                    className="text-sm text-[#7a7a75] hover:text-[#2c2c2a] py-1 transition-colors"
                  >
                    {section.sectionName}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {data?.restaurantName && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center md:text-left"
          >
            <h1 className="text-4xl font-serif font-semibold tracking-tight mb-3">{data.restaurantName}</h1>
            <div className="h-px w-16 bg-[#d1d0cb] mx-auto md:mx-0"></div>
          </motion.div>
        )}

        {/* Stats Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          <div className="bg-emerald-100 rounded-xl p-4 border border-emerald-200 flex flex-col justify-center items-center sm:items-start text-center sm:text-left">
            <div className="text-3xl font-semibold text-emerald-800 mb-1">{stats.veganCount}</div>
            <div className="text-[10px] text-emerald-700 uppercase tracking-wider font-bold">Plats Vegans</div>
          </div>
          <div className="bg-amber-100 rounded-xl p-4 border border-amber-200 flex flex-col justify-center items-center sm:items-start text-center sm:text-left">
            <div className="text-3xl font-semibold text-amber-800 mb-1">{stats.vegetarianCount}</div>
            <div className="text-[10px] text-amber-700 uppercase tracking-wider font-bold">Plats Vegetarians</div>
          </div>
          <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-100 flex flex-col justify-center items-center sm:items-start text-center sm:text-left">
            <div className="text-3xl font-semibold text-emerald-700 mb-1">{stats.veganizableCount}</div>
            <div className="text-[10px] text-emerald-600 uppercase tracking-wider font-bold">Adaptables a Vegà</div>
          </div>
          <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-100 flex flex-col justify-center items-center sm:items-start text-center sm:text-left">
            <div className="text-3xl font-semibold text-amber-700 mb-1">{stats.vegetarianizableCount}</div>
            <div className="text-[10px] text-amber-600 uppercase tracking-wider font-bold">Adaptables a Vegetarià</div>
          </div>
        </motion.div>

        <div className="space-y-12">
          {processedSections.map((section, sIdx) => {
            const items = section.items;
            if (items.length === 0) return null;
            
            return (
              <motion.section 
                key={sIdx}
                id={`section-${sIdx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sIdx * 0.05 }}
                className="scroll-mt-8"
              >
                <h2 className="text-2xl font-serif italic mb-5 text-[#5a5a55] border-b border-[#eae9e4] pb-2">
                  {section.sectionName}
                </h2>
                
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {items.map((item, iIdx) => {
                      let modType = '';
                      if (item.modificationNote) {
                        if (item.modifiableTo === 'vegan') modType = 'vegan';
                        else if (item.modifiableTo === 'vegetarian') modType = 'vegetarian';
                        else {
                          const note = item.modificationNote.toLowerCase();
                          if (note.includes('vegà') || note.includes('vegan')) modType = 'vegan';
                          else if (note.includes('vegetarià') || note.includes('vegetarian')) modType = 'vegetarian';
                          else {
                            if (item.category === 'carnivore') modType = 'vegetarian';
                            if (item.category === 'vegetarian') modType = 'vegan';
                          }
                        }
                      }

                      return (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          key={item.name + iIdx} 
                          className="bg-white rounded-xl p-4 shadow-sm border border-[#eae9e4] flex flex-col h-full hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <h3 className="text-base font-semibold text-[#2c2c2a] leading-tight">{item.name}</h3>
                            {item.price && (
                              <span className="text-base font-medium text-[#2c2c2a] whitespace-nowrap bg-[#f5f4f0] px-1.5 rounded">{item.price}</span>
                            )}
                          </div>
                          
                          {item.description && (
                            <p className="text-xs text-[#7a7a75] mb-3 leading-relaxed flex-grow">
                              {item.description}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-2 mt-auto pt-3 border-t border-[#f5f4f0]">
                            <CategoryBadge category={item.category} />
                            
                            {item.modificationNote && (
                              <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md ${
                                modType === 'vegan' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                <Info size={10} className={modType === 'vegan' ? 'text-emerald-600 shrink-0' : 'text-amber-600 shrink-0'} />
                                <span className="italic leading-tight">{item.modificationNote}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </motion.section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
