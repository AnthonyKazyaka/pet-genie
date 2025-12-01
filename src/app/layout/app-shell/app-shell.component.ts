import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';

interface NavItem {
  label: string;
  route: string;
  icon: string;
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
  ],
  template: `
    <mat-sidenav-container class="app-container">
      <!-- Sidebar -->
      <mat-sidenav
        #sidenav
        mode="side"
        [opened]="sidenavOpened()"
        class="app-sidenav"
        [class.collapsed]="!sidenavExpanded()"
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
          >
            <mat-icon>{{ sidenavExpanded() ? 'chevron_left' : 'chevron_right' }}</mat-icon>
          </button>
        </div>
      </mat-sidenav>

      <!-- Main Content -->
      <mat-sidenav-content class="app-content">
        <!-- Header -->
        <mat-toolbar class="app-header" color="primary">
          <button mat-icon-button (click)="toggleSidenav()" class="menu-button">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="header-title">Pet Genie</span>
          <span class="spacer"></span>
          <button mat-icon-button matTooltip="Refresh">
            <mat-icon>refresh</mat-icon>
          </button>
          <button mat-icon-button matTooltip="Account">
            <mat-icon>account_circle</mat-icon>
          </button>
        </mat-toolbar>

        <!-- Page Content -->
        <main class="page-content">
          <router-outlet></router-outlet>
        </main>
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
    }

    .menu-button {
      margin-right: 8px;
    }

    .header-title {
      font-size: 20px;
      font-weight: 500;
    }

    .spacer {
      flex: 1;
    }

    .page-content {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      background: var(--surface);
    }

    @media (max-width: 768px) {
      .app-sidenav {
        width: 100%;
      }

      .page-content {
        padding: 16px;
      }
    }
  `],
})
export class AppShellComponent {
  sidenavOpened = signal(true);
  sidenavExpanded = signal(true);

  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { label: 'Calendar', route: '/calendar', icon: 'calendar_month' },
    { label: 'Templates', route: '/templates', icon: 'description' },
    { label: 'Analytics', route: '/analytics', icon: 'analytics' },
    { label: 'Settings', route: '/settings', icon: 'settings' },
  ];

  toggleSidenav(): void {
    this.sidenavOpened.update((v) => !v);
  }

  toggleSidenavExpanded(): void {
    this.sidenavExpanded.update((v) => !v);
  }
}
