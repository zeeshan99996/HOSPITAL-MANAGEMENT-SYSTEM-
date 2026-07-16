import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  AlertCircle,
  RefreshCw,
  Minus,
  Maximize2
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

export const AIChatbotWidget: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!user) return null;

  // Role friendly display names
  const roleDisplayNames: Record<string, string> = {
    admin: 'Admin Mode',
    doctor: 'Doctor Mode',
    receptionist: 'Reception Mode',
    lab_technician: 'Lab Tech Mode',
    pharmacist: 'Pharmacist Mode',
    accountant: 'Accountant Mode',
    nurse: 'Nurse Mode',
    patient: 'Patient Mode'
  };

  // Get dynamic suggestions based on user role
  const getSuggestions = () => {
    switch (user.role) {
      case 'admin':
        return [
          'Show overall dashboard stats',
          'Check medicine inventory status',
          'Show active lab requests list',
          'Register patient named Mark Evans, dob 1980-05-15, phone 03001234567'
        ];
      case 'receptionist':
        return [
          'Show active wait tokens',
          'Create walk-in queue token for OPD',
          'List of pending appointments',
          'Register patient named Alice Green, dob 1995-10-25, phone 03119876543'
        ];
      case 'doctor':
        return [
          'Show my appointments list',
          'Check lab diagnostic test requests',
          'What is the bed occupancy details?',
          'Check patient list'
        ];
      case 'pharmacist':
        return [
          'Check low stock medicines',
          'Show current stock levels',
          'Are there any stock warnings?'
        ];
      case 'accountant':
        return [
          'Show monthly billing summary',
          'List unpaid invoice logs',
          'Check medicine stock rates'
        ];
      case 'lab_technician':
        return [
          'List active lab test requests',
          'How many diagnostic tests are pending?',
          'Check patient directory'
        ];
      default:
        return [
          'Show active appointments',
          'How can you help me today?'
        ];
    }
  };

  const handleSendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setInputText('');
    setErrorMsg('');
    
    // Append user message
    const updatedMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Map frontend messages payload history log
      const payloadMessages = updatedMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await apiClient.post('/ai/chat', {
        messages: payloadMessages
      });

      if (res.error) {
        // Enforce RBAC validation or execution error
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: res.response || 'Action rejected.', isError: true }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: res.response || 'No response.' }
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Network error connecting to Copilot API.');
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Failed to communicate with LifeFlow Copilot: ${err.message || 'Please check if server is running.'}`,
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputText);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleResetHistory = () => {
    setMessages([]);
    setErrorMsg('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`flex flex-col border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-dark-900 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
              isMinimized
                ? 'w-80 h-14'
                : 'w-[420px] max-w-[calc(100vw-32px)] h-[580px] max-h-[calc(100vh-120px)]'
            }`}
          >
            {/* Widget Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-600 to-brand-500 text-white shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-white/10 rounded-lg">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-wide">LifeFlow Copilot</h3>
                  <span className="text-[10px] opacity-90 font-medium">
                    {roleDisplayNames[user.role] || 'Staff Mode'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1 hover:bg-white/10 rounded-md transition-colors"
                  title={isMinimized ? 'Expand' : 'Minimize'}
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                </button>
                <button
                  onClick={handleResetHistory}
                  className="p-1 hover:bg-white/10 rounded-md transition-colors"
                  title="Reset Conversation"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-md transition-colors"
                  title="Close Copilot"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Minimize check rendering */}
            {!isMinimized && (
              <>
                {/* Messages Log Panel */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-dark-950/20">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                      <div className="p-3 bg-brand-50 dark:bg-brand-950/40 rounded-2xl text-brand-500 animate-bounce">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <div className="max-w-[280px]">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Hi {user.name.split(' ')[0]}! How can I assist you?
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          I am linked directly to database models. Ask me to search patients, check inventory, schedule bookings, or list queues based on your role.
                        </p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="h-7 w-7 rounded-lg bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 border border-brand-200/20 font-bold text-[10px]">
                            LF
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-brand-600 text-white rounded-tr-none'
                              : msg.isError
                              ? 'bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 rounded-tl-none flex gap-2 items-start'
                              : 'bg-white dark:bg-dark-850 border border-slate-150 dark:border-slate-800 text-slate-850 dark:text-slate-100 rounded-tl-none'
                          }`}
                        >
                          {msg.isError && <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                          <div className="space-y-1">
                            {msg.role === 'user' ? (
                              <p className="text-[11px] text-white font-medium leading-relaxed">
                                {msg.content}
                              </p>
                            ) : (
                              parseMarkdown(msg.content)
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Typing Indicator */}
                  {isLoading && (
                    <div className="flex gap-2.5 justify-start">
                      <div className="h-7 w-7 rounded-lg bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 border border-brand-200/20 font-bold text-[10px] animate-pulse">
                        LF
                      </div>
                      <div className="bg-white dark:bg-dark-850 border border-slate-150 dark:border-slate-800 rounded-2xl rounded-tl-none px-3.5 py-3 shadow-sm flex items-center gap-1.5 shrink-0">
                        <span className="h-2 w-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="h-2 w-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="h-2 w-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Suggestions Section */}
                <div className="px-4 py-2 bg-white dark:bg-dark-900 border-t border-slate-100 dark:border-slate-850 shrink-0 overflow-x-auto flex gap-2 no-scrollbar">
                  {getSuggestions().map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(s)}
                      disabled={isLoading}
                      className="px-2.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-dark-950 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950/30 dark:hover:text-brand-400 hover:border-brand-300 dark:hover:border-brand-900 transition-colors shrink-0 max-w-[200px] truncate"
                      title={s}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Text input form */}
                <form
                  onSubmit={handleSubmit}
                  className="p-3 bg-white dark:bg-dark-900 border-t border-slate-100 dark:border-slate-850 flex gap-2 items-center shrink-0"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Type to chat or execute action..."
                    disabled={isLoading}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white dark:focus:bg-dark-900 transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isLoading}
                    className="p-2 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white disabled:opacity-40 disabled:scale-100 transition-all"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher Bubble Trigger Button */}
      {!isOpen && (
        <motion.button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-brand-600 to-brand-500 shadow-xl shadow-brand-500/20 text-white hover:shadow-brand-600/30 transition-all border border-brand-400/20 cursor-pointer"
        >
          <MessageSquare className="h-6 w-6" />
        </motion.button>
      )}
    </div>
  );
};

const renderTable = (headers: string[], rows: string[][]) => {
  return (
    <div className="my-2 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 shadow-sm max-w-full">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-[10px]">
        <thead className="bg-slate-50 dark:bg-dark-950 text-slate-700 dark:text-slate-350 font-bold uppercase">
          <tr>
            {headers.map((h, idx) => (
              <th key={idx} className="px-2 py-1.5 border-r last:border-r-0 border-slate-200 dark:border-slate-800">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-dark-900 text-slate-600 dark:text-slate-400">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-dark-950/20">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-2 py-1.5 border-r last:border-r-0 border-slate-200 dark:border-slate-800 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const parseInline = (text: string): React.ReactNode[] => {
  const parts = text.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-bold text-slate-900 dark:text-white">{part}</strong>;
    }
    return part;
  });
};

const parseMarkdown = (text: string): React.ReactNode[] => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Table parsing
    if (line.startsWith('|')) {
      const cells = line
        .split('|')
        .map(c => c.trim())
        .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
        
      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
        tableRows = [];
        // Skip separator line
        if (i + 1 < lines.length && lines[i + 1].trim().startsWith('|') && lines[i + 1].includes('---')) {
          i++; 
        }
      } else {
        tableRows.push(cells);
      }
      continue;
    }
    
    // If we were in a table and current line is not table row
    if (inTable && !line.startsWith('|')) {
      elements.push(renderTable(tableHeaders, tableRows));
      inTable = false;
    }
    
    // Headings
    if (line.startsWith('###')) {
      elements.push(
        <h4 key={i} className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2.5 mb-1">
          {parseInline(line.replace(/^###\s*/, ''))}
        </h4>
      );
    } else if (line.startsWith('##')) {
      elements.push(
        <h3 key={i} className="text-xs font-extrabold text-slate-850 dark:text-slate-100 mt-3 mb-1">
          {parseInline(line.replace(/^##\s*/, ''))}
        </h3>
      );
    } else if (line.startsWith('#')) {
      elements.push(
        <h2 key={i} className="text-sm font-black text-slate-900 dark:text-white mt-3.5 mb-1.5">
          {parseInline(line.replace(/^#\s*/, ''))}
        </h2>
      );
    }
    // Bullet points
    else if (line.startsWith('-') || line.startsWith('*')) {
      elements.push(
        <ul key={i} className="list-disc pl-4 my-0.5">
          <li className="text-[11px] text-slate-700 dark:text-slate-350">
            {parseInline(line.replace(/^[-*]\s*/, ''))}
          </li>
        </ul>
      );
    }
    // Empty lines
    else if (line === '') {
      elements.push(<div key={i} className="h-1.5" />);
    }
    // Paragraph text
    else {
      elements.push(
        <p key={i} className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed my-1">
          {parseInline(line)}
        </p>
      );
    }
  }
  
  if (inTable) {
    elements.push(renderTable(tableHeaders, tableRows));
  }
  
  return elements;
};

