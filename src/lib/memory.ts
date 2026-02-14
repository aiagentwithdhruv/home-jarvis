/**
 * Jarvis Memory System — 3-Tier Architecture
 *
 * SHORT-TERM: Current session buffer (last 20 exchanges, auto-clears on disconnect)
 * LONG-TERM:  Persistent facts, preferences, routines, decisions (JSON file)
 * WORKING:    Compiled context injected into each AI call (auto-ranked)
 */

import fs from 'fs';
import path from 'path';

// ─── Types ───

export type MemoryTier = 'short_term' | 'long_term';
export type MemoryType = 'fact' | 'preference' | 'routine' | 'decision' | 'person' | 'conversation';

export interface MemoryEntry {
  id: string;
  topic: string;
  content: string;
  timestamp: string;
  type: MemoryType;
  tier: MemoryTier;
  tags: string[];
  importance: 'low' | 'medium' | 'high';
  accessCount: number;
  lastAccessed: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── File I/O ───

const MEMORY_FILE = path.join(process.cwd(), 'memory-data.json');
const TASKS_FILE = path.join(process.cwd(), 'tasks-data.json');

function readJSON<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch { return fallback; }
}

function writeJSON(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Memory Store (3-Tier) ───

class MemoryStore {
  private entries: MemoryEntry[] = [];
  private shortTerm: MemoryEntry[] = []; // Session buffer (not persisted)
  private loaded = false;
  private maxLongTerm = 500;
  private maxShortTerm = 20;

  private ensureLoaded() {
    if (!this.loaded) {
      this.entries = readJSON<MemoryEntry[]>(MEMORY_FILE, []);
      this.loaded = true;
    }
  }

  /**
   * Save to memory. Auto-assigns tier:
   * - conversation → short_term (session only)
   * - fact, preference, routine, decision, person → long_term (persisted)
   */
  add(entry: { topic: string; content: string; type?: MemoryType; importance?: 'low' | 'medium' | 'high'; tags?: string[] }): MemoryEntry {
    this.ensureLoaded();

    const type = entry.type || 'fact';
    const tier: MemoryTier = type === 'conversation' ? 'short_term' : 'long_term';

    const newEntry: MemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      topic: entry.topic,
      content: entry.content,
      timestamp: new Date().toISOString(),
      type,
      tier,
      tags: entry.tags || [],
      importance: entry.importance || 'medium',
      accessCount: 0,
      lastAccessed: new Date().toISOString(),
    };

    if (tier === 'short_term') {
      this.shortTerm.unshift(newEntry);
      if (this.shortTerm.length > this.maxShortTerm) {
        // Promote important short-term to long-term before discarding
        const overflow = this.shortTerm.splice(this.maxShortTerm);
        for (const item of overflow) {
          if (item.importance === 'high') {
            item.tier = 'long_term';
            item.type = 'fact';
            this.entries.unshift(item);
          }
        }
      }
    } else {
      // Check for duplicates (same topic + similar content)
      const existing = this.entries.find(e =>
        e.topic.toLowerCase() === newEntry.topic.toLowerCase() &&
        e.type === newEntry.type
      );
      if (existing) {
        // Update existing instead of duplicating
        existing.content = newEntry.content;
        existing.timestamp = newEntry.timestamp;
        existing.importance = newEntry.importance;
        existing.accessCount++;
        existing.lastAccessed = newEntry.timestamp;
      } else {
        this.entries.unshift(newEntry);
      }

      if (this.entries.length > this.maxLongTerm) {
        this.entries = this.entries.slice(0, this.maxLongTerm);
      }
      writeJSON(MEMORY_FILE, this.entries);
    }

    return newEntry;
  }

  /**
   * Search across both tiers. Marks accessed entries for relevance tracking.
   */
  search(query: string, type?: MemoryType): MemoryEntry[] {
    this.ensureLoaded();
    const q = query.toLowerCase();

    const allEntries = [...this.shortTerm, ...this.entries];
    const results = allEntries.filter(e => {
      const matchesQuery = e.content.toLowerCase().includes(q) ||
        e.topic.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q));
      const matchesType = !type || e.type === type;
      return matchesQuery && matchesType;
    });

    // Track access
    for (const r of results) {
      if (r.tier === 'long_term') {
        r.accessCount++;
        r.lastAccessed = new Date().toISOString();
      }
    }
    if (results.some(r => r.tier === 'long_term')) {
      writeJSON(MEMORY_FILE, this.entries);
    }

    return results;
  }

  getByType(type: MemoryType): MemoryEntry[] {
    this.ensureLoaded();
    return [...this.shortTerm, ...this.entries].filter(e => e.type === type);
  }

  getRecent(count = 10): MemoryEntry[] {
    this.ensureLoaded();
    return [...this.shortTerm, ...this.entries].slice(0, count);
  }

  getAll(): MemoryEntry[] {
    this.ensureLoaded();
    return this.entries;
  }

  /** Clear short-term session buffer (call on disconnect) */
  clearSession(): void {
    this.shortTerm = [];
  }

  /**
   * Build WORKING MEMORY — the context injected into each AI call.
   * Ranks by: importance > recency > access frequency > query relevance
   */
  getMemoryContext(query?: string): string {
    this.ensureLoaded();

    const longTerm = this.entries;
    const shortTerm = this.shortTerm;

    if (longTerm.length === 0 && shortTerm.length === 0) return '';

    const sections: string[] = ['\n--- JARVIS MEMORY ---'];

    // 1. Short-term: Recent conversation context
    if (shortTerm.length > 0) {
      sections.push('\n[Session Context]');
      shortTerm.slice(0, 5).forEach(e =>
        sections.push(`- ${e.topic}: ${e.content}`)
      );
    }

    // 2. Long-term: Ranked by type importance
    if (query) {
      // Query-specific: score and rank
      const scored = this.scoreMemories(longTerm, query);
      if (scored.length > 0) {
        sections.push('\n[Relevant Memory]');
        scored.slice(0, 8).forEach(({ entry }) =>
          sections.push(`- [${entry.type}] ${entry.topic}: ${entry.content}`)
        );
      }
    } else {
      // General context: organized by type
      const typeOrder: { type: MemoryType; label: string; limit: number }[] = [
        { type: 'person', label: 'People', limit: 5 },
        { type: 'preference', label: 'Preferences', limit: 5 },
        { type: 'routine', label: 'Routines', limit: 5 },
        { type: 'decision', label: 'Decisions', limit: 3 },
        { type: 'fact', label: 'Facts', limit: 5 },
      ];

      for (const { type, label, limit } of typeOrder) {
        const items = longTerm.filter(e => e.type === type);
        if (items.length > 0) {
          sections.push(`\n[${label}]`);
          // Sort by importance then recency
          items
            .sort((a, b) => {
              const impOrder = { high: 3, medium: 2, low: 1 };
              const impDiff = impOrder[b.importance] - impOrder[a.importance];
              if (impDiff !== 0) return impDiff;
              return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            })
            .slice(0, limit)
            .forEach(e => sections.push(`- ${e.topic}: ${e.content}`));
        }
      }
    }

    sections.push('\n--- END MEMORY ---');
    return sections.join('\n');
  }

  private scoreMemories(entries: MemoryEntry[], query: string) {
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    if (words.length === 0) return [];

    return entries
      .map(entry => {
        let score = 0;
        const text = `${entry.topic} ${entry.content} ${entry.tags.join(' ')}`.toLowerCase();

        // Word match
        for (const w of words) { if (text.includes(w)) score += 2; }

        // Importance boost
        if (entry.importance === 'high') score += 3;
        else if (entry.importance === 'medium') score += 1;

        // Recency boost (decay over days)
        const ageDays = (Date.now() - new Date(entry.timestamp).getTime()) / 86400000;
        if (ageDays < 1) score += 3;
        else if (ageDays < 7) score += 2;
        else if (ageDays < 30) score += 1;

        // Frequency boost (accessed often = important)
        if (entry.accessCount > 5) score += 2;
        else if (entry.accessCount > 2) score += 1;

        // Type boost (people and preferences are usually more relevant)
        if (entry.type === 'person') score += 1;
        if (entry.type === 'preference') score += 1;

        return { entry, score };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);
  }
}

// ─── Task Store ───

class TaskStore {
  private tasks: Task[] = [];
  private loaded = false;

  private ensureLoaded() {
    if (!this.loaded) {
      this.tasks = readJSON<Task[]>(TASKS_FILE, []);
      this.loaded = true;
    }
  }

  create(title: string, description?: string, priority: Task['priority'] = 'medium', dueDate?: string): Task {
    this.ensureLoaded();
    const task: Task = {
      id: `task_${Date.now()}`,
      title,
      description,
      status: 'pending',
      priority,
      dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.unshift(task);
    writeJSON(TASKS_FILE, this.tasks);
    return task;
  }

  update(idOrTitle: string, updates: Partial<Pick<Task, 'status' | 'title' | 'description' | 'priority' | 'dueDate'>>): Task | null {
    this.ensureLoaded();
    const task = this.tasks.find(t =>
      t.id === idOrTitle || t.title.toLowerCase().includes(idOrTitle.toLowerCase())
    );
    if (!task) return null;
    Object.assign(task, updates, { updatedAt: new Date().toISOString() });
    writeJSON(TASKS_FILE, this.tasks);
    return task;
  }

  list(status?: Task['status']): Task[] {
    this.ensureLoaded();
    if (status) return this.tasks.filter(t => t.status === status);
    return this.tasks.filter(t => t.status !== 'completed');
  }

  getAll(): Task[] {
    this.ensureLoaded();
    return this.tasks;
  }
}

// ─── Exports ───

export const memory = new MemoryStore();
export const tasks = new TaskStore();
