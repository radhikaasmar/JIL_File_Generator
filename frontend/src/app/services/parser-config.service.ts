import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ParserConfigService {
  private configUrl = 'assets/parser-config.json';

  constructor(private http: HttpClient) {}

  getKeyMapping(): Observable<{[key: string]: string}> {
    return this.http.get<any>(this.configUrl).pipe(
      map(config => config.keyMappings || {})
    );
  }
} 