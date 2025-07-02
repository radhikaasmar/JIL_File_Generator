import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormService } from '../../services/form.service';

@Component({
  selector: 'app-ingestion-job',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ingestion-job.component.html',
  styleUrl: './ingestion-job.component.css'
})
export class IngestionJobComponent implements OnInit {
  @Input() ingestionJobForm!: FormGroup;
  @Input() boxJobNaming: string = '';
  @Output() formChange = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  collapsed = false;
  insertJob = '';
  boxName = '';
  condition = '';

  constructor(private formService: FormService) {}

  ngOnInit() {
    this.updateAutoFields();
    this.ingestionJobForm.valueChanges.subscribe(() => this.updateAutoFields());
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
    const defaultForm = this.formService.createIngestionJobForm();
    this.ingestionJobForm.reset(defaultForm.getRawValue());
  }
} 