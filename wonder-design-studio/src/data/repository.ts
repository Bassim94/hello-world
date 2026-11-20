import type { Project } from '../domain/types';

/**
 * Persistence boundary for customer projects.
 * The API is async on purpose: the MVP uses localStorage, but the same
 * interface can be implemented later against a REST API or database
 * without touching the UI or the store.
 */
export interface ProjectRepository {
  list(): Promise<Project[]>;
  save(project: Project): Promise<void>;
  remove(id: string): Promise<void>;
}

const KEY = 'wonder.projects.v1';

export class LocalStorageProjectRepository implements ProjectRepository {
  private read(): Project[] {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Project[]) : [];
    } catch (err) {
      console.error('Wonder: could not read saved projects', err);
      return [];
    }
  }

  private write(projects: Project[]) {
    // Let quota / privacy-mode errors propagate so the UI can report them.
    localStorage.setItem(KEY, JSON.stringify(projects));
  }

  async list() {
    return this.read();
  }

  async save(project: Project) {
    const all = this.read();
    const i = all.findIndex((p) => p.id === project.id);
    if (i >= 0) all[i] = project;
    else all.unshift(project);
    this.write(all);
  }

  async remove(id: string) {
    this.write(this.read().filter((p) => p.id !== id));
  }
}

export const projectRepository: ProjectRepository = new LocalStorageProjectRepository();
