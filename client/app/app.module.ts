import { NgModule } from '@angular/core';

import { AppComponent } from './containers/app.component';
import { AppRoutingModule } from './routes/app-routing.module';

@NgModule({
  declarations: [AppComponent],
  bootstrap: [AppComponent],
  imports: [AppRoutingModule],
})
export class AppModule {}
