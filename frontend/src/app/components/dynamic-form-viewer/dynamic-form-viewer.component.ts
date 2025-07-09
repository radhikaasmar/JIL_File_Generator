import { Component, Input,Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormArray } from '@angular/forms';
import { DynamicFormBuilderService } from '../../services/dynamic-form-builder.service';

@Component({
  selector: 'app-dynamic-form-viewer',
  templateUrl: './dynamic-form-viewer.component.html',
  standalone: true,
  styleUrls: ['../../styles.css'],
  imports: [CommonModule, ReactiveFormsModule]
})
export class DynamicFormViewerComponent {
  @Input() sections: any[] = [];
  @Input() form!: FormGroup;
   @Output() formChange = new EventEmitter();

  constructor(private formBuilder: DynamicFormBuilderService) {}

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
      const extra: any[] = [

      ];
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
    
    const fields = ['csi', 'efforttype', 'prodlob', 'purpose', 'loadfreq', 'loadlayer', 'funofjob', 'jobtitle'];
    
    // Get all values as uppercase strings
    const values = fields.map(f => this.form.get(f)?.value || '').map(v => v.toString().toUpperCase());
    
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
    if (!this.form) return false;
    
    const fields = ['csi', 'efforttype', 'prodlob', 'purpose', 'loadfreq', 'loadlayer', 'funofjob', 'jobtitle'];
    const values = fields.map(f => this.form.get(f)?.value || '').map(v => v.toString().toUpperCase());
    
    if (!values[3]) return false; // if purpose is empty, never truncated
    
    const originalJobName = values.filter(v => v !== '').join('_');
    return originalJobName.length > 64;
  }

  // Check if current section is Insert Job Configuration
  isInsertJobSection(section: any): boolean {
    return section.section === 'Insert Job Configuration';
  }

    // Method to check if a question has required validator
  hasRequiredValidator(question: any): boolean {
    if (!question.validators) return false;
    return question.validators.some((validator: any) => validator.type === 'required');
  }

  // Method to handle form changes
  onFormChange() {
    // Emit form change event or handle form updates
    // This should trigger recalculation of the integrated job value
    this.formChange.emit(this.form.value);
  }
}
