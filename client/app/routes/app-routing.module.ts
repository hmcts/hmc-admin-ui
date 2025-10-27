import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RequestTypeComponent } from '../containers/request-type/request-type.component';
const routes: Routes = [
  {
    path: 'EntryPoint',
    component: RequestTypeComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
