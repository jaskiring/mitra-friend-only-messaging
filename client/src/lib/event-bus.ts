type Handler = () => void;

const handlers = new Map<string, Set<Handler>>();

export const events = {
  on(name: string, handler: Handler): () => void {
    if (!handlers.has(name)) handlers.set(name, new Set());
    handlers.get(name)!.add(handler);
    return () => handlers.get(name)?.delete(handler);
  },
  emit(name: string): void {
    handlers.get(name)?.forEach((h) => h());
  },
};

export const EVT_FRIEND_REQUEST_RECEIVED = "friend-request-received";
export const EVT_FRIEND_REQUEST_RESOLVED = "friend-request-resolved";
