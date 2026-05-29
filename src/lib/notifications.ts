import { supabase as _supabase } from '@/lib/supabase';

const db = _supabase as any;

export function buildMessage(type: string, actorName: string, count: number, referenceType?: string | null): string {
  const others = count - 1;
  const subject = others === 0 ? actorName : others === 1 ? `${actorName} and 1 other` : `${actorName} and ${others} others`;
  switch (type) {
    case 'like': return `${subject} liked your ${referenceType === 'moment' ? 'moment' : 'post'}`;
    case 'comment': return `${subject} commented on your ${referenceType === 'moment' ? 'moment' : 'post'}`;
    case 'reply': return `${subject} replied to your comment`;
    default: return `${subject} interacted with your content`;
  }
}

export interface NotificationParams {
  user_id: string;
  actor_id: string;
  actor_name: string;
  actor_username: string;
  actor_image: string | null;
  type: string;
  reference_id: string;
  reference_type: string;
  reference_event_id?: string | null;
}

export async function createNotification(params: NotificationParams): Promise<void> {
  if (!params.user_id || params.actor_id === params.user_id) return;
  const { actor_name } = params;

  if (params.type === 'like') {
    const { data: dup } = await db.from('notifications').select('id')
      .eq('user_id', params.user_id).eq('type', 'like')
      .eq('reference_id', params.reference_id).eq('actor_id', params.actor_id)
      .eq('is_read', false).maybeSingle();
    if (dup) return;

    const { data: existing } = await db.from('notifications').select('id, actor_count')
      .eq('user_id', params.user_id).eq('type', 'like')
      .eq('reference_id', params.reference_id).eq('is_read', false).maybeSingle();
    if (existing) {
      const newCount = (existing.actor_count ?? 1) + 1;
      await db.from('notifications').update({
        actor_id: params.actor_id, actor_name, actor_username: params.actor_username,
        actor_image: params.actor_image, actor_count: newCount,
        message: buildMessage('like', actor_name, newCount, params.reference_type),
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
      return;
    }
  }

  await db.from('notifications').insert({
    user_id: params.user_id,
    actor_id: params.actor_id,
    actor_name,
    actor_username: params.actor_username,
    actor_image: params.actor_image ?? null,
    type: params.type,
    reference_id: params.reference_id,
    reference_type: params.reference_type,
    reference_event_id: params.reference_event_id ?? null,
    actor_count: 1,
    message: buildMessage(params.type, actor_name, 1, params.reference_type),
    is_read: false,
  });
}
