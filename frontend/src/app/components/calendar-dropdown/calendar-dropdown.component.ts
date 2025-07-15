import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { CalendarService, CustomCalendar } from '../../services/calendar.service';
import { CalendarPopupComponent } from '../calendar-popup/calendar-popup.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-calendar-dropdown',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CalendarPopupComponent],
template: `
  <div class="calendar-dropdown-container">
    <div class="calendar-input-group">
      <select 
        [formControl]="control" 
        (change)="onCalendarSelect($event)"
        class="calendar-select"
        [disabled]="predefinedCalendars.length === 0 && customCalendars.length === 0">
        <option value="">Select a calendar...</option>
        <optgroup label="Predefined Calendars" *ngIf="predefinedCalendars.length > 0">
          <option *ngFor="let calendar of predefinedCalendars" [value]="calendar">
            {{ calendar }}
          </option>
        </optgroup>
        <optgroup label="Custom Calendars" *ngIf="customCalendars.length > 0">
          <option *ngFor="let calendar of customCalendars" [value]="calendar.extendedCalendar">
            {{ calendar.extendedCalendar }}
          </option>
        </optgroup>
      </select>
      
      <button 
        type="button" 
        (click)="openPopup()"
        class="btn btn-primary"
        title="Create Custom Calendar">
        create custom calendar
      </button>
    </div>

    <div *ngIf="control.value" class="selected-calendar-display">
      <strong>Selected:</strong> {{ control.value }}
    </div>

    <div *ngIf="errorMessage" class="error-message">
      <span class="error-text">{{ errorMessage }}</span>
      <button type="button" (click)="retryLoadCalendars()" class="retry-btn">
        Retry
      </button>
    </div>
  </div>

  <app-calendar-popup 
    *ngIf="showPopup"
    (calendarCreated)="onCustomCalendarCreated($event)"
    (closePopup)="closePopup()">
  </app-calendar-popup>
`
,
  styleUrls: ['./calendar-dropdown.component.css']
})
export class CalendarDropdownComponent implements OnInit, OnDestroy {
  @Input() control!: FormControl;
  @Output() calendarSelected = new EventEmitter<string>();
  @Output() customCalendarCreated = new EventEmitter<CustomCalendar>();

  predefinedCalendars: string[] = [];
  customCalendars: CustomCalendar[] = [];
  showPopup = false;
  errorMessage = '';
  private subscriptions: Subscription[] = [];

  constructor(private calendarService: CalendarService) {}

  ngOnInit() {
    this.loadCalendars();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadCalendars() {
    // First, try to load predefined calendars synchronously
    this.predefinedCalendars = this.calendarService.getPredefinedCalendars();
    
    // If no predefined calendars loaded, try async loading
    if (this.predefinedCalendars.length === 0) {
      const predefinedSub = this.calendarService.getPredefinedCalendarsAsync()
        .subscribe({
          next: (data) => {
            this.predefinedCalendars = data.predefinedCalendars || [];
            this.errorMessage = '';
          },
          error: (error) => {
            console.error('Error loading predefined calendars:', error);
            this.errorMessage = 'Failed to load predefined calendars. Please try again.';
            this.predefinedCalendars = [];
          }
        });
      
      this.subscriptions.push(predefinedSub);
    }
    
    // Load custom calendars
    this.customCalendars = this.calendarService.getCustomCalendars();
  }

  onCalendarSelect(event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedValue = target.value;
    
    if (selectedValue) {
      this.calendarSelected.emit(selectedValue);
      this.control.setValue(selectedValue);
      this.control.markAsTouched();
    }
  }

  openPopup() {
    this.showPopup = true;
  }

  closePopup() {
    this.showPopup = false;
  }

  onCustomCalendarCreated(calendar: CustomCalendar) {
    this.customCalendarCreated.emit(calendar);
    this.customCalendars = this.calendarService.getCustomCalendars();
    this.closePopup();
  }

  retryLoadCalendars() {
    this.errorMessage = '';
    this.loadCalendars();
  }
}