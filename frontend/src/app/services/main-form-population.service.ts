import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MainFormPopulationService {
  private parsedDataSubject = new BehaviorSubject<any[]>([]); // Now an array of jobs
  parsedData$ = this.parsedDataSubject.asObservable();

  sendParsedData(data: any[]) {
    this.parsedDataSubject.next(data);
  }
} 