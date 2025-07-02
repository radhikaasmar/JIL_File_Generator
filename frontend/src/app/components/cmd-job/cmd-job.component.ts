import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormService } from '../../services/form.service';

@Component({
  selector: 'app-cmd-job',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cmd-job.component.html',
  styleUrls: ['./cmd-job.component.css']
})
export class CmdJobComponent implements OnInit {
  @Input() cmdJobForm!: FormGroup;
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
    this.cmdJobForm.valueChanges.subscribe(() => this.updateAutoFields());
  }

  updateAutoFields() {
    // insert_job: same as boxJobNaming, but last value after _ is BOX
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
    const defaultForm = this.formService.createCmdJobForm();
    this.cmdJobForm.reset(defaultForm.getRawValue());
  }
}
