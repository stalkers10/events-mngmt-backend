import { Pipe, PipeTransform } from '@angular/core';
import { TOptions } from 'i18next';
import { I18nextService } from '../services/i18next.service';

/** Angular template bridge for the i18next translation engine. */
@Pipe({ name: 'translate', standalone: true, pure: false })
export class I18nextPipe implements PipeTransform {
  constructor(private i18next: I18nextService) {}

  transform(key: string, options?: TOptions): string {
    return this.i18next.t(key, options);
  }
}
