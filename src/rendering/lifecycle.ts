export interface ManagedRuntime {
  start(): void;
  destroy(): void;
}

export function mountAsyncRuntime(
  create: () => Promise<ManagedRuntime>,
  onError: (error: unknown) => void,
): () => void {
  let cancelled = false;
  let runtime: ManagedRuntime | undefined;
  void create().then((created) => {
    if (cancelled) {
      created.destroy();
      return;
    }
    runtime = created;
    created.start();
  }).catch((error: unknown) => {
    runtime?.destroy();
    if (!cancelled) onError(error);
  });
  return () => {
    if (cancelled) return;
    cancelled = true;
    runtime?.destroy();
  };
}