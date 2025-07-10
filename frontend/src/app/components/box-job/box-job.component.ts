import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, FormArray, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormService } from '../../services/form.service';

@Component({
  selector: 'app-box-job',
  templateUrl: './box-job.component.html',
  styleUrls: ['../../styles.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class BoxJobComponent implements OnInit {
  @Input() boxJobForm!: FormGroup;
  @Input() namingConvention: string = '';
  @Output() formChange = new EventEmitter<void>();

  collapsed = true; // Start collapsed by default
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
    // Initialize environment controls
    this.environments.forEach(env => {
      if (!this.boxJobForm.contains(env.key)) {
        this.boxJobForm.addControl(env.key, new FormControl(false));
      }
      if (!this.boxJobForm.contains(env.owner)) {
        this.boxJobForm.addControl(env.owner, new FormControl(''));
      }
    });

    // Initialize conditions array
    if (!this.boxJobForm.contains('conditions')) {
      this.boxJobForm.addControl('conditions', new FormArray([this.createCondition()]));
    }

    // Initialize other required controls
    const requiredControls = [
      'permission',
      'date_conditions',
      'days_of_week',
      'start_time', // ensure this is present
      'timezone',   // ensure this is present
      'description',
      'alarm_if_fail',
      'alarm_if_terminated',
      'status'
    ];

    requiredControls.forEach(ctrl => {
      if (!this.boxJobForm.contains(ctrl)) {
        const defaultValue = ctrl === 'days_of_week' ? [] :
                           ctrl === 'date_conditions' || ctrl === 'alarm_if_fail' || ctrl === 'alarm_if_terminated' ? 1 :
                           ctrl === 'timezone' ? 'us central' : '';
        this.boxJobForm.addControl(ctrl, new FormControl(defaultValue));
      }
    });
  }

  private setupFormValidation() {
    // Add validators to required fields
    const requiredFields = ['csi', 'efforttype', 'prodlob', 'purpose', 'loadfreq', 'loadlayer', 'funofjob', 'jobtitle'];

    requiredFields.forEach(fieldName => {
      const control = this.boxJobForm.get(fieldName);
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
    // Subscribe to environment checkbox changes to handle owner field validation
    this.environments.forEach(env => {
      this.boxJobForm.get(env.key)?.valueChanges.subscribe(checked => {
        const ownerControl = this.boxJobForm.get(env.owner);
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
      // Reset all controls to their default values
      Object.keys(this.boxJobForm.controls).forEach(key => {
        const control = this.boxJobForm.get(key);
        if (control) {
          if (key === 'conditions') {
            // Reset conditions array to single empty condition
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

    // Get all values as uppercase strings
    const values = fields.map(f => this.boxJobForm.get(f)?.value || '').map(v => v.toString().toUpperCase());

    // If purpose is empty, just join and return
    if (!values[3]) {
      return values.filter(v => v !== '').join('_') || 'Job name will appear here';
    }

    // Calculate the job name with current values
    let jobName = values.filter(v => v !== '').join('_');

    // If jobName is too long, truncate only the purpose field
    if (jobName.length > 64) {
      // Find the index of 'purpose' in fields (which is 3)
      const purposeIdx = 3;
      // Remove purpose temporarily to get base length
      const valuesWithoutPurpose = [...values];
      valuesWithoutPurpose[purposeIdx] = '';
      const baseName = valuesWithoutPurpose.filter(v => v !== '').join('_');
      // Number of underscores in the final name
      const underscores = values.filter(v => v !== '').length - 1;
      // Max allowed length for purpose
      const baseLength = baseName.length;
      const needsUnderscore = baseName.length > 0 && values[purposeIdx].length > 0;
      const maxPurposeLength = 64 - baseLength - (needsUnderscore ? 1 : 0);
      // Truncate purpose
      const truncatedPurpose = values[purposeIdx].slice(0, Math.max(0, maxPurposeLength));
      values[purposeIdx] = truncatedPurpose;
      jobName = values.filter(v => v !== '').join('_');
    }

    return jobName || 'Job name will appear here';
  }

  get isJobNameTruncated(): boolean {
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
    const values = fields.map(f => this.boxJobForm.get(f)?.value || '').map(v => v.toString().toUpperCase());
    if (!values[3]) return false; // if purpose is empty, never truncated
    const originalJobName = values.filter(v => v !== '').join('_');
    return originalJobName.length > 64;
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
      // Remove conditions after the current one if logic is cleared
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
    this.onFormChange();
  }

  isDaySelected(day: string): boolean {
    const days = this.boxJobForm.get('days_of_week')?.value || [];
    return days.includes(day);
  }

  isEnvironmentSelected(envKey: string): boolean {
    return this.boxJobForm.get(envKey)?.value === true;
  }

  validateForm(): boolean {
    this.validationErrors = {};

    // Validate required fields
    const requiredFields = ['csi', 'efforttype', 'prodlob', 'purpose', 'loadfreq', 'loadlayer', 'funofjob', 'jobtitle'];

    requiredFields.forEach(fieldName => {
      const control = this.boxJobForm.get(fieldName);
      if (control && (!control.value || control.value.toString().trim() === '')) {
        this.validationErrors[fieldName] = 'This field is required';
      }
    });

    // Validate CSI format
    const csiControl = this.boxJobForm.get('csi');
    if (csiControl && csiControl.value && !/^\d{6}$/.test(csiControl.value)) {
      this.validationErrors['csi'] = 'CSI must be exactly 6 digits';
    }

    // Validate environment owners
    this.environments.forEach(env => {
      if (this.isEnvironmentSelected(env.key)) {
        const ownerControl = this.boxJobForm.get(env.owner);
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
      console.log('Form submitted:', this.boxJobForm.value);
      alert('Job definition generated successfully!');
    } else {
      alert('Please fix the validation errors before submitting.');
    }
  }
}



