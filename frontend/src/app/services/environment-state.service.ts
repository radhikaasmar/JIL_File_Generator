// Create environment-state.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EnvironmentStateService {
  private selectedEnvironmentsSubject = new BehaviorSubject<string[]>([]);
  selectedEnvironments$ = this.selectedEnvironmentsSubject.asObservable();

  updateSelectedEnvironments(environments: string[]) {
    this.selectedEnvironmentsSubject.next(environments);
  }

  getSelectedEnvironments(): string[] {
    return this.selectedEnvironmentsSubject.value;
  }
}
