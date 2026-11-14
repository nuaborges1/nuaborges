import React from 'react';
import { Search, Plus } from 'lucide-react';
import { ConversationMeta } from '@/lib/nuaAi/types';

interface AiHistoryListProps {
  conversations: ConversationMeta[];
  searchFilter: string;
  onSearchChange: (val: string) => void;
  activeConversationId: string;
  onSelectConversation: (conv: ConversationMeta) => void;
  onStartNewConversation: () => void;
}

export function AiHistoryList({
  conversations,
  searchFilter,
  onSearchChange,
  activeConversationId,
  onSelectConversation,
  onStartNewConversation,
}: AiHistoryListProps) {
  const filteredConversations = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.summary.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col p-4 overflow-hidden">
      <div className="relative mb-3">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Pesquisar conversas passadas..."
          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar overscroll-contain">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs">
            Nenhuma conversa encontrada.
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => onSelectConversation(conv)}
              className={`w-full text-left p-3 rounded-lg border transition cursor-pointer ${
                conv.id === activeConversationId
                  ? 'bg-[#f4a7b9]/10 border-[#f4a7b9]/40 text-white'
                  : 'bg-[#101116] border-white/[0.06] hover:bg-white/[0.04] text-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white truncate max-w-[240px]">
                  {conv.title}
                </span>
                <span className="text-[10px] text-zinc-500 shrink-0 font-mono">
                  {new Date(conv.updatedAt || conv.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                {conv.summary}
              </p>
            </button>
          ))
        )}
      </div>

      <div className="pt-3 border-t border-white/[0.06] mt-2">
        <button
          type="button"
          onClick={onStartNewConversation}
          className="w-full h-8 px-4 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Iniciar Nova Conversa</span>
        </button>
      </div>
    </div>
  );
}
