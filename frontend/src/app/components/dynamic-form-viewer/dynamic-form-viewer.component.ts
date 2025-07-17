import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormArray, FormControl, AbstractControl } from '@angular/forms';
import { DynamicFormBuilderService, SubformInstance } from '../../services/dynamic-form-builder.service';
import { EnvironmentStateService } from '../../services/environment-state.service';
import { DaysOfWeekService } from '../../services/days-of-week.service';
import { LoadFrequencyService } from '../../services/load-frequency.service';
import { Subscription } from 'rxjs';
import { CalendarService, CustomCalendar } from '../../services/calendar.service';
import { CalendarPopupComponent } from '../calendar-popup/calendar-popup.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dynamic-form-viewer',
  templateUrl: './dynamic-form-viewer.component.html',
  standalone: true,
  styleUrls: ['./dynamic-form-viewer.component.css'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule,CalendarPopupComponent]
})
export class DynamicFormViewerComponent implements OnInit, OnDestroy {
  // For run_calendar UI logic
  selectedCalendarOption: string = '';
  showDropdown: boolean = false;
  predefinedCalendars: string[] = [];
  showCalendarPopup: boolean = false;
  @Input() sections: any[] = [];
  @Input() form!: FormGroup;
  @Input() subformContext?: SubformInstance;
  @Output() formChange = new EventEmitter();
  @Input() jobNameForDisplay?: string;
@Input() isJobNameTruncatedForDisplay?: boolean;

  selectedEnvironments: string[] = [];
  private environmentSubscription?: Subscription;
  private loadFrequencySubscription?: Subscription;
  private currentLoadFrequency: string = '';

  constructor(
    private formBuilder: DynamicFormBuilderService,
    private environmentStateService: EnvironmentStateService,
    private daysOfWeekService: DaysOfWeekService,
    private loadFrequencyService: LoadFrequencyService,
     private calendarService: CalendarService
  ) {}

  ngOnInit() {
    this.environmentSubscription = this.environmentStateService.selectedEnvironments$.subscribe(
      selectedEnvs => {
        this.selectedEnvironments = selectedEnvs;
      }
    );

    // Subscribe to load frequency changes
    this.loadFrequencySubscription = this.loadFrequencyService.loadFrequency$.subscribe(
      frequency => {
        this.currentLoadFrequency = frequency;
      }
    );

    // Initialize load frequency if this form has the control
    const loadFreqControl = this.form?.get('loadfreq');
    if (loadFreqControl && loadFreqControl.value) {
      this.loadFrequencyService.updateLoadFrequency(loadFreqControl.value);
    }

    // Load predefined calendars from JSON
    fetch('assets/calendars.json')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.predefinedCalendars)) {
          this.predefinedCalendars = data.predefinedCalendars;
        }
      });

    // If you want to load from a service, do it here instead of hardcoding
  }

  ngOnDestroy() {
    if (this.environmentSubscription) {
      this.environmentSubscription.unsubscribe();
    }
    if (this.loadFrequencySubscription) {
      this.loadFrequencySubscription.unsubscribe();
    }
  }

  // **NEW: Check if a field should be disabled**
isFieldDisabled(fieldKey: string): boolean {
  if (!this.subformContext) return false;

  // Job type should be fixed for ALL subforms (including box)
  if (fieldKey === 'jobtitle') {
    return true;
  }

  // Function of job should be fixed for all non-box subforms
  if (fieldKey === 'funofjob' && this.subformContext.type !== 'box') {
    return true;
  }

  // Function of box should be editable ONLY for box job types
  if (fieldKey === 'funofbox' && this.subformContext.type !== 'box') {
    return true;
  }

  return false;
}
onCalendarSelected(calendarName: string) {
  const runCalendarControl = this.form.get('run_calendar');
  if (runCalendarControl) {
    runCalendarControl.setValue(calendarName);
  }
  this.onFormChange();
}


getDisabledReason(fieldKey: string): string | null {
  if (!this.subformContext) return null;

  if (fieldKey === 'jobtitle') {
    return 'Job Type is automatically determined by the subform type';
  }

  if (fieldKey === 'funofjob' && this.subformContext.type !== 'box') {
    return 'Function of Job is automatically set based on subform selection';
  }

  if (fieldKey === 'funofbox' && this.subformContext.type !== 'box') {
    return 'Function field is not applicable for this job type';
  }

  return null;
}


shouldShowAsReadonly(fieldKey: string): boolean {
  if (!this.subformContext) return false;

  // Job type is read-only for ALL subforms
  if (fieldKey === 'jobtitle') {
    return true;
  }

  // Function of job is read-only for non-box job types
  if (fieldKey === 'funofjob' && this.subformContext.type !== 'box') {
    return true;
  }

  // Function of box is read-only for non-box job types only
  if (fieldKey === 'funofbox' && this.subformContext.type !== 'box') {
    return true;
  }

  return false;
}



  // **NEW: Get input type based on validators**
  getInputType(question: any): string {
    if (!question.validators) return 'text';

    // Check for numeric pattern validators
    const hasNumericPattern = question.validators.some((validator: any) =>
      validator.type === 'pattern' &&
      (validator.value.includes('[0-9]') || validator.value.includes('\\d'))
    );

    if (hasNumericPattern) {
      return 'text'; // Keep as text to allow pattern validation
    }

    return 'text';
  }

  // **NEW: Get maxlength from validators**
  getMaxLength(question: any): number | null {
    if (question.key === 'csi') return 6; // Specific case

    if (!question.validators) return null;

    const maxLengthValidator = question.validators.find((validator: any) =>
      validator.type === 'maxLength'
    );

    return maxLengthValidator ? maxLengthValidator.value : null;
  }

  // **NEW: Get pattern from validators**
  getPattern(question: any): string  {
    if (question.key === 'csi') return '^\\d{6}$'; // Specific case

    if (!question.validators) return '';

    const patternValidator = question.validators.find((validator: any) =>
      validator.type === 'pattern'
    );

    return patternValidator ? patternValidator.value : '';
  }
  // **NEW: Check if field should be shown as read-only**

  // **NEW: Get display value for read-only fields**
  getDisplayValue(fieldKey: string, question: any): string {
    const value = this.form.get(fieldKey)?.value;
    if (!value) return 'Not set';

    // Find the display label from options
    if (question && question.options) {
      const option = question.options.find((opt: any) => opt.value === value);
      return option ? option.label : value.toString().toUpperCase();
    }

    return value.toString().toUpperCase();
  }

  // **NEW: Get CSS class based on validation state**
  getInputClass(fieldKey: string): string {
    const control = this.form.get(fieldKey);
    if (!control) return '';

    let classes = '';

    if (control.invalid && (control.dirty || control.touched)) {
      classes += ' invalid';
    }

    if (control.valid && control.dirty) {
      classes += ' valid';
    }

    return classes;
  }

  // **NEW: Check if field has validation errors**
  hasValidationError(fieldKey: string): boolean {
    const control = this.form.get(fieldKey);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  // **NEW: Get validation error message**
  getValidationErrorMessage(fieldKey: string, question: any): string {
    const control = this.form.get(fieldKey);
    if (!control || !control.errors) return '';

    const errors = control.errors;

    if (errors['required']) {
      return `${question.label} is required`;
    }

    if (errors['pattern']) {
      return this.getPatternErrorMessage(question);
    }

    if (errors['maxlength']) {
      const maxLength = errors['maxlength'].requiredLength;
      return `${question.label} cannot exceed ${maxLength} characters`;
    }

    if (errors['minlength']) {
      const minLength = errors['minlength'].requiredLength;
      return `${question.label} must be at least ${minLength} characters`;
    }

    return 'Invalid input';
  }

  // **NEW: Get specific pattern error messages**
  private getPatternErrorMessage(question: any): string {
    if (question.key === 'csi') {
      return 'CSI must be exactly 6 digits';
    }

    const patternValidator = question.validators?.find((v: any) => v.type === 'pattern');
    if (patternValidator) {
      const pattern = patternValidator.value;

      if (pattern.includes('\\d') || pattern.includes('[0-9]')) {
        return `${question.label} must contain only numbers`;
      }

      if (pattern.includes('[a-zA-Z]')) {
        return `${question.label} must contain only letters`;
      }
    }

    return `${question.label} format is invalid`;
  }

  // **NEW: Handle field blur for validation**
  onFieldBlur(fieldKey: string): void {
    const control = this.form.get(fieldKey);
    if (control) {
      control.markAsTouched();
    }
  }

  // Updated shouldShowField method to use service
  shouldShowField(questionKey: string): boolean {
    const loadFreqValue = this.loadFrequencyService.getLoadFrequency();

    if (questionKey === 'days_of_week') {
      return loadFreqValue === 'D' || loadFreqValue === 'W';
    }

    if (questionKey === 'run_calendar') {
      return loadFreqValue === 'M' || loadFreqValue === 'C';
    }

    return true;
  }

  // Updated onLoadFrequencyChange method
// Enhanced onLoadFrequencyChange method
onLoadFrequencyChange() {
  const loadFreqControl = this.form.get('loadfreq');
  const loadFreqValue = loadFreqControl?.value;

  console.log('Load frequency changed to:', loadFreqValue);

  // Update the service to communicate across all form instances
  this.loadFrequencyService.updateLoadFrequency(loadFreqValue);

  // Clear conflicting fields based on selection
  if (loadFreqValue === 'M' || loadFreqValue === 'C') {
    // Clear days of week selection from BOTH form control AND service
    const daysControl = this.form.get('days_of_week');
    if (daysControl) {
      daysControl.setValue([]);
    }
    // IMPORTANT: Clear the service as well
    this.daysOfWeekService.clearSelectedDays();
  }

  if (loadFreqValue === 'D' || loadFreqValue === 'W') {
    // Clear run calendar
    const runCalendarControl = this.form.get('run_calendar');
    if (runCalendarControl) {
      runCalendarControl.setValue('');
    }
  }

  this.onFormChange();
}

  // Rest of your existing methods remain the same...


  // Method to check if an option is selected in mcq_multi
  isOptionSelected(questionKey: string, optionValue: string): boolean {
    if (!this.form) return false;
    const control = this.form.get(questionKey);
    if (!control || !control.value) return false;

    const selectedValues = control.value;
    if (Array.isArray(selectedValues)) {
      return selectedValues.includes(optionValue);
    }

    return false;
  }

  // Updated method to handle mcq_multi option changes with service integration
  onMcqMultiChange(event: any, questionKey: string, optionValue: string) {
    if (!this.form) return;
    const checkbox = event.target;
    const isChecked = checkbox.checked;
    const control = this.form.get(questionKey);

    if (!control) {
      return;
    }

    let currentValues = control.value || [];
    if (!Array.isArray(currentValues)) {
      currentValues = [];
    }

    if (isChecked) {
      if (!currentValues.includes(optionValue)) {
        currentValues = [...currentValues, optionValue];
      }
    } else {
      currentValues = currentValues.filter((value: string) => value !== optionValue);
    }

    control.setValue(currentValues);

    // Update the service if this is days_of_week
    if (questionKey === 'days_of_week') {
      this.daysOfWeekService.updateSelectedDays(currentValues);
    }

    this.onFormChange();
  }

  // Helper method to get selected values
  getSelectedValues(controlKey: string): string[] {
    if (!this.form) return [];
    const control = this.form.get(controlKey);
    if (!control || !control.value) return [];

    if (Array.isArray(control.value)) {
      return control.value;
    }

    return [];
  }

  getConditionsArray(key: string): FormArray {
    return this.form.get(key) as FormArray;
  }

  addCondition(q: any) {
    const arr = this.getConditionsArray(q.key);
    arr.push(this.formBuilder.buildConditionGroup(q.item.fields));
  }

  removeCondition(key: string, index: number) {
    const arr = this.getConditionsArray(key);
    if (arr.length > 1) {
      arr.removeAt(index);
    }
  }

  onLogicChange(q: any, index: number) {
    const arr = this.getConditionsArray(q.key);
    const current = arr.at(index);
    const logic = current.get('logic')?.value;
    const isLast = index === arr.length - 1;

    if ((logic === 'and' || logic === 'or') && isLast) {
      arr.push(this.formBuilder.buildConditionGroup(q.item.fields));
    } else if ((!logic || logic === '' || logic === 'NONE') && !isLast) {
      while (arr.length > index + 1) {
        arr.removeAt(arr.length - 1);
      }
    }
  }

  getTypeOptions(field: any, q: any) {
    if (field.key === 'type') {
      const base = field.options || [];
      const extra: any[] = [];
      const all = [...base];
      extra.forEach(opt => {
        if (!all.some(o => o.value === opt.value)) {
          all.push(opt);
        }
      });
      return all;
    }
    return field.options || [];
  }

  // --- run_calendar UI logic methods ---
  onCalendarDropdownChange(value: string): void {
    this.selectedCalendarOption = value;
    if (value === 'custom') {
      this.showCalendarPopup = true;
    } else if (value) {
      this.form.get('run_calendar')?.setValue(value);
    }
  }
getFinalConditionString(q: any): string {
  const conditions = this.form.get(q.key)?.value;
  if (!conditions || !Array.isArray(conditions)) return '';

  return conditions
    .map((condition: any, index: number) => {
      const type = condition.type;
      const job = condition.job;
      const logic = condition.logic;

      if (!job || !type) return '';

      let conditionStr = `${type}(${job})`;
      if (logic && logic !== 'NONE' && index < conditions.length - 1) {
        conditionStr += ` ${logic.toUpperCase()} `;
      }

      return conditionStr;
    })
    .filter(str => str !== '')
    .join('') || '';
}


  onCustomCalendarCreated(calendar: any) {
    if (calendar && calendar.extendedCalendar) {
      this.form.get('run_calendar')?.setValue(calendar.extendedCalendar);
      this.selectedCalendarOption = calendar.extendedCalendar;
      // Optionally store the custom calendar for JIL output
    }
    this.showCalendarPopup = false;
  }

// In dynamic-form-viewer.component.ts
get integratedJobValue(): string {
  if (this.jobNameForDisplay) {
    return this.jobNameForDisplay;
  }

  if (!this.form) return '';

  // For top form, only show fields that exist in common configuration
  if (this.subformContext?.type === 'top') {
    const commonFields = ['csi', 'efforttype', 'prodlob', 'loadfreq'];
    return this.generateTruncatedJobName(commonFields);
  }

  return '';
}

private generateTruncatedJobName(fields: string[]): string {
  const values = fields.map(f => this.form.get(f)?.value || '').map(v => v.toString().toUpperCase());
  const nonEmptyValues = values.filter(v => v !== '');

  if (nonEmptyValues.length === 0) return 'Job name will appear here (complete in subforms)';

  const partialJobName = nonEmptyValues.join('_');
  return `${partialJobName}... (complete in subforms)`;
}


  private truncateWithPurpose(values: string[]): string {
    const purposeIndex = 3;
    const purpose = values[purposeIndex] || '';

    if (purpose.length === 0) {
      const jobName = values.filter(v => v !== '').join('_');
      return jobName.substring(0, 60);
    }

    const valuesWithoutPurpose = [...values];
    valuesWithoutPurpose[purposeIndex] = '';
    const jobNameWithoutPurpose = valuesWithoutPurpose.filter(v => v !== '').join('_');

    const availableSpace = 60 - jobNameWithoutPurpose.length - 1;

    if (availableSpace <= 0) {
      return jobNameWithoutPurpose.substring(0, 60);
    }

    const truncatedPurpose = purpose.substring(0, availableSpace);
    const truncatedValues = [...values];
    truncatedValues[purposeIndex] = truncatedPurpose;

    return truncatedValues.filter(v => v !== '').join('_');
  }

  get isJobNameTruncated(): boolean {
  // If truncation status is passed from parent, use it
  if (this.isJobNameTruncatedForDisplay !== undefined) {
    return this.isJobNameTruncatedForDisplay;
  }

  // Fallback to original logic for top forms
  if (!this.form) return false;

  const fields = ['csi', 'efforttype', 'prodlob', 'purpose', 'loadfreq', 'loadlayer'];
  const values = fields.map(f => this.form.get(f)?.value || '').map(v => v.toString().toUpperCase());
  const fullJobName = values.filter(v => v !== '').join('_');
  return fullJobName.length > 60;
}

  isInsertJobSection(section: any): boolean {
    return section.title === 'Insert Job Configuration';
  }

  isFieldReadonly(fieldKey: string): boolean {
    return false;
  }

  hasRequiredValidator(question: any, env?: string, field?: string): boolean {
    if (!question.validators) return false;

    if (env && field) {
      return this.isEnvironmentFieldRequired(env, field);
    }

    return question.validators.some((validator: any) => validator.type === 'required');
  }

  onFormChange() {
    this.formChange.emit(this.form.value);
  }

  isEnvironmentFieldRequired(env: string, field: string): boolean {
    if (!this.subformContext) return false;
    const topInstance = this.getTopFormInstance();
    if (!topInstance) return false;
    const isEnvSelected = topInstance.form.get(env)?.value;
    return !!isEnvSelected;
  }

  private getTopFormInstance(): any {
    return null;
  }

  shouldShowEnvironmentField(env: any, field: any): boolean {
    if (!this.subformContext) return true;
    const jobType = this.subformContext.type;

    if (jobType === 'top') {
      return false;
    }

    if (jobType === 'box') {
      return field.key === 'owner';
    }

    if (jobType === 'cmd') {
      return ['owner', 'machine', 'command'].includes(field.key);
    }

    if (jobType === 'fw') {
      return ['owner', 'machine'].includes(field.key);
    }

    return true;
  }

  isEnvironmentSelected(envKey: string): boolean {
    if (this.subformContext?.type === 'top') {
      return false;
    }
    return this.selectedEnvironments.includes(envKey);
  }

  // Add this helper method for template casting
  asFormControl(ctrl: AbstractControl | null): FormControl {
    return ctrl as FormControl;
  }

  // dynamic-form-viewer.component.ts
// (Put it anywhere inside the class)

hasSelectedEnvironments(question: { environments: { key: string }[] }): boolean {
  // Re-use the existing method you already have
  return question.environments.some(env => this.isEnvironmentSelected(env.key));
}




}

