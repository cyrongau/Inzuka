import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface SearchItem {
  id: string;
  name: string;
  subtitle?: string;
  icon?: React.ReactNode;
  imageUrl?: string;
}

interface SmartSearchProps {
  data: SearchItem[];
  onSelect: (item: SearchItem) => void;
  placeholder?: string;
  minChars?: number;
  value?: string;
  onChange?: (val: string) => void;
  className?: string;
  inputClassName?: string;
}

export default function SmartSearch({ 
  data, 
  onSelect, 
  placeholder = "Search...", 
  minChars = 3, 
  value, 
  onChange,
  className = "flex items-center gap-4 bg-white dark:bg-zinc-900 p-2 rounded-2xl shadow-sm border border-black/5 dark:border-white/5",
  inputClassName = "w-full py-3 bg-transparent font-medium focus:outline-none text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600"
}: SmartSearchProps) {
  const [internalSearch, setInternalSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<SearchItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchTerm = value !== undefined ? value : internalSearch;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (onChange) onChange(val);
    setInternalSearch(val);
  };

  useEffect(() => {
    if (searchTerm.length >= minChars) {
      const filtered = data.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item.subtitle && item.subtitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.id && item.id.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
  }, [searchTerm, data, minChars]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full z-20">
      <div className={className}>
        <div className="pl-4 text-gray-400 dark:text-gray-500 shrink-0">
            <Search className="w-5 h-5" />
        </div>
        <input 
            type="text" 
            placeholder={placeholder}
            value={searchTerm}
            onChange={handleSearchChange}
            onFocus={() => setIsFocused(true)}
            className={inputClassName}
        />
      </div>

      <AnimatePresence>
        {isFocused && searchTerm.length >= minChars && (
          <motion.div 
             initial={{ opacity: 0, y: -10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -10 }}
             className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-[2rem] shadow-2xl overflow-hidden"
          >
            {results.length > 0 ? (
              <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                {results.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelect(item);
                      setIsFocused(false);
                      if (onChange) onChange('');
                      setInternalSearch(''); 
                    }}
                    className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-2xl transition-colors text-left"
                  >
                    {item.imageUrl ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-black/5 dark:border-white/5 bg-gray-100 dark:bg-zinc-800">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    ) : item.icon ? (
                      <div className="w-10 h-10 bg-gray-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center shrink-0 text-gray-500">
                        {item.icon}
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-black dark:text-white tracking-tight truncate">{item.name}</h4>
                      {item.subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.subtitle}</p>}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm font-medium">
                No results found for "{searchTerm}"
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
