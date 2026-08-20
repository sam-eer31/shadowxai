import { Conversation } from '@/lib/types';

export function groupConversations(conversations: Conversation[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const last7Days = new Date(today);
  last7Days.setDate(last7Days.getDate() - 7);

  const last30Days = new Date(today);
  last30Days.setDate(last30Days.getDate() - 30);

  const groups: Record<string, Conversation[]> = {
    Today: [],
    Yesterday: [],
    'Previous 7 Days': [],
    'Previous 30 Days': [],
    Older: [],
  };

  conversations.forEach((conv) => {
    const d = new Date(conv.createdAt || Date.now());
    if (d >= today) groups['Today'].push(conv);
    else if (d >= yesterday) groups['Yesterday'].push(conv);
    else if (d >= last7Days) groups['Previous 7 Days'].push(conv);
    else if (d >= last30Days) groups['Previous 30 Days'].push(conv);
    else groups['Older'].push(conv);
  });

  return groups;
}
