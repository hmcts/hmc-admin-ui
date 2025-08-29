import { Routes } from '@angular/router';

import { Page2 } from './page2/page2';
import { StartingPage } from './starting-page/starting-page';

export const routes: Routes = [
  {
    path: '',
    title: 'Starting Page',
    component: StartingPage,
    children: [
      {
        path: 'Page Two', // child route path
        title: 'Second page',
        component: Page2, // child route component that the router renders
      },
    ],
  },
  { path: '**', redirectTo: '' }, // optional, but nice to have
];
