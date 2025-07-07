import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-dynamic-form-viewer',
  templateUrl: './dynamic-form-viewer.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class DynamicFormViewerComponent {
  @Input() sections: any[] = [];
  @Input() form!: FormGroup;
}