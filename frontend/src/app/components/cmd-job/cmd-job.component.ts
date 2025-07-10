import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormService } from '../../services/form.service';
import { FormArray, FormControl } from '@angular/forms';

@Component({
  selector: 'app-cmd-job',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cmd-job.component.html',
  styleUrls: ['../../styles.css']
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

  // Fields/options from box-job
  validationErrors: { [key: string]: string } = {};

  daysOfWeek = [
    { value: 'su', label: 'Sunday', short: 'Su' },
    { value: 'mo', label: 'Monday', short: 'Mo' },
    { value: 'tu', label: 'Tuesday', short: 'Tu' },
    { value: 'wd', label: 'Wednesday', short: 'Wd' },
    { value: 'th', label: 'Thursday', short: 'Th' },
    { value: 'fr', label: 'Friday', short: 'Fr' },
    { value: 'sa', label: 'Saturday', short: 'Sa' }
  ];

  environments = [
    { key: 'envUAT', label: 'UAT', owner: 'ownerUAT', machine: 'machineUAT', command: 'commandUAT' },
    { key: 'envDEV', label: 'DEV', owner: 'ownerDEV', machine: 'machineDEV', command: 'commandDEV' },
    { key: 'envPROD', label: 'PROD', owner: 'ownerPROD', machine: 'machinePROD', command: 'commandPROD' },
    { key: 'envCOB', label: 'COB', owner: 'ownerCOB', machine: 'machineCOB', command: 'commandCOB' }
  ];

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
    // this.updateAutoFields();
    // this.cmdJobForm.valueChanges.subscribe(() => this.updateAutoFields());
    this.initializeFormControls();
    this.setupFormValidation();
    this.setupFormSubscriptions();
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

  // --- Copied logic from box-job.component.ts ---
  private initializeFormControls() {
    this.environments.forEach(env => {
      if (!this.cmdJobForm.contains(env.key)) {
        this.cmdJobForm.addControl(env.key, new FormControl(false));
      }
      if (!this.cmdJobForm.contains(env.owner)) {
        this.cmdJobForm.addControl(env.owner, new FormControl(''));
      }
      if (!this.cmdJobForm.contains(env.machine)) {
        this.cmdJobForm.addControl(env.machine, new FormControl(''));
      }
      if (!this.cmdJobForm.contains(env.command)) {
        this.cmdJobForm.addControl(env.command, new FormControl(''));
      }
    });

    if (!this.cmdJobForm.contains('conditions')) {
      this.cmdJobForm.addControl('conditions', new FormArray([this.createCondition()]));
    }

    const requiredControls = [
      'csi',
      'efforttype',
      'prodlob',
      'purpose',
      'loadfreq',
      'loadlayer',
      'funofjob',
      'jobtitle',
      'permission',
      'date_conditions',
      'days_of_week',
      'start_time',
      'timezone',
      'description',
      'alarm_if_fail',
      'alarm_if_terminated',
      'status'
    ];

    requiredControls.forEach(ctrl => {
      if (!this.cmdJobForm.contains(ctrl)) {
        const defaultValue = ctrl === 'days_of_week' ? [] :
          ctrl === 'date_conditions' || ctrl === 'alarm_if_fail' || ctrl === 'alarm_if_terminated' ? 1 :
          ctrl === 'timezone' ? 'us central' : '';
        this.cmdJobForm.addControl(ctrl, new FormControl(defaultValue));
      }
    });
  }

  private setupFormValidation() {
    const requiredFields = ['csi', 'efforttype', 'prodlob', 'purpose', 'loadfreq', 'loadlayer', 'funofjob', 'jobtitle'];
    requiredFields.forEach(fieldName => {
      const control = this.cmdJobForm.get(fieldName);
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
      this.cmdJobForm.get(env.key)?.valueChanges.subscribe(checked => {
        const ownerControl = this.cmdJobForm.get(env.owner);
        const machineControl = this.cmdJobForm.get(env.machine);
        const commandControl = this.cmdJobForm.get(env.command);

        if (ownerControl) {
          if (checked) {
            ownerControl.setValidators([Validators.required]);
          } else {
            ownerControl.clearValidators();
            ownerControl.setValue('');
          }
          ownerControl.updateValueAndValidity();
        }

        if (machineControl) {
          if (checked) {
            machineControl.setValidators([Validators.required]);
          } else {
            machineControl.clearValidators();
            machineControl.setValue('');
          }
          machineControl.updateValueAndValidity();
        }

        if (commandControl) {
          if (checked) {
            commandControl.setValidators([Validators.required]);
          } else {
            commandControl.clearValidators();
            commandControl.setValue('');
          }
          commandControl.updateValueAndValidity();
        }
      });
    });
  }

  get integratedJobValue(): string {
    if (!this.cmdJobForm) return '';
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
      .map(f => this.cmdJobForm.get(f)?.value || '')
      .filter(v => v !== '')
      .map(v => v.toString().toUpperCase());
    return values.join('_') || 'Job name will appear here';
  }

  toBool(val: any): boolean {
    return val === true || val === 'true' || val === 1 || val === '1';
  }

  get conditions(): FormArray {
    return this.cmdJobForm.get('conditions') as FormArray;
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
    const ctrl = this.cmdJobForm.get('days_of_week');
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
    const days = this.cmdJobForm.get('days_of_week')?.value || [];
    return days.includes(day);
  }

  isEnvironmentSelected(envKey: string): boolean {
    return this.cmdJobForm.get(envKey)?.value === true;
  }

  validateForm(): boolean {
    this.validationErrors = {};
    const requiredFields = ['csi', 'efforttype', 'prodlob', 'purpose', 'loadfreq', 'loadlayer', 'funofjob', 'jobtitle'];
    requiredFields.forEach(fieldName => {
      const control = this.cmdJobForm.get(fieldName);
      if (control && (!control.value || control.value.toString().trim() === '')) {
        this.validationErrors[fieldName] = 'This field is required';
      }
    });
    const csiControl = this.cmdJobForm.get('csi');
    if (csiControl && csiControl.value && !/^\d{6}$/.test(csiControl.value)) {
      this.validationErrors['csi'] = 'CSI must be exactly 6 digits';
    }
    this.environments.forEach(env => {
      if (this.isEnvironmentSelected(env.key)) {
        const ownerControl = this.cmdJobForm.get(env.owner);
        if (!ownerControl?.value || ownerControl.value.trim() === '') {
          this.validationErrors[env.owner] = `Owner is required for ${env.label} environment`;
        }
        const machineControl = this.cmdJobForm.get(env.machine);
        if (!machineControl?.value || machineControl.value.trim() === '') {
          this.validationErrors[env.machine] = `Machine is required for ${env.label} environment`;
        }
        const commandControl = this.cmdJobForm.get(env.command);
        if (!commandControl?.value || commandControl.value.trim() === '') {
          this.validationErrors[env.command] = `Command is required for ${env.label} environment`;
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
      console.log('Form submitted:', this.cmdJobForm.value);
      alert('Job definition generated successfully!');
    } else {
      alert('Please fix the validation errors before submitting.');
    }
  }

  clearForm() {
    const defaultForm = this.formService.createCmdJobForm();
    this.cmdJobForm.reset(defaultForm.getRawValue());
    // Also reset new fields
    Object.keys(this.cmdJobForm.controls).forEach(key => {
      const control = this.cmdJobForm.get(key);
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
