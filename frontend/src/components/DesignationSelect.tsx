import React, { useState, useRef, useEffect } from 'react';
import { 
  Briefcase, 
  ChevronDown, 
  Search, 
  Check, 
  SlidersHorizontal, 
  Plus, 
  Sparkles, 
  Stethoscope,
  UserCheck,
  X,
  Edit3
} from 'lucide-react';

export interface DesignationItem {
  title: string;
  isDoctor: boolean;
}

interface DesignationSelectProps {
  label?: string;
  items: DesignationItem[];
  value: string;
  onChange: (title: string, isDoctor: boolean) => void;
  isCustomMode: boolean;
  setIsCustomMode: (custom: boolean) => void;
  customValue: string;
  setCustomValue: (val: string) => void;
  onOpenManageModal: () => void;
  error?: string;
}

export const DesignationSelect: React.FC<DesignationSelectProps> = ({
  label = "Designation / Job Title",
  items,
  value,
  onChange,
  isCustomMode,
  setIsCustomMode,
  customValue,
  setCustomValue,
  onOpenManageModal,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const selectedItem = items.find(item => item.title === value);

  // Filter items based on search query
  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const doctorItems = filteredItems.filter(i => i.isDoctor);
  const staffItems = filteredItems.filter(i => !i.isDoctor);

  const handleSelect = (item: DesignationItem) => {
    setIsCustomMode(false);
    onChange(item.title, item.isDoctor);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSelectCustom = () => {
    setIsCustomMode(true);
    if (customValue) {
      onChange(customValue, false);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="w-full relative" ref={containerRef}>
      {/* Label and Manage List Header Row */}
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5 text-brand-500" />
          <span>{label}</span>
        </label>
        
        <button
          type="button"
          onClick={onOpenManageModal}
          className="group inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50/80 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/60 rounded-lg border border-brand-200/80 dark:border-brand-800/60 shadow-2xs hover:shadow-xs transition-all duration-150 transform active:scale-95"
          title="Customize designation list options"
        >
          <SlidersHorizontal className="h-3 w-3 group-hover:rotate-45 transition-transform duration-200" />
          <span>Manage List</span>
        </button>
      </div>

      {/* Selector Trigger Input Button */}
      {!isCustomMode ? (
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 flex items-center justify-between cursor-pointer transition-all duration-200 shadow-xs hover:border-slate-400 dark:hover:border-slate-700 ${
            isOpen 
              ? 'border-brand-500 ring-4 ring-brand-500/10 dark:ring-brand-500/20 shadow-md' 
              : error 
                ? 'border-rose-500' 
                : 'border-slate-250 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 truncate pr-2">
            {selectedItem?.isDoctor ? (
              <div className="h-6 w-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Stethoscope className="h-3.5 w-3.5" />
              </div>
            ) : (
              <div className="h-6 w-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <UserCheck className="h-3.5 w-3.5" />
              </div>
            )}

            <span className="truncate font-bold text-slate-900 dark:text-slate-100 text-xs">
              {value || 'Select Designation...'}
            </span>

            {selectedItem && (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight shrink-0 border ${
                selectedItem.isDoctor
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}>
                {selectedItem.isDoctor ? 'Doctor Role' : 'Staff Role'}
              </span>
            )}
          </div>

          <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-600' : ''}`} />
        </div>
      ) : (
        /* Custom Input Mode */
        <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Type custom designation title..."
              value={customValue}
              onChange={e => {
                setCustomValue(e.target.value);
                onChange(e.target.value, false);
              }}
              autoFocus
              className="w-full pl-9 pr-24 py-2.5 rounded-xl border border-brand-500 ring-4 ring-brand-500/10 text-xs font-semibold bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none shadow-sm"
            />
            <Edit3 className="absolute left-3 h-4 w-4 text-brand-500 pointer-events-none" />
            <button
              type="button"
              onClick={() => setIsCustomMode(false)}
              className="absolute right-2 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" /> List Mode
            </button>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1 pl-1">
            <Sparkles className="h-3 w-3 text-amber-500" />
            Custom title set for this employee profile.
          </p>
        </div>
      )}

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white/98 dark:bg-dark-900/98 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 p-2 space-y-1">
          {/* Search Box */}
          <div className="relative mb-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search job titles..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-dark-950 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 border border-transparent focus:border-brand-500/40 focus:bg-white dark:focus:bg-dark-900 focus:outline-none transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Options Scroll Container */}
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {/* Doctor Roles Group */}
            {doctorItems.length > 0 && (
              <div>
                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Stethoscope className="h-3 w-3" /> Doctor & Clinical Roles
                </div>
                <div className="space-y-0.5">
                  {doctorItems.map((item, idx) => {
                    const isSelected = item.title === value && !isCustomMode;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelect(item)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100 font-bold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-850'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span>{item.title}</span>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Staff Roles Group */}
            {staffItems.length > 0 && (
              <div>
                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <UserCheck className="h-3 w-3" /> Administration & Support Staff
                </div>
                <div className="space-y-0.5">
                  {staffItems.map((item, idx) => {
                    const isSelected = item.title === value && !isCustomMode;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelect(item)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-900 dark:text-brand-100 font-bold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-850'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span>{item.title}</span>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredItems.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching designation titles found.
              </div>
            )}
          </div>

          {/* Action Footer Divider & Custom Options */}
          <div className="pt-1.5 mt-1 border-t border-slate-200 dark:border-slate-800 space-y-0.5">
            <div
              onClick={handleSelectCustom}
              className="px-3 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-2 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Type Custom Title / Other...</span>
            </div>

            <div
              onClick={() => {
                setIsOpen(false);
                onOpenManageModal();
              }}
              className="px-3 py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer flex items-center justify-between text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-850 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3 w-3" />
                <span>Edit / Reorder List Options</span>
              </div>
              <span className="text-[10px] text-slate-400">Admin</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
