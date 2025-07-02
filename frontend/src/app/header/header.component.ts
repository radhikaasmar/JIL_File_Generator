import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  isDark = false;
  dateTime: string = '';
  intervalId: any;

  ngOnInit() {
    this.isDark = localStorage.getItem('theme') === 'dark';
    this.applyTheme();
    this.updateDateTime();
    this.intervalId = setInterval(() => this.updateDateTime(), 1000);
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }

  toggleTheme() {
    this.isDark = !this.isDark;
    localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
    this.applyTheme();
  }

  applyTheme() {
    document.body.classList.toggle('dark-theme', this.isDark);
  }

  updateDateTime() {
    const now = new Date();
    this.dateTime = now.toLocaleString();
  }
} 