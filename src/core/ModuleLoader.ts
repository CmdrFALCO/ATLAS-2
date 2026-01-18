import type { AtlasModule, ModuleContext } from '../modules/AtlasModule';

export class ModuleLoader {
  private modules = new Map<string, AtlasModule>();
  private active?: AtlasModule;

  constructor(private context: ModuleContext) {}

  register(module: AtlasModule): void {
    if (this.modules.has(module.id)) {
      throw new Error(`Module already registered: ${module.id}`);
    }
    this.modules.set(module.id, module);
  }

  async load(id: string): Promise<void> {
    if (this.active?.id === id) {
      return;
    }
    const next = this.modules.get(id);
    if (!next) {
      throw new Error(`Unknown module: ${id}`);
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
}
