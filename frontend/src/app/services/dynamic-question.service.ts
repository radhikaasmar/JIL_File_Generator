import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DynamicQuestionService {
  private questionsUrl = 'assets/question-bank.json';
  private questions$?: Observable<any>;

  constructor(private http: HttpClient) {}

  getAllQuestions(): Observable<any> {
    if (!this.questions$) {
      this.questions$ = this.http.get<any>(this.questionsUrl).pipe(shareReplay(1));
    }
    return this.questions$;
  }

  getQuestionById(id: string): Observable<any> {
    return this.getAllQuestions().pipe(
      map(questionBank => {
        const question = questionBank.questions.find((q: any) => q.id === id);
        if (!question) {
          throw new Error(`Question with id ${id} not found`);
        }
        return question;
      })
    );
  }

  getQuestionsByIds(ids: string[]): Observable<any[]> {
    return this.getAllQuestions().pipe(
      map(questionBank => {
        const questionMap = questionBank.questions.reduce((map: any, q: any) => {
          map[q.id] = q;
          return map;
        }, {});
        
        return ids.map(id => questionMap[id]).filter(q => q);
      })
    );
  }
}
