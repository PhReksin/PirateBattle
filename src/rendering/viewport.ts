export function fitArena(width: number, height: number, worldWidth: number, worldHeight: number) {
  const scale = Math.min(width / worldWidth, height / worldHeight);
  return {
    scale,
    x: (width - worldWidth * scale) / 2,
    y: (height - worldHeight * scale) / 2,
  };
}

export function clientToWorld(
  clientX: number, clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  screen: { width: number; height: number },
  transform: ReturnType<typeof fitArena>,
) {
  if (rect.width <= 0 || rect.height <= 0 || transform.scale <= 0) return null;
  const x = (clientX - rect.left) * screen.width / rect.width;
  const y = (clientY - rect.top) * screen.height / rect.height;
  return {
    x: (x - transform.x) / transform.scale,
    y: (y - transform.y) / transform.scale,
  };
}