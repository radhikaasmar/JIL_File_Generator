import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormService } from '../../services/form.service';

@Component({
  selector: 'app-cfw-job',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cfw-job.component.html',
  styleUrl: './cfw-job.component.css'
})
export class CfwJobComponent implements OnInit {
  @Input() cfwJobForm!: FormGroup;
  @Input() boxJobNaming: string = '';
  @Output() formChange = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  collapsed = false;
  insertJob = '';
  boxName = '';
  condition = '';
  ingestionJobForm: FormGroup;

  constructor(private formService: FormService, private formBuilder: FormBuilder) {
    this.ingestionJobForm = this.formBuilder.group({
      // define your form controls here, e.g.:
      // fieldName: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.updateAutoFields();
    this.cfwJobForm.valueChanges.subscribe(() => this.updateAutoFields());
  }

  updateAutoFields() {
    const parts = this.boxJobNaming.split('_');
    this.insertJob = parts.slice(0, -1).concat('BOX').join('_');
    this.boxName = this.insertJob;
    this.condition = `s(${this.insertJob})`;
  }

  toggleCollapse() {
    this.collapsed = !this.collapsed;
  }

  onFormChange() {
    this.formChange.emit();
  }

  onDelete() {
    this.delete.emit();
  }

  clearForm() {
    const defaultForm = this.formService.createCfwJobForm();
    this.cfwJobForm.reset(defaultForm.getRawValue());
  }
}
