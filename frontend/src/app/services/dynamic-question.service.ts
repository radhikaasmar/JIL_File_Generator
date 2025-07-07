import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DynamicQuestionService {
  private questionsUrl = 'assets/dynamic-questions.json';
  private questions$?: Observable<any>;

  constructor(private http: HttpClient) {}

  getAllQuestions(): Observable<any> {
    if (!this.questions$) {
      this.questions$ = this.http.get<any>(this.questionsUrl).pipe(shareReplay(1));
    }
    return this.questions$;
  }

  // For future: getQuestionsForJobType(jobType: string): Observable<any> { ... }
}