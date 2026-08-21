import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RoleType } from '../../core/models/auth.model';
import { I18nextPipe } from '../../core/pipes/i18next.pipe';
import { ClientSelectorComponent } from '../components/client-selector/client-selector.component';
import { UpgradeModalComponent } from '../components/upgrade-modal/upgrade-modal.component';

interface NavItem {
  labelKey: string;
  path: string;
  icon: string;
  roles: RoleType[];
}

const NAV_ITEMS: NavItem[] = [
  { labelKey: 'nav.dashboard', path: '/dashboard', icon: 'space_dashboard', roles: [RoleType.SUPER_ADMIN, RoleType.CLIENT_ADMIN, RoleType.ADMIN] },
  { labelKey: 'nav.venues', path: '/venues', icon: 'apartment', roles: [RoleType.SUPER_ADMIN, RoleType.CLIENT_ADMIN, RoleType.ADMIN] },
  { labelKey: 'nav.events', path: '/events', icon: 'calendar_month', roles: [RoleType.SUPER_ADMIN, RoleType.CLIENT_ADMIN, RoleType.ADMIN] },
  { labelKey: 'nav.gateStaff', path: '/gate-staff', icon: 'manage_accounts', roles: [RoleType.SUPER_ADMIN, RoleType.CLIENT_ADMIN, RoleType.ADMIN] },
  { labelKey: 'nav.billing', path: '/billing', icon: 'credit_card', roles: [RoleType.CLIENT_ADMIN] },
  { labelKey: 'nav.clients', path: '/clients', icon: 'corporate_fare', roles: [RoleType.SUPER_ADMIN] },
  {
    labelKey: 'nav.guestList',
    path: '/guest-list',
    icon: 'group',
    roles: [RoleType.SUPER_ADMIN, RoleType.CLIENT_ADMIN, RoleType.ADMIN, RoleType.GATE_STAFF],
  },
  {
    labelKey: 'nav.scanner',
    path: '/scanner',
    icon: 'qr_code_scanner',
    roles: [RoleType.GATE_STAFF],
  },
];

@Component({
  selector: 'app-main-layout',
  standalone: true, 
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, I18nextPipe, ClientSelectorComponent, UpgradeModalComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  currentUser;
  visibleNavItems;
  bottomNavItems;
  isAdmin;
  isSuperAdmin;

  constructor(private auth: AuthService) {
    this.currentUser = this.auth.currentUser;

    this.visibleNavItems = computed(() => {
      const user = this.currentUser();
      if (!user) return [];
      return NAV_ITEMS.filter((item) => item.roles.includes(user.role));
    });

    this.isAdmin = computed(() => this.auth.isAdmin());
    this.isSuperAdmin = computed(() => this.auth.isSuperAdmin());

    this.bottomNavItems = computed(() =>
      this.visibleNavItems().filter((item) => item.path !== '/clients')
    );
  }

  logout(): void {
    this.auth.logout();
  }
}
