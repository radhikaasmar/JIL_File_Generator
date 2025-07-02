import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, FormArray } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormService } from '../../services/form.service';

@Component({
  selector: 'app-box-job',
  templateUrl: './box-job.component.html',
  styleUrl: './box-job.component.css',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class BoxJobComponent implements OnInit {
  @Input() boxJobForm!: FormGroup;
  @Input() namingConvention: string = '';
  @Output() formChange = new EventEmitter<void>();

  collapsed = false;

  constructor(private formService: FormService) {}

  ngOnInit() {
    const envFields = [
      { key: 'envUAT', owner: 'ownerUAT' },
      { key: 'envDEV', owner: 'ownerDEV' },
      { key: 'envPROD', owner: 'ownerPROD' },
      { key: 'envCOB', owner: 'ownerCOB' }
    ];
    envFields.forEach(field => {
      if (!this.boxJobForm.contains(field.key)) {
        this.boxJobForm.addControl(field.key, new FormControl(false));
      }
      if (!this.boxJobForm.contains(field.owner)) {
        this.boxJobForm.addControl(field.owner, new FormControl(''));
      }
    });

    if (!this.boxJobForm.contains('conditions')) {
      this.boxJobForm.addControl('conditions', new FormArray([this.createCondition()]));
    }

    // Ensure 'permission' and other new controls exist
    const requiredControls = [
      'permission',
      'date_conditions',
      'days_of_week',
      'start_time',
      'description',
      'alarm_if_fail',
      'alarm_if_terminated'
    ];
    requiredControls.forEach(ctrl => {
      if (!this.boxJobForm.contains(ctrl)) {
        this.boxJobForm.addControl(ctrl, new FormControl(
          ctrl === 'days_of_week' ? [] : ''
        ));
      }
    });
  }

  toggleCollapse() {
    this.collapsed = !this.collapsed;
  }

  onFormChange() {
    this.formChange.emit();
  }

  clearForm() {
    const defaultForm = this.formService.createBoxJobForm();
    this.boxJobForm.reset(defaultForm.getRawValue());
    this.onFormChange();
  }

  get integratedJobValue(): string {
    if (!this.boxJobForm) return '';
    const fields = [
      'csi',
      'efforttype',
      'prodlob',
      'purpose',
      'loadfreq',
      'loadlayer',
      'funofjob',
      'jobtitle'
    ];
    return fields.map(f => this.boxJobForm.get(f)?.value || '').join('_');
  }

  toBool(val: any): boolean {
    return val === true || val === 'true' || val === 1 || val === '1';
  }

  get conditions(): FormArray {
    return this.boxJobForm.get('conditions') as FormArray;
  }

  createCondition(): FormGroup {
    return new FormGroup({
      type: new FormControl('success'),
      job: new FormControl(''),
      logic: new FormControl('')
    });
  }

  addConditionIfNeeded(index: number): void {
    const current = this.conditions.at(index);
    const logic = current.get('logic')?.value;

    const isLast = index === this.conditions.length - 1;

    if ((logic === 'AND' || logic === 'OR') && isLast) {
      this.conditions.push(this.createCondition());
    } else if (!logic && !isLast) {
      while (this.conditions.length > index + 1) {
        this.conditions.removeAt(this.conditions.length - 1);
      }
    }

    this.onFormChange();
  }

  get finalConditionString(): string {
    return this.conditions.controls
      .map((ctrl, idx) => {
        const type = ctrl.get('type')?.value;
        const job = ctrl.get('job')?.value;
        const logic = ctrl.get('logic')?.value;
        const logicPart = logic && idx < this.conditions.length - 1 ? ` ${logic} ` : '';
        return `${type}(${job})${logicPart}`;
      })
      .join('');
  }

  onDayOfWeekChange(event: any) {
    const value = event.target.value;
    const checked = event.target.checked;
    const ctrl = this.boxJobForm.get('days_of_week');
    let days = ctrl?.value || [];
    if (checked) {
      if (!days.includes(value)) {
        days = [...days, value];
      }
    } else {
      days = days.filter((v: string) => v !== value);
    }
    ctrl?.setValue(days);
  }
}



