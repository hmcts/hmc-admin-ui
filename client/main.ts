import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/containers/app.component';
import { appConfig } from './app/containers/app.config';

bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
