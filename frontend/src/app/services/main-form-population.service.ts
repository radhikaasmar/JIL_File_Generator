import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ParsedJilData {
  jobs: any[];
  cmdJobsBySubform: { [subform: string]: any[] };
}

@Injectable({ providedIn: 'root' })
export class MainFormPopulationService {
  private parsedDataSubject = new BehaviorSubject<ParsedJilData | null>(null);
  parsedData$ = this.parsedDataSubject.asObservable();

  sendParsedData(data: ParsedJilData) {
    this.parsedDataSubject.next(data);
  }
} 