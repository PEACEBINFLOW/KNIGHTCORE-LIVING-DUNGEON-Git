// src/core/graph.js
//
// Adjacency and BFS shortest paths for the dungeon's room graph.

/**
 * Build an adjacency list from rooms + undirected path pairs.
 * @param {Array<{ id: string }>} rooms
 * @param {Array<[string, string]>} paths
 * @returns {Map<string, string[]>}
 */
export function buildGraph(rooms, paths) {
  const adj = new Map();
  for (const r of rooms) adj.set(r.id, []);
  for (const [a, b] of paths) {
    if (!adj.has(a) || !adj.has(b)) continue;
    adj.get(a).push(b);
    adj.get(b).push(a);
  }
  return adj;
}

/**
 * BFS shortest path (unweighted) from `from` to `to`.
 * @param {Map<string, string[]>} adj
 * @param {string} from
 * @param {string} to
 * @returns {string[] | null} list of room IDs including both ends, or null if unreachable
 */
export function bfsPath(adj, from, to) {
  if (from === to) return [from];
  if (!adj.has(from) || !adj.has(to)) return null;

  const parent = new Map();
  const visited = new Set([from]);
  const queue = [from];

  while (queue.length > 0) {
    const cur = queue.shift();
    for (const nb of adj.get(cur)) {
      if (visited.has(nb)) continue;
      visited.add(nb);
      parent.set(nb, cur);
      if (nb === to) {
        const path = [to];
        let n = to;
        while (n !== from) {
          n = parent.get(n);
          path.push(n);
        }
        return path.reverse();
      }
      queue.push(nb);
    }
  }
  return null;
}
