import { Component, OnInit } from '@angular/core';
import { DynamicQuestionService } from '../services/dynamic-question.service';
import { DynamicFormBuilderService } from '../services/dynamic-form-builder.service';
import { FormGroup } from '@angular/forms';
import { DynamicFormViewerComponent } from '../components/dynamic-form-viewer/dynamic-form-viewer.component';
import { RouterModule } from '@angular/router'; //for routerLink

@Component({
  selector: 'app-dynamic-form-page',
  templateUrl: './dynamic-form-page.component.html',
  standalone: true,
  imports: [DynamicFormViewerComponent,RouterModule]
})
export class DynamicFormPageComponent implements OnInit {
  sections: any[] = [];
  form!: FormGroup;

  constructor(
    private questionService: DynamicQuestionService,
    private formBuilder: DynamicFormBuilderService
  ) {}

  ngOnInit() {
    this.questionService.getAllQuestions().subscribe(sections => {
      this.sections = sections;
      this.form = this.formBuilder.buildForm(sections);
    });
  }
}