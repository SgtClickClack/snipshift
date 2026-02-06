# Offline Mutation Queue Implementation Specification

**Priority:** Phase 3 - Medium Priority  
**Security Impact:** Prevents double-booking race conditions when network is unstable  
**Estimated Complexity:** 3-5 days implementation + testing

---

## Problem Statement

The PWA's service worker caches API responses for up to 5 minutes (reduced from 24h in security hardening). When users go offline and come back online, they may attempt to accept shifts that were already accepted by other users during the offline period. This creates a TOCTOU race condition amplified by stale cached data.

### Current Risk
- User goes offline → sees cached (stale) shift list showing Shift #42 as available
- User comes back online → taps "Accept" → API call succeeds
- BUT: Another user already accepted Shift #42 while first user was offline
- Result: First user gets 409 error, poor UX, potential double-booking if validation fails

---

## Solution Architecture

### 1. IndexedDB Schema

```typescript
// Database: HospoGoOfflineQueue
// Version: 1

interface QueuedMutation {
  id: string; // UUID v4
  type: 'shift_accept' | 'shift_decline' | 'application_submit';
  endpoint: string; // e.g., '/api/shifts/:id/accept'
  method: 'POST' | 'PUT' | 'DELETE';
  params: Record<string, any>; // JSON-serializable
  body: Record<string, any>; // JSON-serializable
  createdAt: number; // timestamp
  attempts: number; // retry count
  status: 'pending' | 'processing' | 'failed' | 'conflict';
  conflictReason?: string; // e.g., "Shift already accepted"
  lastAttemptAt?: number;
}

// ObjectStore: mutations
// Indexes:
//   - type (for deduplication)
//   - status (for filtering pending)
//   - createdAt (for FIFO processing)
```

### 2. Deduplication Strategy

Before adding a mutation to the queue, check for duplicates:

```typescript
function isDuplicate(newMutation: QueuedMutation): Promise<boolean> {
  // Query: same type + same params
  // Example: Two "shift_accept" mutations for the same shift ID
  const existing = await db.mutations
    .where('type').equals(newMutation.type)
    .and(m => JSON.stringify(m.params) === JSON.stringify(newMutation.params))
    .and(m => m.status === 'pending')
    .first();
  
  return !!existing;
}
```

### 3. Conflict Detection

When replaying a queued mutation:

```typescript
async function processQueuedMutation(mutation: QueuedMutation) {
  try {
    const response = await apiRequest(mutation.method, mutation.endpoint, mutation.body);
    
    // Success: Remove from queue
    await db.mutations.delete(mutation.id);
    return { success: true };
    
  } catch (error: any) {
    if (error.status === 409) {
      // Conflict: Shift already accepted by another user
      await db.mutations.update(mutation.id, {
        status: 'conflict',
        conflictReason: error.message,
        lastAttemptAt: Date.now(),
      });
      
      // Show user-friendly notification
      toast({
        title: 'Shift No Longer Available',
        description: 'This shift was accepted by another user while you were offline.',
        variant: 'destructive',
      });
      
      return { success: false, conflict: true };
    }
    
    if (error.status >= 500) {
      // Server error: Retry with exponential backoff
      mutation.attempts++;
      mutation.lastAttemptAt = Date.now();
      
      if (mutation.attempts >= 3) {
        mutation.status = 'failed';
      }
      
      await db.mutations.update(mutation.id, mutation);
      return { success: false, retry: mutation.attempts < 3 };
    }
    
    // Client error (400, 403, 404): Mark as failed
    await db.mutations.update(mutation.id, {
      status: 'failed',
      conflictReason: error.message,
    });
    
    return { success: false };
  }
}
```

### 4. Queue Processing Trigger

Process queue when:
1. Network comes back online (window.addEventListener('online'))
2. App gains focus (document.addEventListener('visibilitychange'))
3. User manually triggers sync (button in UI)

```typescript
let isProcessing = false;

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;
  
  try {
    const pending = await db.mutations
      .where('status').equals('pending')
      .sortBy('createdAt'); // FIFO
    
    for (const mutation of pending) {
      await processQueuedMutation(mutation);
      
      // Add delay between mutations to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } finally {
    isProcessing = false;
  }
}

// Auto-process on reconnection
window.addEventListener('online', () => {
  processQueue();
});

// Auto-process when app gains focus
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && navigator.onLine) {
    processQueue();
  }
});
```

### 5. UI Integration

Add visual indicators for queued mutations:

```typescript
// Show pending count in header/navbar
const { data: queueCount } = useQuery({
  queryKey: ['offlineQueueCount'],
  queryFn: async () => {
    const count = await db.mutations.where('status').equals('pending').count();
    return count;
  },
  refetchInterval: 5000, // Check every 5s
});

// Show banner when mutations are queued
{queueCount > 0 && (
  <div className="bg-amber-500/10 border-l-4 border-amber-500 p-4">
    <div className="flex items-center gap-2">
      <CloudUpload className="h-4 w-4 animate-pulse" />
      <p className="text-sm">
        {queueCount} action{queueCount !== 1 ? 's' : ''} queued for sync when online
      </p>
      <Button size="sm" onClick={processQueue}>
        Sync Now
      </Button>
    </div>
  </div>
)}
```

---

## Implementation Steps

### Phase 1: IndexedDB Setup (1 day)
1. Create `src/lib/offlineQueue.ts` with Dexie.js
2. Define schema and indexes
3. Add initialization in `src/App.tsx`
4. Write unit tests for CRUD operations

### Phase 2: Queue Manager (2 days)
1. Implement `enqueueMutation()`
2. Implement `processQueuedMutation()` with retry logic
3. Implement `processQueue()` orchestrator
4. Add conflict detection handlers
5. Write integration tests

### Phase 3: Network Detection & Auto-Sync (1 day)
1. Add online/offline event listeners
2. Add visibility change detection
3. Test reconnection scenarios
4. Add exponential backoff for retries

### Phase 4: UI Integration (1 day)
1. Add queue count hook
2. Add offline banner component
3. Add manual sync button
4. Add conflict notification toasts
5. Update shift acceptance flow to use queue when offline

### Phase 5: Testing & Edge Cases (1 day)
1. E2E test: Go offline → accept shift → come online → verify conflict detection
2. E2E test: Queue multiple mutations → verify FIFO processing
3. E2E test: Server error → verify retry with exponential backoff
4. Performance test: 100+ queued mutations → verify no UI freeze
5. Security test: Verify queue is cleared on logout

---

## Security Considerations

1. **Authentication Tokens**
   - DO NOT store Firebase tokens in IndexedDB (they expire)
   - Re-authenticate before processing queue if token expired
   - Clear queue on explicit logout

2. **Sensitive Data**
   - Do NOT queue mutations containing PII (medical certificates, etc.)
   - Only queue shift IDs, application IDs (non-sensitive identifiers)

3. **Rate Limiting**
   - Add 500ms delay between queue processing to avoid API rate limits
   - Implement exponential backoff on server errors

4. **Data Integrity**
   - Validate mutation params before adding to queue (Zod schemas)
   - Reject malformed mutations early

---

## Rollout Strategy

1. **Phase 1 Rollout (Week 1)**: Ship queue infrastructure (no UI changes)
   - Users won't see any difference
   - Queue is built but not actively used
   - Monitor for IndexedDB compatibility issues

2. **Phase 2 Rollout (Week 2)**: Enable for shift acceptance only
   - Only `shift_accept` mutations use queue
   - Monitor conflict detection rate
   - Gather user feedback on offline UX

3. **Phase 3 Rollout (Week 3)**: Enable for all mutations
   - `application_submit`, `shift_decline` added
   - Full offline-first experience
   - Marketing: "Work anywhere, even underground"

---

## Success Metrics

- **Conflict Detection Rate**: % of queued mutations that detect conflicts (target: >95%)
- **Successful Replay Rate**: % of queued mutations that succeed on replay (target: >80%)
- **User-Reported "Shift Gone" Errors**: Reduction of 70%+ vs current baseline
- **Offline Usage**: % of shift acceptances that happen while offline (baseline metric)

---

## Dependencies

- **Dexie.js** (v3.x): Wrapper for IndexedDB with better TypeScript support
- **TanStack Query**: Already in use, will integrate with offline queue
- **Network Detection API**: `navigator.onLine`, `online`/`offline` events (native)

---

## Alternatives Considered

1. **Use TanStack Query's built-in mutation queue**
   - Pros: No additional dependencies
   - Cons: No persistence across page reloads/app restarts
   - Decision: REJECTED (need persistence)

2. **Use Service Worker for queue management**
   - Pros: Runs in background, no UI thread blocking
   - Cons: Complex message passing, harder debugging
   - Decision: REJECTED (IndexedDB + foreground is simpler)

3. **Use localStorage instead of IndexedDB**
   - Pros: Simpler API
   - Cons: 5-10MB limit, synchronous (blocks UI), no indexes
   - Decision: REJECTED (need >10MB capacity for large queues)

---

## Open Questions

1. **Queue Size Limit**: What's the maximum number of mutations we allow in queue?
   - Proposal: 1000 mutations max, auto-prune oldest after 7 days

2. **Multi-Tab Sync**: What if user has 2 tabs open and both try to process queue?
   - Proposal: Use BroadcastChannel API for tab coordination

3. **Manual Conflict Resolution**: Should we allow users to manually resolve conflicts?
   - Proposal: Phase 2 feature - show "conflict queue" in settings

---

## Conclusion

This is a **non-trivial feature** requiring careful architecture. The security benefit is **preventing double-booking via stale cached data**. The UX benefit is **graceful offline handling**.

**Recommendation**: Implement in Sprint 4 (after current security hardening sprint). Prioritize Phase 1 critical fixes first.
