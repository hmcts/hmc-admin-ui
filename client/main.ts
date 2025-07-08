import { bootstrapApplication } from '@angular/platform-browser';

import { AppModule } from './app/app.module';
import { appConfig } from './app/containers/app.config';

bootstrapApplication(AppModule, appConfig).catch(err => console.error(err));
