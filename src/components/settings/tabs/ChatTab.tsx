'use client';

import { useState, useEffect, useRef } from 'react';
import { useSettingsStore } from '@/stores/settings-store';
import { MapPin, Loader2, Crosshair, Check } from 'lucide-react';

export function ChatTab() {
  const systemPrompt = useSettingsStore((s) => s.systemPrompt);
  const setSystemPrompt = useSettingsStore((s) => s.setSystemPrompt);
  const contextWindowSize = useSettingsStore((s) => s.contextWindowSize);
  const setContextWindowSize = useSettingsStore((s) => s.setContextWindowSize);
  const userLocation = useSettingsStore((s) => s.userLocation);
  const setUserLocation = useSettingsStore((s) => s.setUserLocation);

  const [locInput, setLocInput] = useState(userLocation || '');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync state when store changes
  useEffect(() => {
    setLocInput(userLocation || '');
  }, [userLocation]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  // Fetch suggestions
  useEffect(() => {
    if (locInput === userLocation) return;
    if (locInput.length < 3) {
      setSuggestions([]);
      return;
    }
    
    const timeout = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locInput)}&format=json&limit=5`);
        const data = await res.json();
        setSuggestions(data);
        setShowDropdown(true);
      } catch (e) {
        console.error('Failed to fetch location suggestions:', e);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 600);
    
    return () => clearTimeout(timeout);
  }, [locInput, userLocation]);

  const handleAutoDetect = () => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          // Prefer city, town, or village if available, otherwise just use display_name
          const locName = data.address?.city || data.address?.town || data.address?.village || data.display_name || `${latitude}, ${longitude}`;
          setUserLocation(locName);
          setLocInput(locName);
          setSuggestions([]);
          setShowDropdown(false);
        } catch (e) {
          console.error('Failed to reverse geocode:', e);
          const fallback = `${latitude}, ${longitude}`;
          setUserLocation(fallback);
          setLocInput(fallback);
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setDetecting(false);
      }
    );
  };

  const handleSelectSuggestion = (suggestion: any) => {
    const name = suggestion.display_name;
    setUserLocation(name);
    setLocInput(name);
    setSuggestions([]);
    setShowDropdown(false);
  };

  const handleManualSave = () => {
    setUserLocation(locInput);
    setSuggestions([]);
    setShowDropdown(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          System Prompt
        </h3>
        <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
          Instructions sent to the AI at the start of every conversation.
        </p>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={4}
          className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl border outline-none resize-y focus:ring-2"
          style={{
            background: 'var(--bg-tertiary)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
            '--tw-ring-color': 'var(--accent)',
          } as React.CSSProperties}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Context Window
        </h3>
        <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
          Number of recent messages to include in each request (more = deeper context).
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={4}
            max={50}
            value={contextWindowSize}
            onChange={(e) => setContextWindowSize(parseInt(e.target.value))}
            className="flex-1 accent-indigo-500"
          />
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
            {contextWindowSize} msgs
          </span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Location
        </h3>
        <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
          Helpful for location-based tools (e.g. weather, nearby places).
        </p>
        <div className="flex items-start gap-2 relative">
          <div className="flex-1 relative" ref={dropdownRef}>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={locInput}
                onChange={(e) => {
                  setLocInput(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setShowDropdown(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualSave();
                }}
                placeholder="City, Country or Auto-detect..."
                className="w-full pl-9 pr-10 py-2.5 text-base sm:text-sm rounded-xl border outline-none focus:ring-2"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                  '--tw-ring-color': 'var(--accent)',
                } as React.CSSProperties}
              />
              {loadingSuggestions && (
                <div className="absolute right-3 top-2.5">
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div 
                className="absolute z-10 w-full mt-1 border rounded-xl overflow-hidden shadow-lg"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
              >
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border-b last:border-0 truncate"
                    style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  >
                    {s.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleAutoDetect}
            disabled={detecting}
            className="shrink-0 p-2.5 rounded-xl border transition-colors flex items-center justify-center"
            style={{
              background: 'var(--bg-tertiary)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
            title="Auto-detect Location"
          >
            {detecting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Crosshair className="w-5 h-5" />
            )}
          </button>
          {locInput !== userLocation && (
            <button
              onClick={handleManualSave}
              className="shrink-0 p-2.5 rounded-xl border transition-colors flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 text-white border-transparent"
              title="Save Location"
            >
              <Check className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
