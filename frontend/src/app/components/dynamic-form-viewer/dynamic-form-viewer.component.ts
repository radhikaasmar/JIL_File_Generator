import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormArray } from '@angular/forms';
import { DynamicFormBuilderService, SubformInstance } from '../../services/dynamic-form-builder.service';
import { EnvironmentStateService } from '../../services/environment-state.service';
import { DaysOfWeekService } from '../../services/days-of-week.service'; // Add this import
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dynamic-form-viewer',
  templateUrl: './dynamic-form-viewer.component.html',
  standalone: true,
  styleUrls: ['./dynamic-form-viewer.component.css'],
  imports: [CommonModule, ReactiveFormsModule]
})
export class DynamicFormViewerComponent implements OnInit, OnDestroy {
  @Input() sections: any[] = [];
  @Input() form!: FormGroup;
  @Input() subformContext?: SubformInstance;
  @Output() formChange = new EventEmitter();

  selectedEnvironments: string[] = [];
  private environmentSubscription?: Subscription;

  constructor(
    private formBuilder: DynamicFormBuilderService,
    private environmentStateService: EnvironmentStateService,
    private daysOfWeekService: DaysOfWeekService // Add this injection
  ) {}

  ngOnInit() {
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

  // Rest of your existing methods remain the same...
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
    
    if (this.subformContext?.type === 'top') {
      const fields = ['csi', 'efforttype', 'prodlob', 'purpose', 'loadfreq', 'loadlayer'];
      return this.generateTruncatedJobName(fields);
    }
    
    return '';
  }

  private generateTruncatedJobName(fields: string[]): string {
    const values = fields.map(f => this.form.get(f)?.value || '').map(v => v.toString().toUpperCase());
    const nonEmptyValues = values.filter(v => v !== '');
    
    if (nonEmptyValues.length === 0) return 'Job name will appear here';
    
    const fullJobName = nonEmptyValues.join('_');
    
    if (fullJobName.length <= 60) {
      return fullJobName;
    }
    
    return this.truncateWithPurpose(values);
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
}
