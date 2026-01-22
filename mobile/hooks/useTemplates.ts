import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Template,
  TemplateType,
  CreateTemplateDto,
  UpdateTemplateDto,
  DEFAULT_TEMPLATES,
} from '@/models';
import { useSettings } from './useSettings';

const TEMPLATES_STORAGE_KEY = '@pet_genie/templates';

/**
 * Generate a unique ID for templates
 */
function generateId(): string {
  return `template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create full template from DTO
 */
function createTemplateFromDto(dto: CreateTemplateDto): Template {
  const now = new Date();
  return {
    id: generateId(),
    userId: 'local',
    name: dto.name,
    icon: dto.icon || '📝',
    type: dto.type,
    duration: dto.duration,
    includeTravel: dto.includeTravel ?? false,
    travelBuffer: dto.travelBuffer ?? 0,
    defaultNotes: dto.defaultNotes,
    color: dto.color,
    defaultStartTime: dto.defaultStartTime,
    defaultEndTime: dto.defaultEndTime,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Initialize default templates
 */
function initializeDefaultTemplates(): Template[] {
  const now = new Date();
  return DEFAULT_TEMPLATES.map((t, index) => ({
    ...t,
    id: `default_${index}`,
    userId: 'local',
    createdAt: now,
    updatedAt: now,
  }));
}

/**
 * Custom hook for managing templates
 * Supports demo mode where changes are not persisted
 */
export function useTemplates() {
  const { settings } = useSettings();
  const isDemoMode = settings.demoMode;
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load templates from storage or use defaults in demo mode
   */
  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      
      if (isDemoMode) {
        // In demo mode, always use default templates
        setTemplates(initializeDefaultTemplates());
        setError(null);
        return;
      }
      
      const stored = await AsyncStorage.getItem(TEMPLATES_STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored) as Template[];
        // Convert date strings back to Date objects
        const templatesWithDates = parsed.map((t) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        }));
        setTemplates(templatesWithDates);
      } else {
        // Initialize with default templates
        const defaults = initializeDefaultTemplates();
        setTemplates(defaults);
        await AsyncStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(defaults));
      }

      setError(null);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('Failed to load templates');
      // Fall back to defaults
      setTemplates(initializeDefaultTemplates());
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  /**
   * Save templates to storage (disabled in demo mode)
   */
  const saveTemplates = useCallback(async (newTemplates: Template[]) => {
    if (isDemoMode) {
      // In demo mode, just update local state without persisting
      setTemplates(newTemplates);
      return;
    }
    
    try {
      await AsyncStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(newTemplates));
      setTemplates(newTemplates);
      setError(null);
    } catch (err) {
      console.error('Failed to save templates:', err);
      setError('Failed to save templates');
      throw err;
    }
  }, [isDemoMode]);

  /**
   * Add a new template
   */
  const addTemplate = useCallback(
    async (dto: CreateTemplateDto): Promise<Template> => {
      const newTemplate = createTemplateFromDto(dto);
      const updated = [...templates, newTemplate];
      await saveTemplates(updated);
      return newTemplate;
    },
    [templates, saveTemplates]
  );

  /**
   * Update an existing template
   */
  const updateTemplate = useCallback(
    async (id: string, dto: UpdateTemplateDto): Promise<Template | null> => {
      const index = templates.findIndex((t) => t.id === id);
      if (index === -1) return null;

      const existing = templates[index];
      const updated: Template = {
        ...existing,
        ...dto,
        updatedAt: new Date(),
      };

      const newTemplates = [...templates];
      newTemplates[index] = updated;
      await saveTemplates(newTemplates);

      return updated;
    },
    [templates, saveTemplates]
  );

  /**
   * Delete a template
   */
  const deleteTemplate = useCallback(
    async (id: string): Promise<boolean> => {
      const filtered = templates.filter((t) => t.id !== id);
      if (filtered.length === templates.length) return false;

      await saveTemplates(filtered);
      return true;
    },
    [templates, saveTemplates]
  );

  /**
   * Get template by ID
   */
  const getTemplate = useCallback(
    (id: string): Template | undefined => {
      return templates.find((t) => t.id === id);
    },
    [templates]
  );

  /**
   * Get templates by type
   */
  const getTemplatesByType = useCallback(
    (type: TemplateType): Template[] => {
      return templates.filter((t) => t.type === type);
    },
    [templates]
  );

  /**
   * Duplicate a template
   */
  const duplicateTemplate = useCallback(
    async (id: string): Promise<Template | null> => {
      const original = templates.find((t) => t.id === id);
      if (!original) return null;

      const duplicate = createTemplateFromDto({
        name: `${original.name} (Copy)`,
        icon: original.icon,
        type: original.type,
        duration: original.duration,
        includeTravel: original.includeTravel,
        travelBuffer: original.travelBuffer,
        defaultNotes: original.defaultNotes,
        color: original.color,
        defaultStartTime: original.defaultStartTime,
        defaultEndTime: original.defaultEndTime,
      });

      const updated = [...templates, duplicate];
      await saveTemplates(updated);

      return duplicate;
    },
    [templates, saveTemplates]
  );

  /**
   * Reset to default templates
   */
  const resetToDefaults = useCallback(async () => {
    const defaults = initializeDefaultTemplates();
    await saveTemplates(defaults);
  }, [saveTemplates]);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    loading,
    error,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    getTemplatesByType,
    duplicateTemplate,
    resetToDefaults,
    refresh: loadTemplates,
  };
}
