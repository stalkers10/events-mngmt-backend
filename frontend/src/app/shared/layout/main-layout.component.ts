import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RoleType } from '../../core/models/auth.model';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';

interface NavItem {
  labelKey: string; // translation key, resolved in the template via | translate
  path: string;
  icon: string;
  roles: RoleType[]; // which roles can see this nav item
}

const NAV_ITEMS: NavItem[] = [
  { labelKey: 'nav.dashboard', path: '/dashboard', icon: 'space_dashboard', roles: [RoleType.ADMIN] },
  { labelKey: 'nav.venues', path: '/venues', icon: 'apartment', roles: [RoleType.ADMIN] },
  { labelKey: 'nav.events', path: '/events', icon: 'calendar_month', roles: [RoleType.ADMIN] },
  { labelKey: 'nav.gateStaff', path: '/gate-staff', icon: 'manage_accounts', roles: [RoleType.ADMIN] },
  {
    labelKey: 'nav.guestList',
    path: '/guest-list',
    icon: 'group',
    roles: [RoleType.ADMIN, RoleType.GATE_STAFF],
  },
  {
    labelKey: 'nav.scanner',
    path: '/scanner',
    icon: 'qr_code_scanner',
    // Admin dropped from here on purpose: too many tabs for mobile nav.
    // Gate Staff still needs it as their primary/only real action.
    roles: [RoleType.GATE_STAFF],
  },
];

@Component({
  selector: 'app-main-layout',
  standalone: true, 
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, I18nextPipe],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  currentUser;
  visibleNavItems;
  isAdmin;

  constructor(private auth: AuthService) {
    this.currentUser = this.auth.currentUser;

    this.visibleNavItems = computed(() => {
      const user = this.currentUser();
      if (!user) return [];
      return NAV_ITEMS.filter((item) => item.roles.includes(user.role));
    });

    this.isAdmin = computed(() => this.currentUser()?.role === RoleType.ADMIN);
  }

  logout(): void {
    this.auth.logout();
  }
}
