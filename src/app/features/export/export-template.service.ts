import { Injectable } from '@angular/core';
import { ExportOptions, ExportTemplate } from '../../models/export.model';
import { StorageService } from '../../core/services/storage.service';

interface StoredExportTemplate {
  id: string;
  name: string;
  includeDateRange: boolean;
  options: SerializedOptions;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

interface SerializedOptions extends Omit<ExportOptions, 'startDate' | 'endDate'> {
  startDate: string;
  endDate: string;
}

interface TemplateMetadata {
  defaultTemplateId?: string;
  lastUsedTemplateId?: string;
}

interface SaveTemplatePayload {
  id?: string;
  name: string;
  includeDateRange: boolean;
  options: ExportOptions;
}

@Injectable({
  providedIn: 'root',
})
export class ExportTemplateService {
  private readonly STORAGE_KEY = 'export_templates';
  private readonly META_KEY = 'export_templates_meta';

  constructor(private storage: StorageService) {}

  list(): ExportTemplate[] {
    const templates = this.storage.get<StoredExportTemplate[]>(this.STORAGE_KEY) || [];
    const meta = this.getMetadata();
    return templates.map((tpl) => this.deserialize(tpl, meta));
  }

  getPreferred(): ExportTemplate | null {
    const templates = this.list();
    if (!templates.length) return null;

    const meta = this.getMetadata();
    const byDefault = meta.defaultTemplateId
      ? templates.find((t) => t.id === meta.defaultTemplateId)
      : undefined;
    if (byDefault) return byDefault;

    const byLastUsed = meta.lastUsedTemplateId
      ? templates.find((t) => t.id === meta.lastUsedTemplateId)
      : undefined;
    if (byLastUsed) return byLastUsed;

    return templates[0];
  }

  save(payload: SaveTemplatePayload): ExportTemplate {
    const now = new Date();
    const stored = this.storage.get<StoredExportTemplate[]>(this.STORAGE_KEY) || [];
    const meta = this.getMetadata();
    let saved: StoredExportTemplate;

    if (payload.id) {
      const index = stored.findIndex((tpl) => tpl.id === payload.id);
      if (index !== -1) {
        stored[index] = {
          ...stored[index],
          name: payload.name,
          includeDateRange: payload.includeDateRange,
          options: this.serializeOptions(payload.options),
          updatedAt: now.toISOString(),
        };
        saved = stored[index];
      } else {
        saved = this.buildNewTemplate(payload, now);
        stored.push(saved);
      }
    } else {
      saved = this.buildNewTemplate(payload, now);
      stored.push(saved);
    }

    this.storage.set(this.STORAGE_KEY, stored);
    return this.deserialize(saved, meta);
  }

  delete(id: string): void {
    const stored = this.storage.get<StoredExportTemplate[]>(this.STORAGE_KEY) || [];
    const filtered = stored.filter((tpl) => tpl.id !== id);
    this.storage.set(this.STORAGE_KEY, filtered);

    const meta = this.getMetadata();
    if (meta.defaultTemplateId === id) {
      delete meta.defaultTemplateId;
    }
    if (meta.lastUsedTemplateId === id) {
      delete meta.lastUsedTemplateId;
    }
    this.setMetadata(meta);
  }

  setDefault(id: string | null): void {
    const meta = this.getMetadata();
    meta.defaultTemplateId = id || undefined;
    this.setMetadata(meta);
  }

  markLastUsed(id: string): void {
    const stored = this.storage.get<StoredExportTemplate[]>(this.STORAGE_KEY) || [];
    const index = stored.findIndex((tpl) => tpl.id === id);
    const nowIso = new Date().toISOString();
    if (index !== -1) {
      stored[index] = { ...stored[index], lastUsedAt: nowIso, updatedAt: nowIso };
      this.storage.set(this.STORAGE_KEY, stored);
    }

    const meta = this.getMetadata();
    meta.lastUsedTemplateId = id;
    this.setMetadata(meta);
  }

  private getMetadata(): TemplateMetadata {
    return this.storage.get<TemplateMetadata>(this.META_KEY) || {};
  }

  private setMetadata(meta: TemplateMetadata): void {
    this.storage.set(this.META_KEY, meta);
  }

  private buildNewTemplate(payload: SaveTemplatePayload, now: Date): StoredExportTemplate {
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      name: payload.name,
      includeDateRange: payload.includeDateRange,
      options: this.serializeOptions(payload.options),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      lastUsedAt: now.toISOString(),
    };
  }

  private serializeOptions(options: ExportOptions): SerializedOptions {
    return {
      ...options,
      groupLevels: options.groupLevels.map((group) => ({ ...group })),
      sortLevels: options.sortLevels.map((sort) => ({ ...sort })),
      startDate: options.startDate.toISOString(),
      endDate: options.endDate.toISOString(),
    };
  }

  private deserialize(stored: StoredExportTemplate, meta: TemplateMetadata): ExportTemplate {
    return {
      id: stored.id,
      name: stored.name,
      includeDateRange: stored.includeDateRange,
      options: {
        ...stored.options,
        startDate: new Date(stored.options.startDate),
        endDate: new Date(stored.options.endDate),
        groupLevels: stored.options.groupLevels.map((group) => ({ ...group })),
        sortLevels: stored.options.sortLevels.map((sort) => ({ ...sort })),
      },
      createdAt: new Date(stored.createdAt),
      updatedAt: new Date(stored.updatedAt),
      lastUsedAt: stored.lastUsedAt ? new Date(stored.lastUsedAt) : undefined,
      isDefault: meta.defaultTemplateId === stored.id,
    };
  }
}
