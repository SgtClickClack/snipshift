/**
 * Pusher Service
 * 
 * Handles real-time messaging and events via Pusher Channels
 */

import Pusher from 'pusher';

let pusherInstance: Pusher | null = null;

/**
 * Initialize Pusher service
 */
export function initializePusher(): Pusher {
  if (pusherInstance) {
    return pusherInstance;
  }

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER || 'us2';

  if (!appId || !key || !secret) {
    console.warn('[PUSHER] Missing Pusher credentials. Real-time features will be disabled.');
    // Return a mock instance that does nothing
    pusherInstance = {
      trigger: async () => ({ status: 200 }),
      triggerBatch: async () => ({ status: 200 }),
    } as unknown as Pusher;
    return pusherInstance;
  }

  pusherInstance = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });

  console.log('[PUSHER] ✓ Pusher service initialized');
  return pusherInstance;
}

/**
 * Get the Pusher instance
 */
export function getPusher(): Pusher | null {
  if (!pusherInstance) {
    return initializePusher();
  }
  return pusherInstance;
}

/**
 * Trigger an event on a channel
 */
export async function triggerEvent(
  channel: string,
  event: string,
  data: any
): Promise<void> {
  const pusher = getPusher();
  if (!pusher) {
    console.warn('[PUSHER] Cannot trigger event: Pusher not initialized');
    return;
  }

  try {
    await pusher.trigger(channel, event, data);
  } catch (error: any) {
    console.error('[PUSHER] Error triggering event:', error);
    throw error;
  }
}

/**
 * Trigger an event to a user's private channel
 */
export async function triggerUserEvent(
  userId: string,
  event: string,
  data: any
): Promise<void> {
  await triggerEvent(`private-user-${userId}`, event, data);
}

/**
 * Trigger an event to a conversation channel
 */
export async function triggerConversationEvent(
  conversationId: string,
  event: string,
  data: any
): Promise<void> {
  await triggerEvent(`private-conversation-${conversationId}`, event, data);
}

/**
 * Trigger shift status update event
 */
export async function triggerShiftStatusUpdate(
  userId: string,
  statusData: any
): Promise<void> {
  await triggerUserEvent(userId, 'SHIFT_STATUS_UPDATE', statusData);
}

/**
 * Trigger shift invite event
 */
export async function triggerShiftInvite(
  userId: string,
  inviteData: {
    shiftId: string;
    shiftTitle: string;
    venueName: string;
    venueId: string;
  }
): Promise<void> {
  await triggerUserEvent(userId, 'SHIFT_INVITE', inviteData);
}
