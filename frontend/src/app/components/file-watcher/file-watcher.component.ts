import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormService } from '../../services/form.service';

@Component({
  selector: 'app-file-watcher',
  templateUrl: './file-watcher.component.html',
  styleUrl: './file-watcher.component.css',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class FileWatcherComponent {
  @Input() fileWatcherForm!: FormGroup;
  @Input() namingConvention: string = '';
  @Output() formChange = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  collapsed = false;

  constructor(private formService: FormService) {}

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
    const defaultForm = this.formService.createFileWatcherForm();
    this.fileWatcherForm.reset(defaultForm.getRawValue());
  }
} 