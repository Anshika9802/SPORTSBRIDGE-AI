import React, { useState } from 'react';
import { Send, ArrowUpRight, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { formatCurrency, formatMonthlyPrice } from '../lib/currency.ts';
import { OpportunityType } from '../lib/matching.ts';
import { ScoredOpportunityCard, SPORT_LABELS } from '../types.ts';

interface AiChatViewProps {
  onOpenDetail: (type: OpportunityType, id: number) => void;
}

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  results?: ScoredOpportunityCard[];
  error?: boolean;
}

const SAMPLE_PROMPTS = [
  'Find affordable football coaching near me under ₹2,000/month',
  'Show free athletics or football selection trials in Bengaluru or Mumbai',
  'Which scholarships fit a 16-year-old badminton or athletics player?',
  'Swimming pools under ₹1,500/month in Bengaluru',
];

export const AiChatView: React.FC<AiChatViewProps> = ({ onOpenDetail }) => {
  const { getToken, currency } = useAuth();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Ask me in plain language to find coaches, training grounds, upcoming trials, or scholarships matched to your age, city, and budget.',
    },
  ]);

  const sendQuery = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || sending) return;

    const userTurn: ChatTurn = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userTurn]);
    setInput('');
    setSending(true);

    try {
      const token = await getToken();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'AI query failed');
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: json.reply,
          results: json.results || [],
        },
      ]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text:
            err instanceof Error
              ? err.message
              : 'Could not process query. Please try again.',
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 flex flex-col min-h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
          AI Opportunity Scout
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Natural-language search powered by Gemini—converting your request into verified, scored opportunities.
        </p>
      </div>

      {/* Quick Prompt Chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {SAMPLE_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={sending}
            onClick={() => sendQuery(p)}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:border-blue-400 hover:text-blue-700 text-left transition-colors cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Conversation Feed */}
      <div className="flex-1 space-y-4 mb-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : msg.error
                  ? 'bg-rose-50 border border-rose-200 text-rose-800'
                  : 'bg-white border border-slate-200 text-slate-800'
              }`}
            >
              {msg.text}
            </div>

            {msg.results && msg.results.length > 0 && (
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {msg.results.map((entry) => {
                  const title = entry.item.title || entry.item.name || 'Listing';
                  const price =
                    entry.itemType === 'scholarship'
                      ? `Up to ${formatCurrency(entry.item.awardAmountInr ?? 0, currency)}`
                      : entry.itemType === 'coach' || entry.itemType === 'facility'
                      ? formatMonthlyPrice(entry.item.monthlyFeeInr ?? 0, currency)
                      : entry.item.entryFeeInr
                      ? formatCurrency(entry.item.entryFeeInr, currency)
                      : 'Free';
                  return (
                    <button
                      key={`${entry.itemType}-${entry.item.id}`}
                      type="button"
                      onClick={() => onOpenDetail(entry.itemType, entry.item.id)}
                      className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-400 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span className="capitalize font-semibold text-slate-700">
                          {entry.itemType} · {SPORT_LABELS[entry.item.sportSlug] || entry.item.sportSlug}
                        </span>
                        <span className="font-mono font-semibold text-blue-700 tabular-nums">
                          {entry.matchScore}% match
                        </span>
                      </div>
                      <div className="font-semibold text-sm text-slate-900 mb-1 flex items-center justify-between gap-2">
                        <span className="truncate">{title}</span>
                        <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {entry.item.city}
                        </span>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {price}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-500 max-w-xs animate-pulse">
            Parsing filters and scoring opportunities...
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendQuery(input);
        }}
        className="flex items-center gap-2 bg-white border border-slate-300 rounded-2xl p-1.5"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask e.g. Find affordable football coaching near me under ₹2,000/month..."
          className="flex-1 min-h-[44px] px-3 text-sm text-slate-900 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          aria-label="Send query"
          className="min-h-[44px] px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-1.5 text-sm font-medium cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Ask</span>
        </button>
      </form>
    </div>
  );
};
