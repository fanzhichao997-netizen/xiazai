import React, { useState, useEffect } from 'react';
import { Download, Youtube, Instagram, Facebook, Video, History, Loader2, AlertCircle, CheckCircle2, Trash2, ExternalLink, ListPlus, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';

type Platform = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'twitter' | 'unknown';

interface ExtractionResult {
  url: string;
  title: string;
  platform: Platform;
  timestamp: number;
  originalUrl: string;
}

export default function App() {
  const [urlsText, setUrlsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<ExtractionResult[]>([]);
  const [errors, setErrors] = useState<{url: string, error: string}[]>([]);
  const [history, setHistory] = useState<ExtractionResult[]>([]);
  const [activeTab, setActiveTab] = useState<'extract' | 'history'>('extract');

  useEffect(() => {
    const saved = localStorage.getItem('smve_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history');
      }
    }
  }, []);

  const saveToHistory = (items: ExtractionResult[]) => {
    const newHistory = [...items, ...history.filter(h => !items.some(i => i.originalUrl === h.originalUrl))].slice(0, 100);
    setHistory(newHistory);
    localStorage.setItem('smve_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('smve_history');
  };

  const detectPlatform = (url: string): Platform => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) return 'facebook';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    return 'unknown';
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlsText.trim()) return;

    const urls = urlsText.split(/[\r\n]+/).map(u => u.trim()).filter(u => u);
    if (urls.length === 0) return;
    
    if (urls.length > 30) {
      setErrors([{ url: 'System', error: 'Maximum 30 URLs allowed at once.' }]);
      return;
    }

    setLoading(true);
    setErrors([]);
    setResults([]);
    setProgress({ current: 0, total: urls.length });

    const newResults: ExtractionResult[] = [];
    const newErrors: {url: string, error: string}[] = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        const platform = detectPlatform(url);
        
        const res = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to extract video');
        }

        // Add sequence number to the title
        const titleWithSeq = `${i + 1}_${data.data.title || 'Extracted Video'}`;

        const newResult: ExtractionResult = {
          url: data.data.url,
          title: titleWithSeq,
          platform: platform,
          timestamp: Date.now(),
          originalUrl: url
        };

        newResults.push(newResult);
      } catch (err: any) {
        newErrors.push({ url, error: err.message || 'An unexpected error occurred' });
      } finally {
        setProgress({ current: i + 1, total: urls.length });
        setResults([...newResults]);
        setErrors([...newErrors]);
      }
    }

    if (newResults.length > 0) {
      saveToHistory(newResults);
      setUrlsText('');
    }
    setLoading(false);
  };

  const handleDownload = async (videoUrl: string, title: string) => {
    // Replace invalid characters for filenames (Windows/Mac/Linux safe)
    let safeTitle = title.replace(/[\n\r]+/g, ' ').replace(/[/\\?%*:|"<>]/g, '-').trim() || 'video';
    
    // Proactively truncate to 240 bytes to avoid OS limits and prevent too many retries
    let chars = Array.from(safeTitle);
    const encoder = new TextEncoder();
    while (encoder.encode(chars.join('')).length > 240 && chars.length > 0) {
      chars.pop();
    }
    let currentTitle = chars.join('').trim();
    const defaultFilename = currentTitle.endsWith('.mp4') ? currentTitle : `${currentTitle}.mp4`;
    
    try {
      const downloadUrl = `/api/download?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(currentTitle)}`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Download failed:', err);
      alert('Download failed. Please try again.');
    }
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      await handleDownload(result.url, result.title);
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const PlatformIcon = ({ platform, className }: { platform: Platform; className?: string }) => {
    switch (platform) {
      case 'youtube': return <Youtube className={cn("text-red-500", className)} />;
      case 'tiktok': return <Video className={cn("text-black", className)} />;
      case 'instagram': return <Instagram className={cn("text-pink-500", className)} />;
      case 'facebook': return <Facebook className={cn("text-blue-600", className)} />;
      case 'twitter': return <svg viewBox="0 0 24 24" className={cn("fill-current text-black", className)}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 5.961h-1.91z"/></svg>;
      default: return <Video className={cn("text-gray-500", className)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans text-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Download size={20} />
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-tight">SMVE</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Data Analyst Tool</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('extract')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              activeTab === 'extract' ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <ListPlus size={18} />
            Batch Extractor
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              activeTab === 'history' ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <History size={18} />
            History
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Supported</h3>
            <div className="flex gap-2 text-gray-400">
              <Youtube size={16} />
              <Instagram size={16} />
              <Facebook size={16} />
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 5.961h-1.91z"/></svg>
              <Video size={16} />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Download size={16} />
            </div>
            <span className="font-semibold text-sm">SMVE</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('extract')} className={cn("p-2 rounded-md", activeTab === 'extract' ? "bg-indigo-50 text-indigo-600" : "text-gray-500")}>
              <ListPlus size={20} />
            </button>
            <button onClick={() => setActiveTab('history')} className={cn("p-2 rounded-md", activeTab === 'history' ? "bg-indigo-50 text-indigo-600" : "text-gray-500")}>
              <History size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
          <div className="max-w-4xl mx-auto">
            
            {activeTab === 'extract' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-light tracking-tight text-gray-900 mb-2">Batch Extract Videos</h2>
                  <p className="text-gray-500 text-sm">Paste up to 30 links from YouTube, TikTok, Instagram, or Facebook (one per line) to download them all at once.</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
                  <form onSubmit={handleExtract} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="urls" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Video URLs</label>
                        <span className="text-xs text-gray-500">{urlsText.split(/[\r\n]+/).filter(u => u.trim()).length} / 30</span>
                      </div>
                      <div className="relative">
                        <textarea
                          id="urls"
                          value={urlsText}
                          onChange={(e) => setUrlsText(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=...&#10;https://www.tiktok.com/@user/video/...&#10;https://www.instagram.com/p/..."
                          className="w-full pl-4 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-gray-900 min-h-[160px] resize-y font-mono text-sm"
                          required
                        />
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading || !urlsText.trim()}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Extracting ({progress.current}/{progress.total})...
                        </>
                      ) : (
                        <>
                          <ListPlus size={20} />
                          Extract Videos
                        </>
                      )}
                    </button>
                  </form>

                  <AnimatePresence>
                    {errors.length > 0 && (
                      <motion.div
                        key="errors-panel"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 bg-red-50 text-red-700 p-4 rounded-xl flex flex-col gap-2 text-sm"
                      >
                        <div className="flex items-center gap-2 font-medium">
                          <AlertCircle size={18} className="shrink-0" />
                          <span>{errors.length} error(s) occurred:</span>
                        </div>
                        <ul className="list-disc pl-6 space-y-1">
                          {errors.map((err, idx) => (
                            <li key={`err-${idx}-${err.url}`}>
                              <span className="font-mono text-xs opacity-70 truncate inline-block max-w-[200px] align-bottom mr-2">{err.url}</span>
                              {err.error}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}

                    {results.length > 0 && (
                      <motion.div
                        key="results-panel"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 pt-8 border-t border-gray-100"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={20} className="text-emerald-500" />
                            <h3 className="font-medium text-gray-900">Successfully Extracted ({results.length})</h3>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleDownloadAll}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <Download size={16} />
                              Download All
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                          <Info size={14} /> Your browser will handle the download. Depending on your settings, it may ask where to save each file.
                        </p>
                        
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                          {results.map((result, idx) => (
                            <div key={`res-${idx}-${result.originalUrl}`} className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col sm:flex-row gap-4 items-center">
                              <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center shrink-0">
                                <PlatformIcon platform={result.platform} className="w-6 h-6" />
                              </div>
                              <div className="flex-1 min-w-0 text-center sm:text-left w-full">
                                <p className="font-medium text-gray-900 truncate" title={result.title}>{result.title}</p>
                                <p className="text-xs text-gray-500 capitalize mt-1 truncate">{result.platform} &bull; {result.originalUrl}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDownload(result.url, result.title)}
                                className="w-full sm:w-auto px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shrink-0"
                              >
                                <Download size={16} />
                                Download
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-light tracking-tight text-gray-900 mb-2">History</h2>
                    <p className="text-gray-500 text-sm">Previously extracted videos for analysis.</p>
                  </div>
                  <div className="flex gap-2">
                    {history.length > 0 && (
                      <button
                        onClick={clearHistory}
                        className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {history.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 border-dashed p-12 text-center">
                    <History size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-gray-900 font-medium mb-1">No history yet</h3>
                    <p className="text-gray-500 text-sm">Extracted videos will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((item, idx) => (
                      <div key={`hist-${idx}-${item.timestamp}`} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-4 items-center hover:shadow-sm transition-shadow">
                        <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                          <PlatformIcon platform={item.platform} className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0 w-full">
                          <p className="font-medium text-gray-900 truncate" title={item.title}>{item.title}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500 capitalize">{item.platform}</span>
                            <span className="text-xs text-gray-400">&bull;</span>
                            <span className="text-xs text-gray-500 truncate max-w-[200px]" title={item.originalUrl}>{item.originalUrl}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownload(item.url, item.title)}
                          className="w-full sm:w-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shrink-0"
                        >
                          <Download size={16} />
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
}
