import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { I18nextPipe } from '../../../core/pipes/i18next.pipe';
import { UpgradeService } from '../../../core/services/upgrade.service';

@Component({
  selector: 'app-upgrade-modal',
  standalone: true,
  imports: [CommonModule, I18nextPipe],
  templateUrl: './upgrade-modal.component.html',
  styleUrl: './upgrade-modal.component.scss',
})
export class UpgradeModalComponent {
  private upgrade = inject(UpgradeService);
  private router = inject(Router);

  readonly state = this.upgrade.state;

  titleKey(): string {
    switch (this.state()?.feature) {
      case 'EVENT_CREATION':
        return 'upgrade.titleEvents';
      case 'TABLE':
        return 'upgrade.titleTables';
      default:
        return 'upgrade.titleBuildings';
    }
  }

  goToBilling(): void {
    this.upgrade.close();
    this.router.navigate(['/billing']);
  }

  close(): void {
    this.upgrade.close();
  }
}
