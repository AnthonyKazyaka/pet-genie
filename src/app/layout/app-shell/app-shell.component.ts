import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { filter } from 'rxjs/operators';
import { ThemeService, GoogleCalendarService } from '../../core/services';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

interface Breadcrumb {
  label: string;
  route: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatTooltipModule,
    MatMenuModule,
    MatBadgeModule,
  ],
  template: `
    <mat-sidenav-container class="app-container">
      <!-- Sidebar (Desktop) -->
      <mat-sidenav
        #sidenav
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="!isMobile() && sidenavOpened()"
        class="app-sidenav"
        [class.collapsed]="!sidenavExpanded()"
        (closedStart)="onSidenavClose()"
      >
        <div class="sidenav-header">
          <div class="logo" *ngIf="sidenavExpanded()">
            <span class="logo-icon">🐾</span>
            <span class="logo-text">Pet Genie</span>
          </div>
          <div class="logo-collapsed" *ngIf="!sidenavExpanded()">
            <span class="logo-icon">🐾</span>
          </div>
        </div>

        <mat-nav-list>
          @for (item of navItems; track item.route) {
            <a
              mat-list-item
              [routerLink]="item.route"
              routerLinkActive="active"
              [matTooltip]="sidenavExpanded() ? '' : item.label"
              matTooltipPosition="right"
              (click)="onNavItemClick()"
              [attr.aria-label]="item.label"
            >
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle *ngIf="sidenavExpanded()">{{ item.label }}</span>
            </a>
          }
        </mat-nav-list>

        <div class="sidenav-footer">
          <button
            mat-icon-button
            (click)="toggleSidenavExpanded()"
            [matTooltip]="sidenavExpanded() ? 'Collapse' : 'Expand'"
            aria-label="Toggle sidebar width"
          >
            <mat-icon>{{ sidenavExpanded() ? 'chevron_left' : 'chevron_right' }}</mat-icon>
          </button>
        </div>
      </mat-sidenav>

      <!-- Main Content -->
      <mat-sidenav-content class="app-content">
        <!-- Header -->
        <mat-toolbar class="app-header" color="primary">
          <button 
            mat-icon-button 
            (click)="toggleSidenav()" 
            class="menu-button"
            aria-label="Toggle navigation menu"
          >
            <mat-icon>menu</mat-icon>
          </button>
          
          <!-- Breadcrumbs -->
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            @for (crumb of breadcrumbs(); track crumb.route; let last = $last) {
              @if (!last) {
                <a [routerLink]="crumb.route" class="breadcrumb-link">{{ crumb.label }}</a>
                <mat-icon class="breadcrumb-separator">chevron_right</mat-icon>
              } @else {
                <span class="breadcrumb-current">{{ crumb.label }}</span>
              }
            }
          </nav>
          
          <span class="spacer"></span>
          
          <!-- Sync Status -->
          <div class="sync-status" *ngIf="isConnected()">
            <span class="sync-indicator" [class.synced]="!isSyncing()"></span>
            <span class="sync-text" *ngIf="!isMobile()">
              {{ lastSyncTime() ? 'Synced ' + lastSyncTime() : 'Connected' }}
            </span>
          </div>
          
          <!-- Action Buttons -->
          <button 
            mat-icon-button 
            matTooltip="Refresh data" 
            (click)="refreshData()"
            [disabled]="isSyncing()"
            aria-label="Refresh data"
          >
            <mat-icon [class.spinning]="isSyncing()">refresh</mat-icon>
          </button>
          
          <button 
            mat-icon-button 
            [matTooltip]="'Theme: ' + themeService.getThemeLabel()"
            [matMenuTriggerFor]="themeMenu"
            aria-label="Change theme"
          >
            <mat-icon>{{ themeService.getThemeIcon() }}</mat-icon>
          </button>
          
          <mat-menu #themeMenu="matMenu">
            <button mat-menu-item (click)="themeService.setTheme('light')">
              <mat-icon>light_mode</mat-icon>
              <span>Light</span>
            </button>
            <button mat-menu-item (click)="themeService.setTheme('dark')">
              <mat-icon>dark_mode</mat-icon>
              <span>Dark</span>
            </button>
            <button mat-menu-item (click)="themeService.setTheme('system')">
              <mat-icon>brightness_auto</mat-icon>
              <span>System</span>
            </button>
          </mat-menu>
          
          <button mat-icon-button matTooltip="Account" [matMenuTriggerFor]="accountMenu" aria-label="Account menu">
            <mat-icon>account_circle</mat-icon>
          </button>
          
          <mat-menu #accountMenu="matMenu">
            <button mat-menu-item routerLink="/settings">
              <mat-icon>settings</mat-icon>
              <span>Settings</span>
            </button>
            <button mat-menu-item (click)="signOut()" *ngIf="isConnected()">
              <mat-icon>logout</mat-icon>
              <span>Sign Out</span>
            </button>
          </mat-menu>
        </mat-toolbar>

        <!-- Page Content -->
        <main id="main-content" class="page-content" tabindex="-1">
          <router-outlet></router-outlet>
        </main>
        
        <!-- Mobile Bottom Navigation -->
        <nav class="mobile-nav" *ngIf="isMobile()" aria-label="Mobile navigation">
          @for (item of mobileNavItems; track item.route) {
            <a
              class="mobile-nav-item"
              [routerLink]="item.route"
              routerLinkActive="active"
              [attr.aria-label]="item.label"
            >
              <mat-icon>{{ item.icon }}</mat-icon>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .app-container {
      height: 100vh;
    }

    .app-sidenav {
      width: 240px;
      background: var(--surface-container);
      border-right: 1px solid var(--outline-variant);
      transition: width 0.2s ease;
      display: flex;
      flex-direction: column;
    }

    .app-sidenav.collapsed {
      width: 72px;
    }

    .sidenav-header {
      padding: 16px;
      border-bottom: 1px solid var(--outline-variant);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      font-size: 28px;
    }

    .logo-text {
      font-size: 20px;
      font-weight: 600;
      color: var(--on-surface);
    }

    .logo-collapsed {
      display: flex;
      justify-content: center;
    }

    mat-nav-list {
      flex: 1;
      padding-top: 8px;
    }

    mat-nav-list a {
      margin: 4px 8px;
      border-radius: 8px;
      transition: background-color var(--transition-fast) ease;
    }

    mat-nav-list a:focus-visible {
      box-shadow: var(--focus-ring);
    }

    mat-nav-list a.active {
      background: var(--primary-container);
      color: var(--on-primary-container);
    }

    mat-nav-list a.active mat-icon {
      color: var(--on-primary-container);
    }

    .sidenav-footer {
      padding: 8px;
      border-top: 1px solid var(--outline-variant);
      display: flex;
      justify-content: center;
    }

    .app-content {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .app-header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--primary) !important;
    }

    [data-theme="dark"] .app-header {
      background: var(--surface-container) !important;
    }

    .menu-button {
      margin-right: 8px;
    }

    .breadcrumbs {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
    }

    .breadcrumb-link {
      color: var(--on-primary);
      text-decoration: none;
      opacity: 0.8;
      transition: opacity var(--transition-fast) ease;
    }

    .breadcrumb-link:hover {
      opacity: 1;
    }

    [data-theme="dark"] .breadcrumb-link {
      color: var(--on-surface);
    }

    .breadcrumb-separator {
      font-size: 18px;
      width: 18px;
      height: 18px;
      opacity: 0.6;
    }

    .breadcrumb-current {
      font-weight: 500;
    }

    .spacer {
      flex: 1;
    }

    .sync-status {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-right: 8px;
      padding: 4px 12px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      font-size: 12px;
    }

    [data-theme="dark"] .sync-status {
      background: rgba(255, 255, 255, 0.05);
    }

    .sync-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--workload-busy);
      animation: pulse 1.5s infinite;
    }

    .sync-indicator.synced {
      background: var(--tertiary);
      animation: none;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .sync-text {
      color: var(--on-primary);
      opacity: 0.9;
    }

    [data-theme="dark"] .sync-text {
      color: var(--on-surface);
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .page-content {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      background: var(--surface);
    }

    /* Mobile Bottom Navigation */
    .mobile-nav {
      display: flex;
      justify-content: space-around;
      align-items: center;
      background: var(--surface-container);
      border-top: 1px solid var(--outline-variant);
      padding: 8px 0;
      padding-bottom: max(8px, env(safe-area-inset-bottom));
    }

    .mobile-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 16px;
      text-decoration: none;
      color: var(--on-surface-variant);
      font-size: 11px;
      border-radius: 8px;
      transition: all var(--transition-fast) ease;
    }

    .mobile-nav-item:focus-visible {
      box-shadow: var(--focus-ring);
    }

    .mobile-nav-item.active {
      color: var(--primary);
    }

    .mobile-nav-item.active mat-icon {
      color: var(--primary);
    }

    .mobile-nav-item mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    @media (max-width: 768px) {
      .app-sidenav {
        width: 280px;
      }

      .page-content {
        padding: 16px;
        padding-bottom: 80px; /* Space for mobile nav */
      }

      .breadcrumbs {
        display: none;
      }
    }
  `],
})
export class AppShellComponent {
  private router = inject(Router);
  themeService = inject(ThemeService);
  private googleCalendarService = inject(GoogleCalendarService);

  sidenavOpened = signal(true);
  sidenavExpanded = signal(true);
  isMobile = signal(false);
  isSyncing = signal(false);
  lastSyncTime = signal<string | null>(null);
  currentRoute = signal('/dashboard');

  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { label: 'Calendar', route: '/calendar', icon: 'calendar_month' },
    { label: 'Templates', route: '/templates', icon: 'description' },
    { label: 'Analytics', route: '/analytics', icon: 'analytics' },
    { label: 'Settings', route: '/settings', icon: 'settings' },
  ];

  mobileNavItems: NavItem[] = [
    { label: 'Home', route: '/dashboard', icon: 'home' },
    { label: 'Calendar', route: '/calendar', icon: 'calendar_month' },
    { label: 'Templates', route: '/templates', icon: 'description' },
    { label: 'Analytics', route: '/analytics', icon: 'analytics' },
  ];

  breadcrumbs = computed<Breadcrumb[]>(() => {
    const route = this.currentRoute();
    const crumbs: Breadcrumb[] = [{ label: 'Home', route: '/dashboard' }];
    
    const routeLabels: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/calendar': 'Calendar',
      '/templates': 'Templates',
      '/analytics': 'Analytics',
      '/settings': 'Settings',
    };

    if (route !== '/dashboard' && routeLabels[route]) {
      crumbs.push({ label: routeLabels[route], route });
    }

    return crumbs;
  });

  isConnected = computed(() => this.googleCalendarService.isSignedIn());

  constructor() {
    this.checkMobile();
    
    // Track route changes for breadcrumbs
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentRoute.set(event.urlAfterRedirects);
      }
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkMobile();
  }

  private checkMobile(): void {
    this.isMobile.set(window.innerWidth <= 768);
    if (this.isMobile()) {
      this.sidenavOpened.set(false);
    }
  }

  toggleSidenav(): void {
    this.sidenavOpened.update((v) => !v);
  }

  toggleSidenavExpanded(): void {
    this.sidenavExpanded.update((v) => !v);
  }

  onNavItemClick(): void {
    if (this.isMobile()) {
      this.sidenavOpened.set(false);
    }
  }

  onSidenavClose(): void {
    if (this.isMobile()) {
      this.sidenavOpened.set(false);
    }
  }

  async refreshData(): Promise<void> {
    this.isSyncing.set(true);
    try {
      // Trigger a custom event that pages can listen to
      window.dispatchEvent(new CustomEvent('pet-genie:refresh'));
      this.updateLastSyncTime();
    } finally {
      setTimeout(() => this.isSyncing.set(false), 1000);
    }
  }

  private updateLastSyncTime(): void {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    this.lastSyncTime.set(timeStr);
  }

  async signOut(): Promise<void> {
    try {
      await this.googleCalendarService.signOut();
      this.router.navigate(['/settings']);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
}
