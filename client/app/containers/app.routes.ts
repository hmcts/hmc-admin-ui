// client/app/app.routes.ts
import { Routes } from '@angular/router';

import { RequestFunctionComponent } from './request-function/request-function.component';
import { RequestTypeComponent } from './request-type/request-type.component';

export const routes: Routes = [
  { path: '', redirectTo: 'request-type', pathMatch: 'full' },
  { path: 'request-type', component: RequestTypeComponent },
  { path: 'request-function', component: RequestFunctionComponent },
  { path: '**', redirectTo: 'request-type' },
];
