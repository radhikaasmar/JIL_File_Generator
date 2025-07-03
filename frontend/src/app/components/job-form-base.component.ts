import { Directive, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, FormArray, FormControl } from '@angular/forms';

@Directive()
export abstract class JobFormBaseComponent {
  @Input() jobForm!: FormGroup;
  @Output() formChange = new EventEmitter<void>();

  collapsed = true;
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


  logicOptions = [
    { value: '', label: '(none)' },
    { value: 'AND', label: 'AND' },
    { value: 'OR', label: 'OR' }
  ];

  timezoneOptions = [
    { value: 'us central', label: 'US CENTRAL' },
    { value: 'us eastern', label: 'US EASTERN' }
  ];

  toggleCollapse() {
    this.collapsed = !this.collapsed;
  }

  onFormChange() {
    this.formChange.emit();
  }

  clearForm() {
    if (confirm('Are you sure you want to clear all form data?')) {
      Object.keys(this.jobForm.controls).forEach(key => {
        const control = this.jobForm.get(key);
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

  get conditions(): FormArray {
    return this.jobForm.get('conditions') as FormArray;
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

  isDaySelected(day: string): boolean {
    const days = this.jobForm.get('days_of_week')?.value || [];
    return days.includes(day);
  }

  isEnvironmentSelected(envKey: string): boolean {
    return this.jobForm.get(envKey)?.value === true;
  }
}
