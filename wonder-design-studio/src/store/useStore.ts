import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { projectRepository } from '../data/repository';
import { DEFAULT_PRICING, type PricingSettings } from '../domain/pricing';
import { getProduct, PRODUCTS } from '../domain/products';
import type { Approval, DesignStage, Lang, Project, ProductConfig, RoomDims, SavedConfig } from '../domain/types';

export type View = 'dashboard' | 'library' | 'configurator' | 'cost' | 'projects' | 'quote';

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const now = () => new Date().toISOString();
const sameConfig = (a: ProductConfig, b: ProductConfig) => JSON.stringify(a) === JSON.stringify(b);

export interface NewProjectInput {
  customerName: string;
  reference: string;
  phone?: string;
  notes?: string;
  room?: RoomDims;
}

interface State {
  lang: Lang;
  view: View;
  pricing: PricingSettings;
  projects: Project[];
  loaded: boolean;
  storageError: string | null;
  activeProjectId: string | null;
  activeConfigId: string | null;
  draft: ProductConfig;
  dirty: boolean;
  hidden: Record<string, boolean>;
  showDims: boolean;
  showGrid: boolean;
  showRoom: boolean;
  quoteTarget: { projectId: string; configId: string } | null;

  setLang(lang: Lang): void;
  setView(view: View): void;
  setDim(id: string, value: number): void;
  toggleActivity(id: string): void;
  patchDraft(patch: Partial<ProductConfig>): void;
  toggleHidden(group: string): void;
  setFlag(key: 'showDims' | 'showGrid' | 'showRoom', value: boolean): void;
  setPricing(patch: Partial<PricingSettings>): void;
  resetPricing(): void;

  loadProjects(): Promise<void>;
  createProject(input: NewProjectInput): string;
  updateProject(id: string, patch: Partial<Project>): void;
  deleteProject(id: string): void;
  setActiveProject(id: string | null): void;
  newDraft(productId: string): void;
  openConfig(projectId: string, configId: string): void;
  /** Saves the draft into the active project. Returns true if an approval was revoked. */
  saveDraft(name: string, snapshot?: string): boolean;
  deleteConfig(projectId: string, configId: string): void;
  setStage(projectId: string, configId: string, stage: DesignStage, approval?: Approval): void;
  openQuote(projectId: string, configId: string): void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      /** Writes one project to state and to the repository. */
      const commit = (project: Project) => {
        const updated = { ...project, updatedAt: now() };
        set((s) => ({
          projects: s.projects.some((p) => p.id === updated.id)
            ? s.projects.map((p) => (p.id === updated.id ? updated : p))
            : [updated, ...s.projects],
          storageError: null,
        }));
        projectRepository.save(updated).catch((err: unknown) => {
          console.error('Wonder: project save failed', err);
          set({ storageError: err instanceof Error ? err.message : String(err) });
        });
      };

      return {
        lang: 'ar',
        view: 'dashboard',
        pricing: DEFAULT_PRICING,
        projects: [],
        loaded: false,
        storageError: null,
        activeProjectId: null,
        activeConfigId: null,
        draft: PRODUCTS[0].defaultConfig(),
        dirty: false,
        hidden: {},
        showDims: true,
        showGrid: true,
        showRoom: true,
        quoteTarget: null,

        setLang: (lang) => set({ lang }),
        setView: (view) => set({ view }),

        setDim: (id, value) => {
          const def = getProduct(get().draft.productId).params.find((p) => p.id === id);
          if (!def || !Number.isFinite(value)) return;
          const v = Math.min(def.max, Math.max(def.min, Math.round(value)));
          set((s) => ({ draft: { ...s.draft, dims: { ...s.draft.dims, [id]: v } }, dirty: true }));
        },
        toggleActivity: (id) =>
          set((s) => ({
            draft: { ...s.draft, activities: { ...s.draft.activities, [id]: !s.draft.activities[id] } },
            dirty: true,
          })),
        patchDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch }, dirty: true })),
        toggleHidden: (group) => set((s) => ({ hidden: { ...s.hidden, [group]: !s.hidden[group] } })),
        setFlag: (key, value) => set({ [key]: value } as Pick<State, typeof key>),
        setPricing: (patch) => set((s) => ({ pricing: { ...s.pricing, ...patch } })),
        resetPricing: () => set({ pricing: DEFAULT_PRICING }),

        loadProjects: async () => {
          const projects = await projectRepository.list();
          set((s) => ({
            projects,
            loaded: true,
            // drop stale pointers if storage was cleared
            activeProjectId: projects.some((p) => p.id === s.activeProjectId) ? s.activeProjectId : null,
          }));
        },

        createProject: (input) => {
          const project: Project = {
            id: uid(),
            customerName: input.customerName.trim(),
            reference: input.reference.trim(),
            phone: input.phone?.trim() ?? '',
            notes: input.notes?.trim() ?? '',
            room: input.room ?? { width: null, depth: null, height: null },
            configs: [],
            createdAt: now(),
            updatedAt: now(),
          };
          commit(project);
          set({ activeProjectId: project.id, activeConfigId: null });
          return project.id;
        },

        updateProject: (id, patch) => {
          const p = get().projects.find((x) => x.id === id);
          if (p) commit({ ...p, ...patch });
        },

        deleteProject: (id) => {
          set((s) => ({
            projects: s.projects.filter((p) => p.id !== id),
            activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
            activeConfigId: s.activeProjectId === id ? null : s.activeConfigId,
          }));
          projectRepository.remove(id).catch((err: unknown) => {
            set({ storageError: err instanceof Error ? err.message : String(err) });
          });
        },

        setActiveProject: (id) => set({ activeProjectId: id, activeConfigId: null }),

        newDraft: (productId) =>
          set({ draft: getProduct(productId).defaultConfig(), activeConfigId: null, dirty: false, view: 'configurator' }),

        openConfig: (projectId, configId) => {
          const saved = get()
            .projects.find((p) => p.id === projectId)
            ?.configs.find((c) => c.id === configId);
          if (!saved) return;
          set({
            draft: structuredClone(saved.config),
            activeProjectId: projectId,
            activeConfigId: configId,
            dirty: false,
            view: 'configurator',
          });
        },

        saveDraft: (name, snapshot) => {
          const s = get();
          const project = s.projects.find((p) => p.id === s.activeProjectId);
          if (!project) return false;
          const existing = project.configs.find((c) => c.id === s.activeConfigId);
          let revoked = false;
          let saved: SavedConfig;
          if (existing) {
            const changed = !sameConfig(existing.config, s.draft);
            const wasApproved = existing.stage === 'engineering_approved' || existing.stage === 'production_ready';
            // Any change to an approved design invalidates the recorded approval.
            revoked = changed && wasApproved;
            saved = {
              ...existing,
              name: name.trim() || existing.name,
              config: structuredClone(s.draft),
              stage: revoked ? 'preliminary_design' : existing.stage,
              approval: revoked ? undefined : existing.approval,
              snapshot: snapshot ?? existing.snapshot,
              updatedAt: now(),
            };
          } else {
            saved = {
              id: uid(),
              name: name.trim() || getProduct(s.draft.productId).name[s.lang],
              config: structuredClone(s.draft),
              stage: 'visual_concept',
              snapshot,
              updatedAt: now(),
            };
          }
          commit({
            ...project,
            configs: existing
              ? project.configs.map((c) => (c.id === saved.id ? saved : c))
              : [saved, ...project.configs],
          });
          set({ activeConfigId: saved.id, dirty: false });
          return revoked;
        },

        deleteConfig: (projectId, configId) => {
          const p = get().projects.find((x) => x.id === projectId);
          if (!p) return;
          commit({ ...p, configs: p.configs.filter((c) => c.id !== configId) });
          if (get().activeConfigId === configId) set({ activeConfigId: null });
        },

        setStage: (projectId, configId, stage, approval) => {
          const p = get().projects.find((x) => x.id === projectId);
          if (!p) return;
          commit({
            ...p,
            configs: p.configs.map((c) =>
              c.id === configId
                ? {
                    ...c,
                    stage,
                    approval:
                      stage === 'engineering_approved' ? approval : stage === 'production_ready' ? c.approval : undefined,
                    updatedAt: now(),
                  }
                : c,
            ),
          });
        },

        openQuote: (projectId, configId) => set({ quoteTarget: { projectId, configId }, view: 'quote' }),
      };
    },
    {
      name: 'wonder.session.v1',
      partialize: (s) => ({
        lang: s.lang,
        pricing: s.pricing,
        draft: s.draft,
        dirty: s.dirty,
        activeProjectId: s.activeProjectId,
        activeConfigId: s.activeConfigId,
        showDims: s.showDims,
        showGrid: s.showGrid,
        showRoom: s.showRoom,
      }),
      // keep newly added pricing keys when older saved settings are loaded
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return {
          ...current,
          ...p,
          pricing: {
            ...DEFAULT_PRICING,
            ...p.pricing,
            woodPricePerM3: { ...DEFAULT_PRICING.woodPricePerM3, ...p.pricing?.woodPricePerM3 },
          },
        };
      },
    },
  ),
);

export const useActiveProject = () => useStore((s) => s.projects.find((p) => p.id === s.activeProjectId) ?? null);

export const useActiveSaved = () =>
  useStore(
    (s) =>
      s.projects.find((p) => p.id === s.activeProjectId)?.configs.find((c) => c.id === s.activeConfigId) ?? null,
  );
