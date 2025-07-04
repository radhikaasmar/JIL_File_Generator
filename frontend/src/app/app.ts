import { Component } from '@angular/core';
// import { RouterOutlet } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HeaderComponent } from './header/header.component';

@Component({
  selector: 'app-root',
  imports: [DashboardComponent, HeaderComponent],
  templateUrl: './app.html'
})
export class App {
  protected title = 'frontend';
}
