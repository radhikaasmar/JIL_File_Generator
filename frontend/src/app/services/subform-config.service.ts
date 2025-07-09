import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { DynamicQuestionService } from './dynamic-question.service';

export interface SubformConfig {
  subformType: string;
  displayName: string;
  allowMultiple: boolean;
  sections: {
    title: string;
    questionIds: string[];
  }[];
}

export interface ResolvedSubformConfig {
  subformType: string;
  displayName: string;
  allowMultiple: boolean;
  sections: {
    title: string;
    questions: any[];
  }[];
}

@Injectable({ providedIn: 'root' })
export class SubformConfigService {
  private configUrls = {
    top: 'assets/top-subform.json',
    box: 'assets/box-subform.json',
    cmd: 'assets/cmd-subform.json',
    cfw: 'assets/cfw-subform.json',
    fw: 'assets/fw-subform.json'
  };

  constructor(
    private http: HttpClient,
    private questionService: DynamicQuestionService
  ) {}

  loadSubformConfig(type: string): Observable<SubformConfig> {
    const url = this.configUrls[type as keyof typeof this.configUrls];
    if (!url) {
      throw new Error(`Unknown subform type: ${type}`);
    }
    return this.http.get<SubformConfig>(url);
  }

  loadAllSubformConfigs(): Observable<{[key: string]: SubformConfig}> {
    const requests = Object.keys(this.configUrls).reduce((acc, key) => {
      acc[key] = this.loadSubformConfig(key);
      return acc;
    }, {} as {[key: string]: Observable<SubformConfig>});

    return forkJoin(requests);
  }

  resolveSubformConfig(config: SubformConfig): Observable<ResolvedSubformConfig> {
    return this.questionService.getAllQuestions().pipe(
      map(questionBank => {
        const questions = questionBank.questions;
        const questionMap = questions.reduce((map: any, q: any) => {
          map[q.id] = q;
          return map;
        }, {});

        const resolvedSections = config.sections.map(section => ({
          title: section.title,
          questions: section.questionIds.map(id => questionMap[id]).filter(q => q)
        }));

        return {
          subformType: config.subformType,
          displayName: config.displayName,
          allowMultiple: config.allowMultiple,
          sections: resolvedSections
        };
      })
    );
  }
}
