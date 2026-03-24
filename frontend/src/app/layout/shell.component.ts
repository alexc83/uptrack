import { Component, signal, computed, OnInit, Renderer2, inject, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { AvatarModule } from 'primeng/avatar';

import { AuthStore } from '../core/auth/auth.store';

@Component({
  selector: 'app-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ButtonModule,
    DialogModule,
    TooltipModule,
    AvatarModule,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  private static readonly MOBILE_BREAKPOINT = 768;
  private readonly renderer = inject(Renderer2);
  private readonly authStore = inject(AuthStore);

  readonly user = this.authStore.currentUser;
  readonly isDark = signal(false);
  readonly isMobile = signal(false);
  readonly isDesktopCollapsed = signal(false);
  readonly mobileSidebarOpen = signal(false);
  readonly logoutConfirmOpen = signal(false);

  readonly themeIcon = computed(() => (this.isDark() ? 'pi pi-sun' : 'pi pi-moon'));
  readonly themeLabel = computed(() => (this.isDark() ? 'Light mode' : 'Dark mode'));
  readonly isSidebarCollapsed = computed(() =>
    this.isMobile() ? !this.mobileSidebarOpen() : this.isDesktopCollapsed(),
  );
  readonly collapseIcon = computed(() => {
    if (this.isMobile()) {
      return this.mobileSidebarOpen() ? 'pi pi-times' : 'pi pi-bars';
    }

    return this.isDesktopCollapsed() ? 'pi pi-angle-right' : 'pi pi-angle-left';
  });
  readonly collapseLabel = computed(() => {
    if (this.isMobile()) {
      return this.mobileSidebarOpen() ? 'Close navigation' : 'Open navigation';
    }

    return this.isDesktopCollapsed() ? 'Expand sidebar' : 'Collapse sidebar';
  });

  readonly userInitials = computed(() => {
    const name = this.user()?.name ?? '';
    const parts = name.split(' ').filter(Boolean);
    return parts.map((p) => p[0]).join('').toUpperCase();
  });

  ngOnInit(): void {
    const stored = localStorage.getItem('uptrack-theme');
    const storedSidebar = localStorage.getItem('uptrack-sidebar-collapsed');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = stored ? stored === 'dark' : prefersDark;

    this.setTheme(dark);
    this.isDesktopCollapsed.set(storedSidebar === 'true');
    this.syncViewportState();
  }

  toggleTheme(): void {
    this.setTheme(!this.isDark());
  }

  toggleSidebar(): void {
    if (this.isMobile()) {
      this.mobileSidebarOpen.update((open) => !open);
      return;
    }

    const next = !this.isDesktopCollapsed();
    this.isDesktopCollapsed.set(next);
    localStorage.setItem('uptrack-sidebar-collapsed', String(next));
  }

  closeMobileSidebar(): void {
    if (this.isMobile()) {
      this.mobileSidebarOpen.set(false);
    }
  }

  handleNavClick(): void {
    this.closeMobileSidebar();
  }

  requestLogout(): void {
    this.logoutConfirmOpen.set(true);
  }

  closeLogoutConfirm(): void {
    this.logoutConfirmOpen.set(false);
  }

  logout(): void {
    this.logoutConfirmOpen.set(false);
    this.closeMobileSidebar();
    this.authStore.logout();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncViewportState();
  }

  private setTheme(dark: boolean): void {
    this.isDark.set(dark);
    localStorage.setItem('uptrack-theme', dark ? 'dark' : 'light');
    if (dark) {
      this.renderer.addClass(document.documentElement, 'dark');
    } else {
      this.renderer.removeClass(document.documentElement, 'dark');
    }
  }

  private syncViewportState(): void {
    const mobile = window.innerWidth <= ShellComponent.MOBILE_BREAKPOINT;
    this.isMobile.set(mobile);

    if (mobile) {
      this.mobileSidebarOpen.set(false);
    }
  }
}
