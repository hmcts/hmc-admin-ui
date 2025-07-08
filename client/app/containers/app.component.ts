import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationStart, Router, RoutesRecognized } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'hmc-admin-ui';
  private subscription: Subscription;

  constructor(private readonly router: Router) {
    console.log('Entered app.component.ts - constructor');
    this.router.events.subscribe(data => {
      if (data instanceof RoutesRecognized) {
        const child: ActivatedRouteSnapshot | null = data.state.root;
        console.log(child);
      }
    });

    this.subscription = router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        console.log('app.component.ts - constructor - event instanceof NavigationStart --> ', event);
      }
    });
  }

  public ngOnInit(): void {
    console.log('Entered app.component ngOnInit');
  }

  public ngOnDestroy(): void {
    console.log('Entered app.component ngOnDestroy');
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
