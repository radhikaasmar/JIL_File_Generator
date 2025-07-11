import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormArray } from '@angular/forms';
import { DynamicFormBuilderService, SubformInstance } from '../../services/dynamic-form-builder.service';
import { EnvironmentStateService } from '../../services/environment-state.service';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-dynamic-form-viewer',
  templateUrl: './dynamic-form-viewer.component.html',
  standalone: true,
  styleUrls: ['./dynamic-form-viewer.component.css'],
  imports: [CommonModule, ReactiveFormsModule]
})
export class DynamicFormViewerComponent {
  @Input() sections: any[] = [];
  @Input() form!: FormGroup;
  @Input() subformContext?: SubformInstance;
  @Output() formChange = new EventEmitter();

  constructor(
  private formBuilder: DynamicFormBuilderService,
  private environmentStateService: EnvironmentStateService // Add this
) {}

  isDaySelected(dayValue: string): boolean {
    if (!this.form) return false;
    const daysOfWeekControl = this.form.get('days_of_week');
    if (!daysOfWeekControl || !daysOfWeekControl.value) return false;

    const selectedDays = daysOfWeekControl.value;
    if (Array.isArray(selectedDays)) {
      return selectedDays.includes(dayValue);
    }
    if (typeof selectedDays === 'string') {
      return selectedDays.includes(dayValue);
    }
    return false;
  }

  // Method to handle day of week checkbox changes
  onDayOfWeekChange(event: any) {
    if (!this.form) return;
    const checkbox = event.target;
    const dayValue = checkbox.value;
    const isChecked = checkbox.checked;
    const daysOfWeekControl = this.form.get('days_of_week');
    if (!daysOfWeekControl) return;

    let currentDays = daysOfWeekControl.value || [];
    if (typeof currentDays === 'string') {
      currentDays = currentDays.split(',').filter(d => d.trim() !== '');
    }

    if (isChecked) {
      if (!currentDays.includes(dayValue)) {
        currentDays.push(dayValue);
      }
    } else {
      currentDays = currentDays.filter((day: string) => day !== dayValue);
    }

    daysOfWeekControl.setValue(currentDays);
    this.onFormChange();
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

  // Auto add/remove logic for conditions-array
  onLogicChange(q: any, index: number) {
    const arr = this.getConditionsArray(q.key);
    const current = arr.at(index);
    const logic = current.get('logic')?.value;
    const isLast = index === arr.length - 1;

    if ((logic === 'and' || logic === 'or') && isLast) {
      arr.push(this.formBuilder.buildConditionGroup(q.item.fields));
    } else if ((!logic || logic === '' || logic === 'NONE') && !isLast) {
      // Remove all after current if logic is cleared or set to NONE
      while (arr.length > index + 1) {
        arr.removeAt(arr.length - 1);
      }
    }
  }

  // Helper to get type options for the type dropdown
  getTypeOptions(field: any, q: any) {
    if (field.key === 'type') {
      // Add extra options for type
      const base = field.options || [];
      const extra: any[] = [];
      // Avoid duplicates if already present
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

  // Build the final condition string (like static version)
  getFinalConditionString(q: any): string {
    const arr = this.getConditionsArray(q.key);
    if (arr.length === 0) return 'No conditions defined';

    return arr.controls
      .map((ctrl, idx) => {
        const type = ctrl.get('type')?.value;
        const job = ctrl.get('job')?.value;
        const logic = ctrl.get('logic')?.value;

        if (!job || !type) return '';

        let conditionStr = `${type}(${job})`;
        if (logic && logic !== 'NONE' && idx < arr.length - 1) {
          conditionStr += ` ${logic.toUpperCase()} `;
        }
        return conditionStr;
      })
      .filter(str => str !== '')
      .join('') || 'No conditions defined';
  }

  get integratedJobValue(): string {
    if (!this.form) return '';

    // For top subform, show the base job name with truncation
    if (this.subformContext?.type === 'top') {
      const fields = ['csi', 'efforttype', 'prodlob', 'purpose', 'loadfreq', 'loadlayer'];
      return this.generateTruncatedJobName(fields);
    }

    // For other subforms, this will be handled by the parent component
    return '';
  }

  private generateTruncatedJobName(fields: string[]): string {
    const values = fields.map(f => this.form.get(f)?.value || '').map(v => v.toString().toUpperCase());
    const nonEmptyValues = values.filter(v => v !== '');

    if (nonEmptyValues.length === 0) return 'Job name will appear here';

    const fullJobName = nonEmptyValues.join('_');

    // If job name is within limit, return as is
    if (fullJobName.length <= 60) {
      return fullJobName;
    }

    // Truncate the purpose field (4th field, index 3)
    return this.truncateWithPurpose(values);
  }

  private truncateWithPurpose(values: string[]): string {
    const purposeIndex = 3;
    const purpose = values[purposeIndex] || '';

    if (purpose.length === 0) {
      const jobName = values.filter(v => v !== '').join('_');
      return jobName.substring(0, 60);
    }

    // Calculate space available for purpose
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
    if (!this.form) return false;

    const fields = ['csi', 'efforttype', 'prodlob', 'purpose', 'loadfreq', 'loadlayer'];
    const values = fields.map(f => this.form.get(f)?.value || '').map(v => v.toString().toUpperCase());
    const fullJobName = values.filter(v => v !== '').join('_');

    return fullJobName.length > 60;
  }

  // Check if current section is Insert Job Configuration
  isInsertJobSection(section: any): boolean {
    return section.title === 'Insert Job Configuration';
  }

  isFieldReadonly(fieldKey: string): boolean {
  // Remove the readonly logic for owner fields
  // Owner fields should be editable in all forms
  return false;
}



    // Method to check if a question has required validator
  hasRequiredValidator(question: any, env?: string, field?: string): boolean {
  if (!question.validators) return false;

  // For environment fields, check dynamic validation
  if (env && field) {
    return this.isEnvironmentFieldRequired(env, field);
  }

  // For regular fields, check static validators
  return question.validators.some((validator: any) => validator.type === 'required');
}

  // Method to handle form changes
  onFormChange() {
    // Emit form change event or handle form updates
    // This should trigger recalculation of the integrated job value
    this.formChange.emit(this.form.value);
  }

  isEnvironmentFieldRequired(env: string, field: string): boolean {
  if (!this.subformContext) return false;

  // Get the top form instance to check selected environments
  const topInstance = this.getTopFormInstance();
  if (!topInstance) return false;

  // Check if this environment is selected in top form
  const isEnvSelected = topInstance.form.get(env)?.value;
  return !!isEnvSelected;
}
private getTopFormInstance(): any {
  // This would need to be injected or passed from parent
  // For now, return null - you'll implement this based on your architecture
  return null;
}
// Add this method to DynamicFormViewerComponent
shouldShowEnvironmentField(env: any, field: any): boolean {
  if (!this.subformContext) return true;

  const jobType = this.subformContext.type;

  // For top subform, don't show any environment detail fields
  if (jobType === 'top') {
    return false;
  }

  // For box jobs, only show owner fields
  if (jobType === 'box') {
    return field.key === 'owner';
  }

  // For cmd jobs, show owner, machine, and command
  if (jobType === 'cmd') {
    return ['owner', 'machine', 'command'].includes(field.key);
  }

  // For fw jobs, show owner and machine
  if (jobType === 'fw') {
    return ['owner', 'machine'].includes(field.key);
  }

  return true;
}






isEnvironmentSelected(envKey: string): boolean {
  // For top form, don't show detail fields
  if (this.subformContext?.type === 'top') {
    return false;
  }

  // For other forms, only show if environment is selected in top form
  return this.selectedEnvironments.includes(envKey);
}


selectedEnvironments: string[] = [];
  private environmentSubscription?: Subscription;

  ngOnInit() {
    // Subscribe to environment changes
    this.environmentSubscription = this.environmentStateService.selectedEnvironments$.subscribe(
      selectedEnvs => {
        this.selectedEnvironments = selectedEnvs;
      }
    );
  }

  ngOnDestroy() {
    if (this.environmentSubscription) {
      this.environmentSubscription.unsubscribe();
    }
  }


}
