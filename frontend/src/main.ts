import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Registers French locale data so DatePipe/CurrencyPipe/etc. work correctly
// when the user switches the app language to French (e.g. date formatting
// in the Gate Staff accounts list).
registerLocaleData(localeFr, 'fr');

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
