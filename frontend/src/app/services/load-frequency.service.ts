import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadFrequencyService {
  private loadFrequencySubject = new BehaviorSubject<string>('');
  loadFrequency$ = this.loadFrequencySubject.asObservable();
  
  updateLoadFrequency(frequency: string) {
    this.loadFrequencySubject.next(frequency);
  }
  
  getLoadFrequency(): string {
    return this.loadFrequencySubject.value;
  }
  
  clearLoadFrequency() {
    this.loadFrequencySubject.next('');
  }
}
