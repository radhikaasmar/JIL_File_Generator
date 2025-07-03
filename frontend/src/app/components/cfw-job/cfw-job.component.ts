import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, FormArray, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormService } from '../../services/form.service';

@Component({
  selector: 'app-cfw-job',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cfw-job.component.html',
  styleUrls: ['../../styles.css']
})
export class CfwJobComponent implements OnInit {
  @Input() cfwJobForm!: FormGroup;
  @Input() boxJobNaming: string = '';
  @Output() formChange = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  collapsed = false;
  validationErrors: { [key: string]: string } = {};

  // Days of week options
  daysOfWeek = [
    { value: 'su', label: 'Sunday', short: 'Su' },
    { value: 'mo', label: 'Monday', short: 'Mo' },
    { value: 'tu', label: 'Tuesday', short: 'Tu' },
    { value: 'wd', label: 'Wednesday', short: 'Wd' },
    { value: 'th', label: 'Thursday', short: 'Th' },
    { value: 'fr', label: 'Friday', short: 'Fr' },
    { value: 'sa', label: 'Saturday', short: 'Sa' }
  ];

  // Environment options
  environments = [
    { key: 'envUAT', label: 'UAT', owner: 'ownerUAT' },
    { key: 'envDEV', label: 'DEV', owner: 'ownerDEV' },
    { key: 'envPROD', label: 'PROD', owner: 'ownerPROD' },
    { key: 'envCOB', label: 'COB', owner: 'ownerCOB' }
  ];

  // Dropdown options
  effortTypeOptions = [
    { value: 'reg', label: 'REG' },
    { value: 'bau', label: 'BAU' }
  ];

  prodLobOptions = [
    { value: 'dep', label: 'DEP' },
    { value: 'bcd', label: 'BCD' },
    { value: 'crs', label: 'CRS' },
    { value: 'mtg', label: 'MTG' },
    { value: 'inv', label: 'INV' },
    { value: 'pln', label: 'PLN' },
    { value: 'xlob', label: 'XLOB' }
  ];

  loadFreqOptions = [
    { value: 'd', label: 'Daily (D)' },
    { value: 'w', label: 'Weekly (W)' },
    { value: 'm', label: 'Monthly (M)' },
    { value: 'c', label: 'Custom (C)' }
  ];

  loadLayerOptions = [
    { value: 'stg', label: 'STG' },
    { value: 'std', label: 'STD' },
    { value: 'ext', label: 'EXT' }
  ];

  functionOfJobOptions = [
    { value: 'master', label: 'MASTER' },
    { value: 'ing', label: 'ING' },
    { value: 'dq', label: 'DQ' },
    { value: 'ext', label: 'EXT' },
    { value: 'ld', label: 'LD' },
    { value: 'ndm', label: 'NDM' },
    { value: 'pg', label: 'PG' },
    { value: 'rp', label: 'RP' },
    { value: 'rv', label: 'RV' },
    { value: 're', label: 'RE' },
    { value: 'cs', label: 'CS' },
    { value: 'purge', label: 'PURGE' },
    { value: 'pub', label: 'PUB' },
    { value: 'drv', label: 'DRV' }
  ];

  jobTypeOptions = [
    { value: 'fw', label: 'FW' },
    { value: 'cfw', label: 'CFW' },
    { value: 'cmd', label: 'CMD' },
    { value: 'box', label: 'BOX' }
  ];

  conditionTypeOptions = [
    { value: 'success', label: 'success' },
    { value: 'failure', label: 'failure' },
    { value: 'terminated', label: 'terminated' },
    { value: 'done', label: 'done' },
    { value: 'notrunning', label: 'notrunning' },
    { value: 'started', label: 'started' }
  ];

  logicOptions = [
    { value: '', label: '(none)' },
    { value: 'AND', label: 'AND' },
    { value: 'OR', label: 'OR' }
  ];

  timezoneOptions = [
    { value: 'us central', label: 'US CENTRAL' },
    { value: 'us eastern', label: 'US EASTERN' }
  ];

  constructor(private formService: FormService) {}

  ngOnInit() {
    this.initializeFormControls();
    this.setupFormValidation();
    this.setupFormSubscriptions();
  }

  private initializeFormControls() {
    // Ensure all required fields are present
    const requiredFields = [
      'csi', 'efforttype', 'prodlob', 'purpose', 'loadfreq', 'loadlayer', 'funofjob', 'jobtitle'
    ];
    requiredFields.forEach(field => {
      if (!this.cfwJobForm.contains(field)) {
        this.cfwJobForm.addControl(field, new FormControl(''));
      }
    });

    this.environments.forEach(env => {
      if (!this.cfwJobForm.contains(env.key)) {
        this.cfwJobForm.addControl(env.key, new FormControl(false));
      }
      if (!this.cfwJobForm.contains(env.owner)) {
        this.cfwJobForm.addControl(env.owner, new FormControl(''));
      }
    });

    if (!this.cfwJobForm.contains('conditions')) {
      this.cfwJobForm.addControl('conditions', new FormArray([this.createCondition()]));
    }

    const otherControls = [
      'permission',
      'date_conditions',
      'days_of_week',
      'start_time',
      'description',
      'alarm_if_fail',
      'alarm_if_terminated',
      'timezone',
      'status'
    ];

    otherControls.forEach(ctrl => {
      if (!this.cfwJobForm.contains(ctrl)) {
        const defaultValue = ctrl === 'days_of_week' ? [] :
                           ctrl === 'date_conditions' || ctrl === 'alarm_if_fail' || ctrl === 'alarm_if_terminated' ? 1 :
                           ctrl === 'timezone' ? 'us central' : '';
        this.cfwJobForm.addControl(ctrl, new FormControl(defaultValue));
      }
    });
  }

  private setupFormValidation() {
    const requiredFields = ['csi', 'efforttype', 'prodlob', 'purpose', 'loadfreq', 'loadlayer', 'funofjob', 'jobtitle'];

    requiredFields.forEach(fieldName => {
      const control = this.cfwJobForm.get(fieldName);
      if (control) {
        if (fieldName === 'csi') {
          control.setValidators([Validators.required, Validators.pattern(/^\d{6}$/)]);
        } else {
          control.setValidators([Validators.required]);
        }
      }
    });
  }

  private setupFormSubscriptions() {
    this.environments.forEach(env => {
      this.cfwJobForm.get(env.key)?.valueChanges.subscribe(checked => {
        const ownerControl = this.cfwJobForm.get(env.owner);
        if (ownerControl) {
          if (checked) {
            ownerControl.setValidators([Validators.required]);
          } else {
            ownerControl.clearValidators();
            ownerControl.setValue('');
          }
          ownerControl.updateValueAndValidity();
        }
      });
    });
  }

  toggleCollapse() {
    this.collapsed = !this.collapsed;
  }

  onFormChange() {
    this.formChange.emit();
  }

  clearForm() {
    if (confirm('Are you sure you want to clear all form data?')) {
      Object.keys(this.cfwJobForm.controls).forEach(key => {
        const control = this.cfwJobForm.get(key);
        if (control) {
          if (key === 'conditions') {
            const conditionsArray = control as FormArray;
            conditionsArray.clear();
            conditionsArray.push(this.createCondition());
          } else if (key === 'days_of_week') {
            control.setValue([]);
          } else if (key.startsWith('env')) {
            control.setValue(false);
          } else if (key === 'date_conditions' || key === 'alarm_if_fail' || key === 'alarm_if_terminated') {
            control.setValue(1);
          } else if (key === 'timezone') {
            control.setValue('us central');
          } else {
            control.setValue('');
          }
        }
      });

      this.validationErrors = {};
      this.onFormChange();
    }
  }

  get integratedJobValue(): string {
    if (!this.cfwJobForm){
      console.log("this.cfwJobForm is not working");
      return '';}

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

    const values = fields
      .map(f => this.cfwJobForm.get(f)?.value || '')
      .filter(v => v !== '')
      .map(v => v.toString().toUpperCase());

    return values.join('_') || 'Job name will appear here';
  }

  toBool(val: any): boolean {
    return val === true || val === 'true' || val === 1 || val === '1';
  }

  get conditions(): FormArray {
    return this.cfwJobForm.get('conditions') as FormArray;
  }

  createCondition(): FormGroup {
    return new FormGroup({
      type: new FormControl('success'),
      job: new FormControl(''),
      logic: new FormControl('')
    });
  }

  addCondition(): void {
    this.conditions.push(this.createCondition());
    this.onFormChange();
  }

  removeCondition(index: number): void {
    if (this.conditions.length > 1) {
      this.conditions.removeAt(index);
      this.onFormChange();
    }
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
    if (this.conditions.length === 0) return 'No conditions defined';

    return this.conditions.controls
      .map((ctrl, idx) => {
        const type = ctrl.get('type')?.value;
        const job = ctrl.get('job')?.value;
        const logic = ctrl.get('logic')?.value;

        if (!job || !type) return '';

        let conditionStr = `${type}(${job})`;
        if (logic && idx < this.conditions.length - 1) {
          conditionStr += ` ${logic} `;
        }
        return conditionStr;
      })
      .filter(str => str !== '')
      .join('') || 'No conditions defined';
  }

  onDayOfWeekChange(event: any) {
    const value = event.target.value;
    const checked = event.target.checked;
    const ctrl = this.cfwJobForm.get('days_of_week');
    let days = ctrl?.value || [];

    if (checked) {
      if (!days.includes(value)) {
        days = [...days, value];
      }
    } else {
      days = days.filter((v: string) => v !== value);
    }

    ctrl?.setValue(days);
    this.onFormChange();
  }

  isDaySelected(day: string): boolean {
    const days = this.cfwJobForm.get('days_of_week')?.value || [];
    return days.includes(day);
  }

  isEnvironmentSelected(envKey: string): boolean {
    return this.cfwJobForm.get(envKey)?.value === true;
  }

  validateForm(): boolean {
    this.validationErrors = {};

    const requiredFields = ['csi', 'efforttype', 'prodlob', 'purpose', 'loadfreq', 'loadlayer', 'funofjob', 'jobtitle'];

    requiredFields.forEach(fieldName => {
      const control = this.cfwJobForm.get(fieldName);
      if (control && (!control.value || control.value.toString().trim() === '')) {
        this.validationErrors[fieldName] = 'This field is required';
      }
    });

    const csiControl = this.cfwJobForm.get('csi');
    if (csiControl && csiControl.value && !/^\d{6}$/.test(csiControl.value)) {
      this.validationErrors['csi'] = 'CSI must be exactly 6 digits';
    }

    this.environments.forEach(env => {
      if (this.isEnvironmentSelected(env.key)) {
        const ownerControl = this.cfwJobForm.get(env.owner);
        if (!ownerControl?.value || ownerControl.value.trim() === '') {
          this.validationErrors[env.owner] = `Owner is required for ${env.label} environment`;
        }
      }
    });

    return Object.keys(this.validationErrors).length === 0;
  }

  getFieldError(fieldName: string): string | null {
    return this.validationErrors[fieldName] || null;
  }

  hasFieldError(fieldName: string): boolean {
    return !!this.validationErrors[fieldName];
  }

  onSubmit(): void {
    if (this.validateForm()) {
      // Form is valid, emit the form data or handle submission
      console.log('Form submitted:', this.cfwJobForm.value);
      alert('Job definition generated successfully!');
    } else {
      alert('Please fix the validation errors before submitting.');
    }
  }

  onDelete() {
    this.delete.emit();
  }
}
