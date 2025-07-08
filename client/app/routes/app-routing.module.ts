import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { StartingPage } from '../containers/starting-page/starting-page';
const routes: Routes = [
  {
    path: 'EntryPoint',
    component: StartingPage,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
