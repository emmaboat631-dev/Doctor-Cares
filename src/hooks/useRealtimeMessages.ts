import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types';

/**
 * Subscribe to new INSERTs on the messages table for a specific conversation.
 * Fires `onMessage(msg)` for every row that lands. Unsubscribes on unmount or
 * when the conversation id changes.
 */
export function useRealtimeMessages(
  conversationId: string | null | undefined,
  onMessage: (msg: Message) => void,
) {
  useEffect(() => {
    const sb = supabase;
    if (!sb || !conversationId) return;
    const channel = sb
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onMessage(payload.new as Message);
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);
}
