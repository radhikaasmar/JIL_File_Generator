import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  // DashboardComponent,
  templateUrl: './app.html'
})
export class App {
  protected title = 'frontend';
}
