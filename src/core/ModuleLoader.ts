import type { AtlasModule, ModuleContext } from '../modules/AtlasModule';

type ModuleLoaderFn = () => Promise<AtlasModule>;

interface ModuleEntry {
  id: string;
  instance?: AtlasModule;
  loader?: ModuleLoaderFn;
}

export class ModuleLoader {
  private modules = new Map<string, ModuleEntry>();
  private active?: AtlasModule;

  constructor(private context: ModuleContext) {}

  register(module: AtlasModule): void {
    if (this.modules.has(module.id)) {
      throw new Error(`Module already registered: ${module.id}`);
    }
    this.modules.set(module.id, { id: module.id, instance: module });
  }

  registerLoader(id: string, loader: ModuleLoaderFn): void {
    if (this.modules.has(id)) {
      throw new Error(`Module already registered: ${id}`);
    }
    this.modules.set(id, { id, loader });
  }

  async load(id: string): Promise<void> {
    if (this.active?.id === id) {
      return;
    }
    const entry = this.modules.get(id);
    if (!entry) {
      throw new Error(`Unknown module: ${id}`);
    }

    let next = entry.instance;
    if (!next && entry.loader) {
      next = await entry.loader();
      if (next.id !== id) {
        throw new Error(`Module loader returned mismatched id: ${next.id}`);
      }
      entry.instance = next;
    }
    if (!next) {
      throw new Error(`Module not available: ${id}`);
    }

    this.active?.onUnload();
    this.active = next;
    await next.onLoad(this.context);
  }

  unloadActive(): void {
    this.active?.onUnload();
    this.active = undefined;
  }

  update(dt: number): void {
    this.active?.onUpdate(dt);
  }

  getActiveId(): string | undefined {
    return this.active?.id;
  }

  getActiveModule(): AtlasModule | undefined {
    return this.active;
  }
}
