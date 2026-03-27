import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  FileCode, 
  Terminal, 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  RefreshCw,
  BrainCircuit,
  Settings,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auditScript, learnFromLog, AuditResult, AIConfig } from './lib/gemini';
import { SHVDN3_TEMPLATE } from './lib/constants';
import initialRuleset from './lib/ruleset.json';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [script, setScript] = useState(SHVDN3_TEMPLATE);
  const [log, setLog] = useState('');
  const [ruleset, setRuleset] = useState(initialRuleset.rules);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isLearning, setIsLearning] = useState(false);
  const [activeTab, setActiveTab] = useState<'script' | 'logs' | 'rules' | 'prompt' | 'mods'>('script');
  const [savedMods, setSavedMods] = useState<{name: string, code: string, date: string}[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'gemini',
    localUrl: 'http://localhost:1234/v1',
    modelName: 'lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF'
  });

  const [systemPrompt, setSystemPrompt] = useState(`You are a strict GTA V ScriptHookVDotNet3 (SHVDN3) expert. 
Your goal is to write C# scripts that are 100% compatible with .NET Framework 4.8.
Avoid modern C# features like string interpolation ($), null-conditional operators (?.), and other features introduced after C# 5.0 unless explicitly supported by the user's compiler.

Current Best Practices:
`);

  const handleAudit = async () => {
    setIsAuditing(true);
    try {
      const result = await auditScript(script, ruleset, aiConfig);
      setAuditResult(result);
      
      // Update System Prompt with new findings
      if (result.errors.length > 0) {
        let newPromptAdditions = "\n--- New Audit Findings ---\n";
        result.errors.forEach(err => {
          newPromptAdditions += `Error: ${err.message}\nSolution: ${err.suggestion}\n`;
        });
        setSystemPrompt(prev => prev + newPromptAdditions);
      }
    } catch (error) {
      console.error('Audit failed:', error);
      alert(`Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleLearn = async () => {
    if (!log.trim()) return;
    setIsLearning(true);
    try {
      const updatedRules = await learnFromLog(log, ruleset, aiConfig);
      setRuleset(updatedRules);
      setActiveTab('rules');
    } catch (error) {
      console.error('Learning failed:', error);
      alert(`Learning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLearning(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const addRuleToPrompt = (rule: any) => {
    const addition = `\n--- Rule: ${rule.errorPattern} ---\nDescription: ${rule.description}\nSolution: ${rule.solution}\n`;
    setSystemPrompt(prev => prev + addition);
  };

  const saveToCollection = () => {
    const name = prompt("Enter a name for this mod:", "My New Mod");
    if (!name) return;
    
    const newMod = {
      name,
      code: script,
      date: new Date().toLocaleString()
    };
    setSavedMods(prev => [newMod, ...prev]);
    setActiveTab('mods');
  };

  const saveScript = () => {
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'MySHVDN3Script.cs';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getLineStyles = (lineIndex: number) => {
    if (!auditResult) return {};
    const hasError = auditResult.errors.some(err => err.line === lineIndex + 1);
    return hasError ? { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderLeft: '2px solid #ef4444' } : {};
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-orange-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-900/30 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-900/20">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">SHVDN3 Auditor</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">.NET 4.8 Strict Enforcement</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setScript(SHVDN3_TEMPLATE)}
              className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Template
            </button>
            <div className="h-4 w-px bg-zinc-800" />
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "p-2 transition-colors",
                showSettings ? "text-orange-500" : "text-zinc-400 hover:text-white"
              )}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Settings Overlay */}
        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:col-span-12 overflow-hidden"
            >
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 mb-8 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Settings className="w-4 h-4 text-orange-500" />
                    AI Engine Configuration
                  </h2>
                  <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Provider</label>
                    <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                      <button 
                        onClick={() => setAiConfig({ ...aiConfig, provider: 'gemini' })}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-md transition-all",
                          aiConfig.provider === 'gemini' ? "bg-orange-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        Gemini (Cloud)
                      </button>
                      <button 
                        onClick={() => setAiConfig({ ...aiConfig, provider: 'local' })}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-md transition-all",
                          aiConfig.provider === 'local' ? "bg-orange-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        LM Studio (Local)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Base URL</label>
                    <input 
                      type="text"
                      value={aiConfig.localUrl}
                      onChange={(e) => setAiConfig({ ...aiConfig, localUrl: e.target.value })}
                      disabled={aiConfig.provider === 'gemini'}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-xs text-zinc-300 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                      placeholder="http://localhost:1234/v1"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Model Name</label>
                    <input 
                      type="text"
                      value={aiConfig.modelName}
                      onChange={(e) => setAiConfig({ ...aiConfig, modelName: e.target.value })}
                      disabled={aiConfig.provider === 'gemini'}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-xs text-zinc-300 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                      placeholder="model-identifier"
                    />
                  </div>
                </div>
                
                {aiConfig.provider === 'local' && (
                  <div className="mt-4 p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                    <p className="text-[10px] text-orange-500/80 leading-relaxed">
                      <strong>Note:</strong> Ensure LM Studio's Local Server is running and CORS is enabled. 
                      The default URL is usually <code>http://localhost:1234/v1</code>.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Left Column: Editor & Logs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex border-b border-zinc-800 bg-zinc-900/80">
              <button 
                onClick={() => setActiveTab('script')}
                className={cn(
                  "px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 border-b-2",
                  activeTab === 'script' ? "text-orange-500 border-orange-500 bg-orange-500/5" : "text-zinc-500 border-transparent hover:text-zinc-300"
                )}
              >
                <FileCode className="w-4 h-4" />
                Script Editor
              </button>
              <button 
                onClick={() => setActiveTab('logs')}
                className={cn(
                  "px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 border-b-2",
                  activeTab === 'logs' ? "text-orange-500 border-orange-500 bg-orange-500/5" : "text-zinc-500 border-transparent hover:text-zinc-300"
                )}
              >
                <Terminal className="w-4 h-4" />
                Error Logs
              </button>
              <button 
                onClick={() => setActiveTab('prompt')}
                className={cn(
                  "px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 border-b-2",
                  activeTab === 'prompt' ? "text-orange-500 border-orange-500 bg-orange-500/5" : "text-zinc-500 border-transparent hover:text-zinc-300"
                )}
              >
                <BrainCircuit className="w-4 h-4" />
                LM Studio Prompt
              </button>
              <button 
                onClick={() => setActiveTab('mods')}
                className={cn(
                  "px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 border-b-2",
                  activeTab === 'mods' ? "text-orange-500 border-orange-500 bg-orange-500/5" : "text-zinc-500 border-transparent hover:text-zinc-300"
                )}
              >
                <Plus className="w-4 h-4" />
                Collection
              </button>
            </div>

            <div className="p-0 relative">
              <AnimatePresence mode="wait">
                {activeTab === 'script' ? (
                  <motion.div
                    key="script"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="relative flex"
                  >
                    {/* Line Numbers with Highlights */}
                    <div className="bg-zinc-950/50 border-r border-zinc-800 p-6 text-right select-none min-w-[60px]">
                      {script.split('\n').map((_, i) => (
                        <div 
                          key={i} 
                          style={getLineStyles(i)}
                          className="text-[10px] font-mono text-zinc-600 h-5 flex items-center justify-end px-2"
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    
                    <textarea
                      value={script}
                      onChange={(e) => setScript(e.target.value)}
                      className="w-full h-[600px] bg-transparent p-6 font-mono text-sm text-zinc-300 focus:outline-none resize-none leading-5"
                      spellCheck={false}
                      placeholder="Paste your C# script here..."
                    />
                    <div className="absolute bottom-6 right-6 flex gap-3">
                      <button 
                        onClick={saveScript}
                        className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-sm shadow-lg transition-all flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Save As
                      </button>
                      <button 
                        onClick={handleAudit}
                        disabled={isAuditing}
                        className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 text-white rounded-lg font-bold text-sm shadow-lg shadow-orange-900/20 transition-all flex items-center gap-2"
                      >
                        {isAuditing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        Run Audit
                      </button>
                    </div>
                  </motion.div>
                ) : activeTab === 'logs' ? (
                  <motion.div
                    key="logs"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="relative"
                  >
                    <textarea
                      value={log}
                      onChange={(e) => setLog(e.target.value)}
                      className="w-full h-[600px] bg-transparent p-6 font-mono text-sm text-zinc-400 focus:outline-none resize-none leading-relaxed"
                      spellCheck={false}
                      placeholder="Paste ScriptHookVDotNet3.log content here to train the auditor..."
                    />
                    <div className="absolute bottom-6 right-6">
                      <button 
                        onClick={handleLearn}
                        disabled={isLearning || !log.trim()}
                        className="px-6 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-lg font-bold text-sm shadow-lg transition-all flex items-center gap-2"
                      >
                        {isLearning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                        Learn & Update Rules
                      </button>
                    </div>
                  </motion.div>
                ) : activeTab === 'mods' ? (
                  <motion.div
                    key="mods"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-6 space-y-6 min-h-[600px]"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Saved Mods Collection</h3>
                      <span className="text-xs text-zinc-500">{savedMods.length} items</span>
                    </div>

                    {savedMods.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                        <Plus className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm italic">No mods saved yet. Audit a script successfully to save it here.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {savedMods.map((mod, i) => (
                          <div key={i} className="bg-zinc-800/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-all group">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="text-sm font-bold text-white">{mod.name}</h4>
                                <p className="text-[10px] text-zinc-500">{mod.date}</p>
                              </div>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  onClick={() => setScript(mod.code)}
                                  className="p-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300"
                                  title="Load Script"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => setSavedMods(prev => prev.filter((_, idx) => idx !== i))}
                                  className="p-1.5 bg-rose-900/20 hover:bg-rose-900/40 rounded text-rose-500"
                                  title="Delete"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="bg-zinc-950/50 rounded p-2 font-mono text-[10px] text-zinc-600 line-clamp-3 overflow-hidden">
                              {mod.code}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="prompt"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="relative"
                  >
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">LM Studio System Prompt</h3>
                        <button 
                          onClick={() => copyToClipboard(systemPrompt)}
                          className="px-3 py-1.5 bg-orange-600/10 text-orange-500 hover:bg-orange-600/20 rounded-md text-xs font-bold transition-all flex items-center gap-2"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy Prompt
                        </button>
                      </div>
                      <textarea
                        value={systemPrompt}
                        readOnly
                        className="w-full h-[500px] bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 font-mono text-xs text-zinc-400 focus:outline-none resize-none leading-relaxed"
                      />
                      <p className="text-[10px] text-zinc-500 italic">
                        This prompt is automatically updated with every audit finding. Use it in LM Studio to guide local LLMs in writing strict SHVDN3 scripts.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Column: Results & Rules */}
        <div className="lg:col-span-5 space-y-6">
          {/* Audit Results */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-wider">
              <Lightbulb className="w-4 h-4 text-orange-500" />
              Audit Findings
            </h2>

            {!auditResult && !isAuditing && (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500 text-center">
                <ShieldCheck className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">No audit performed yet.<br/>Paste a script and click "Run Audit".</p>
              </div>
            )}

            {isAuditing && (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <RefreshCw className="w-8 h-8 mb-4 animate-spin text-orange-500" />
                <p className="text-sm animate-pulse">Analyzing script for .NET 4.8 compliance...</p>
              </div>
            )}

            {auditResult && (
              <div className="space-y-4">
                <div className={cn(
                  "p-4 rounded-lg flex items-center gap-3 border",
                  auditResult.isValid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                )}>
                  {auditResult.isValid ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  <span className="font-bold text-sm">
                    {auditResult.isValid ? "Script is compliant" : `${auditResult.errors.length} Issues Found`}
                  </span>
                </div>

                {auditResult.isValid && (
                  <button 
                    onClick={saveToCollection}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Save to Collection
                  </button>
                )}

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {auditResult.errors.map((err, i) => (
                    <div key={i} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-200">{err.message}</p>
                        {err.line && <span className="text-[10px] bg-zinc-700 px-1.5 py-0.5 rounded text-zinc-400">Line {err.line}</span>}
                      </div>
                      <p className="text-xs text-zinc-500 italic">Suggestion: {err.suggestion}</p>
                    </div>
                  ))}
                </div>

                {auditResult.improvedCode && (
                  <button 
                    onClick={() => {
                      setScript(auditResult.improvedCode!);
                      setAuditResult(null);
                    }}
                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    Apply Improved Code
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Ruleset Knowledge Base */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                <BrainCircuit className="w-4 h-4 text-emerald-500" />
                Auditor Knowledge
              </h2>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold">
                {ruleset.length} Rules
              </span>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {ruleset.map((rule: any) => (
                <div key={rule.id} className="group bg-zinc-800/30 border border-zinc-800 hover:border-zinc-700 rounded-lg p-4 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{rule.category}</span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => addRuleToPrompt(rule)}
                        className="p-1 hover:text-emerald-500 transition-all"
                        title="Add to LM Studio Prompt"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => copyToClipboard(rule.solution)}
                        className="p-1 hover:text-white transition-all"
                        title="Copy Solution"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-xs font-bold text-zinc-300 mb-1">{rule.errorPattern}</h3>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">{rule.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}</style>
    </div>
  );
}
