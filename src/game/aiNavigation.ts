import type { Rect, Vec2 } from './types';
import { expandedRect, segmentRect } from './geometry';

export function findPath(
    from: Vec2, to: Vec2, islands: Rect[],
    radius: number, clearance: number,
    arena: { width: number; height: number },
): Vec2[] {
    const obstacles = islands.map((rect) => expandedRect(rect, radius + clearance));
    const inside = (point: Vec2, rect: Rect) => point.x >= rect.x && point.y >= rect.y &&
        point.x <= rect.x + rect.width && point.y <= rect.y + rect.height;
    function outsideClearance(point: Vec2): Vec2 {
        const obstacle = obstacles.find((rect) => inside(point, rect));
        if (!obstacle) return { ...point };
        const candidates = [
            { x: obstacle.x - 1, y: point.y },
            { x: obstacle.x + obstacle.width + 1, y: point.y },
            { x: point.x, y: obstacle.y - 1 },
            { x: point.x, y: obstacle.y + obstacle.height + 1 },
        ].filter((candidate) => candidate.x >= radius && candidate.y >= radius &&
            candidate.x <= arena.width - radius && candidate.y <= arena.height - radius &&
            !obstacles.some((rect) => inside(candidate, rect)));
        candidates.sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) -
            Math.hypot(b.x - point.x, b.y - point.y));
        return candidates[0] ?? { ...point };
    }
    const start = outsideClearance(from), goal = outsideClearance(to);
    const nodes: Vec2[] = [start, goal];
    for (const rect of obstacles) {
        for (const x of [rect.x - 1, rect.x + rect.width + 1]) {
            for (const y of [rect.y - 1, rect.y + rect.height + 1]) {
                if (x >= radius && y >= radius &&
                    x <= arena.width - radius && y <= arena.height - radius) nodes.push({ x, y });
            }
        }
    }
    const distance = nodes.map(() => Infinity);
    const previous = nodes.map(() => -1);
    const visited = new Set<number>();
    distance[0] = 0;
    for (let count = 0; count < nodes.length; count += 1) {
        let current = -1;
        for (let index = 0; index < nodes.length; index += 1) {
            if (!visited.has(index) && Number.isFinite(distance[index]) &&
                (current === -1 || distance[index] < distance[current])) current = index;
        }
        if (current === -1 || current === 1) break;
        visited.add(current);
        for (let next = 0; next < nodes.length; next += 1) {
            if (visited.has(next) || current === next) continue;
            if (obstacles.some((rect) => segmentRect(nodes[current], nodes[next], rect) !== null)) continue;
            const candidate = distance[current] +
                Math.hypot(nodes[next].x - nodes[current].x, nodes[next].y - nodes[current].y);
            if (candidate < distance[next]) { distance[next] = candidate; previous[next] = current; }
        }
    }
    if (!Number.isFinite(distance[1])) return [];
    const path: Vec2[] = [];
    for (let index = 1; index !== 0; index = previous[index]) path.unshift({ ...nodes[index] });
    if (start.x !== from.x || start.y !== from.y) path.unshift(start);
    return path;
}