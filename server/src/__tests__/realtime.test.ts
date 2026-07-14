import { describe, it, expect } from 'vitest';
import { Rooms } from '../realtime.js';

describe('Rooms', () => {
  it('broadcastet an alle im selben Raum, nicht an andere', () => {
    const rooms = new Rooms();
    const a: string[] = []; const b: string[] = []; const other: string[] = [];
    rooms.join('g1', (d) => a.push(d));
    rooms.join('g1', (d) => b.push(d));
    rooms.join('g2', (d) => other.push(d));
    rooms.broadcast('g1', 'hello');
    expect(a).toEqual(['hello']);
    expect(b).toEqual(['hello']);
    expect(other).toEqual([]);
  });
  it('leave entfernt den Client', () => {
    const rooms = new Rooms();
    const a: string[] = [];
    const leave = rooms.join('g1', (d) => a.push(d));
    leave();
    rooms.broadcast('g1', 'x');
    expect(a).toEqual([]);
  });
});
