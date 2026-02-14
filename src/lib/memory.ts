/**
 * Jarvis Memory System
 * JSON file-based persistence, adapted from Angelina
 */

import fs from 'fs';
import path from 'path';

export interface MemoryEntry {
  id: string;
  topic: string;
  content: string;
  timestamp: string;
  type: 'conversation' | 'fact' | 'preference' | 'task' | 'decision' | 'routine';
  tags: string[];
  importance: 'low' | 'medium' | 'high';
}

const MEMORY_FILE = path.join(process.cwd(), 'memory-data.json');
const TASKS_FILE = path.join(process.cwd(), 'tasks-data.json');

function readJSON<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJSON(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

class MemoryStore {
  private entries: MemoryEntry[] = [];
  private loaded = false;
  private maxEntries = 500;

  private ensureLoaded() {
    if (!this.loaded) {
      this.entries = readJSON<MemoryEntry[]>(MEMORY_FILE, []);
      this.loaded = true;
    }
  }

  add(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): MemoryEntry {
    this.ensureLoaded();
    const newEntry: MemoryEntry = {
      ...entry,
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    this.entries.unshift(newEntry);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }
    writeJSON(MEMORY_FILE, this.entries);
    return newEntry;
  }

  search(query: string): MemoryEntry[] {
    this.ensureLoaded();
    const q = query.toLowerCase();
    return this.entries.filter(e =>
      e.content.toLowerCase().includes(q) ||
      e.topic.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  getByType(type: MemoryEntry['type']): MemoryEntry[] {
    this.ensureLoaded();
    return this.entries.filter(e => e.type === type);
  }

  getRecent(count = 10): MemoryEntry[] {
    this.ensureLoaded();
    return this.entries.slice(0, count);
  }

  getAll(): MemoryEntry[] {
    this.ensureLoaded();
    return this.entries;
  }

  getMemoryContext(query?: string): string {
    const all = this.getAll();
    if (all.length === 0) return '';

    if (query) {
      const scored = this.scoreMemories(all, query);
      const top = scored.length > 0 ? scored.slice(0, 5) : all.filter(e => e.importance === 'high').slice(0, 3).map(e => ({ entry: e, score: 1 }));
      if (top.length === 0) return '';
      const lines = ['\n--- JARVIS MEMORY ---'];
      top.forEach(({ entry }) => lines.push(`- [${entry.type}] ${entry.topic}: ${entry.content}`));
      lines.push('--- END MEMORY ---');
      return lines.join('\n');
    }

    const sections: string[] = ['\n--- JARVIS MEMORY ---'];
    const types: MemoryEntry['type'][] = ['routine', 'preference', 'task', 'fact', 'decision'];
    for (const type of types) {
      const items = all.filter(e => e.type === type);
      if (items.length > 0) {
        sections.push(`\n${type.charAt(0).toUpperCase() + type.slice(1)}s:`);
        items.slice(0, 5).forEach(e => sections.push(`- ${e.topic}: ${e.content}`));
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
        for (const w of words) { if (text.includes(w)) score += 2; }
        if (entry.importance === 'high') score += 2;
        else if (entry.importance === 'medium') score += 1;
        const age = (Date.now() - new Date(entry.timestamp).getTime()) / 86400000;
        if (age < 1) score += 2;
        else if (age < 7) score += 1;
        return { entry, score };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);
  }
}

// Task store
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
    const task = this.tasks.find(t => t.id === idOrTitle || t.title.toLowerCase().includes(idOrTitle.toLowerCase()));
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

export const memory = new MemoryStore();
export const tasks = new TaskStore();
