import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'pet-genie-theme';
  
  currentTheme = signal<Theme>(this.getStoredTheme());
  isDarkMode = signal<boolean>(false);

  constructor() {
    // Set up effect to apply theme changes
    effect(() => {
      this.applyTheme(this.currentTheme());
    }, { allowSignalWrites: true });

    // Listen for system theme changes
    if (typeof window !== 'undefined') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (this.currentTheme() === 'system') {
          this.applyTheme('system');
        }
      });
    }

    // Apply initial theme
    this.applyTheme(this.currentTheme());
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
  }

  toggleTheme(): void {
    const current = this.currentTheme();
    if (current === 'light') {
      this.setTheme('dark');
    } else if (current === 'dark') {
      this.setTheme('system');
    } else {
      this.setTheme('light');
    }
  }

  private getStoredTheme(): Theme {
    if (typeof localStorage === 'undefined') return 'system';
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system';
  }

  private applyTheme(theme: Theme): void {
    if (typeof document === 'undefined') return;

    let isDark = false;
    
    if (theme === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDark = theme === 'dark';
    }

    this.isDarkMode.set(isDark);
    
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  getThemeIcon(): string {
    const theme = this.currentTheme();
    switch (theme) {
      case 'light': return 'light_mode';
      case 'dark': return 'dark_mode';
      case 'system': return 'brightness_auto';
    }
  }

  getThemeLabel(): string {
    const theme = this.currentTheme();
    switch (theme) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'system': return 'System';
    }
  }
}
