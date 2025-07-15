import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CustomCalendar {
  extendedCalendar: string;
  description: string;
  workday: string;
  nonWorkday: string;
  holiday: string;
  holcal: string;
  cyccal: string;
  adjust: number;
  condition: string;
}

export interface CalendarData {
  predefinedCalendars: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private customCalendars: Map<string, CustomCalendar> = new Map();
  private customCalendarsSubject = new BehaviorSubject<CustomCalendar[]>([]);
  private predefinedCalendars: string[] = [];
  private predefinedCalendarsSubject = new BehaviorSubject<string[]>([]);

  constructor(private http: HttpClient) {
    this.loadPredefinedCalendars();
  }

  private loadPredefinedCalendars(): void {
    this.http.get<CalendarData>('assets/calendars.json').subscribe({
      next: (data) => {
        this.predefinedCalendars = data.predefinedCalendars;
        // Emit the updated calendars to subscribers
        this.predefinedCalendarsSubject.next(this.predefinedCalendars);
      },
      error: (error) => {
        console.error('Error loading predefined calendars:', error);
        this.predefinedCalendars = [];
        this.predefinedCalendarsSubject.next([]);
      }
    });
  }

  // Get predefined calendars as Observable
  getPredefinedCalendarsObservable(): Observable<string[]> {
    return this.predefinedCalendarsSubject.asObservable();
  }

  // Get predefined calendars synchronously
  getPredefinedCalendars(): string[] {
    return this.predefinedCalendars;
  }

  // Get predefined calendars asynchronously
  getPredefinedCalendarsAsync(): Observable<CalendarData> {
    return this.http.get<CalendarData>('assets/calendars.json');
  }

  // Custom calendar management
  addCustomCalendar(calendar: CustomCalendar): void {
    this.customCalendars.set(calendar.extendedCalendar, calendar);
    this.customCalendarsSubject.next(Array.from(this.customCalendars.values()));
  }

  getCustomCalendars(): CustomCalendar[] {
    return Array.from(this.customCalendars.values());
  }

  getCustomCalendarsObservable(): Observable<CustomCalendar[]> {
    return this.customCalendarsSubject.asObservable();
  }

  getCustomCalendar(name: string): CustomCalendar | undefined {
    return this.customCalendars.get(name);
  }

  removeCustomCalendar(name: string): void {
    this.customCalendars.delete(name);
    this.customCalendarsSubject.next(Array.from(this.customCalendars.values()));
  }

  // Get all calendars (predefined + custom)
  getAllCalendars(): string[] {
    const customCalendarNames = Array.from(this.customCalendars.keys());
    return [...this.predefinedCalendars, ...customCalendarNames];
  }

  // Generate JIL format as per your requirements
  generateCalendarJIL(calendar: CustomCalendar): string {
    let jil = '';
    
    // Use the new format as requested
    jil += `extended_calendar: ${calendar.extendedCalendar}\n`;
    jil += `description: ${calendar.description}\n`;
    jil += `workday: ${calendar.workday || ''}\n`;
    jil += `non_workday: ${calendar.nonWorkday || ''}\n`;
    jil += `holiday: ${calendar.holiday || ''}\n`;
    jil += `holcal: ${calendar.holcal || ''}\n`;
    jil += `cyccal: ${calendar.cyccal || ''}\n`;
    jil += `adjust: ${calendar.adjust || 0}\n`;
    jil += `condition: ${calendar.condition || ''}\n`;
    
    return jil;
  }

  // Alternative method to generate JIL with all fields (even empty ones)
  generateCompleteCalendarJIL(calendar: CustomCalendar): string {
    return `extended_calendar: ${calendar.extendedCalendar}
description: ${calendar.description}
workday: ${calendar.workday}
non_workday: ${calendar.nonWorkday}
holiday: ${calendar.holiday}
holcal: ${calendar.holcal}
cyccal: ${calendar.cyccal}
adjust: ${calendar.adjust}
condition: ${calendar.condition}`;
  }

  // Utility method to validate calendar data
  validateCalendar(calendar: CustomCalendar): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!calendar.extendedCalendar || calendar.extendedCalendar.trim() === '') {
      errors.push('Extended calendar name is required');
    }

    if (!calendar.description || calendar.description.trim() === '') {
      errors.push('Description is required');
    }

    // Validate workday format (optional but should be valid if provided)
    if (calendar.workday) {
      const validDays = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'];
      const workdays = calendar.workday.split(',').map(day => day.trim().toLowerCase());
      const invalidDays = workdays.filter(day => !validDays.includes(day));
      
      if (invalidDays.length > 0) {
        errors.push(`Invalid workdays: ${invalidDays.join(', ')}`);
      }
    }

    // Validate adjust is a number
    if (calendar.adjust && isNaN(Number(calendar.adjust))) {
      errors.push('Adjust value must be a number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Check if calendar name already exists
  calendarExists(name: string): boolean {
    return this.customCalendars.has(name) || this.predefinedCalendars.includes(name);
  }

  // Export calendars for backup
  exportCalendars(): string {
    const data = {
      customCalendars: Array.from(this.customCalendars.values()),
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  // Import calendars from backup
  importCalendars(jsonData: string): { success: boolean; imported: number; errors: string[] } {
    try {
      const data = JSON.parse(jsonData);
      const errors: string[] = [];
      let imported = 0;

      if (data.customCalendars && Array.isArray(data.customCalendars)) {
        data.customCalendars.forEach((calendar: any) => {
          const validation = this.validateCalendar(calendar);
          if (validation.valid) {
            this.addCustomCalendar(calendar);
            imported++;
          } else {
            errors.push(`Calendar ${calendar.extendedCalendar}: ${validation.errors.join(', ')}`);
          }
        });
      }

      return {
        success: true,
        imported,
        errors
      };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        errors: ['Invalid JSON format']
      };
    }
  }
}
