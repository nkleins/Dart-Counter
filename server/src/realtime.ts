type Sender = (data: string) => void;

export class Rooms {
  private rooms = new Map<string, Set<Sender>>();

  join(slug: string, send: Sender): () => void {
    let set = this.rooms.get(slug);
    if (!set) { set = new Set(); this.rooms.set(slug, set); }
    set.add(send);
    return () => {
      const s = this.rooms.get(slug);
      if (!s) return;
      s.delete(send);
      if (s.size === 0) this.rooms.delete(slug);
    };
  }

  broadcast(slug: string, data: string): void {
    const set = this.rooms.get(slug);
    if (!set) return;
    for (const send of set) send(data);
  }
}
