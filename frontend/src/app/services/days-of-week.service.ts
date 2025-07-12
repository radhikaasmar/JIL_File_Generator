import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DaysOfWeekService {
  private selectedDaysSubject = new BehaviorSubject<string[]>([]);
  selectedDays$ = this.selectedDaysSubject.asObservable();
  
  updateSelectedDays(days: string[]) {
    this.selectedDaysSubject.next(days);
  }
  
  getSelectedDays(): string[] {
    return this.selectedDaysSubject.value;
  }
  
  clearSelectedDays() {
    this.selectedDaysSubject.next([]);
  }
  // Add a method to check current state
    getCurrentState(): string[] {
    return this.selectedDaysSubject.value;
    }
}
