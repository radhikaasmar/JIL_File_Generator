import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators, ValidatorFn, FormArray } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class DynamicFormBuilderService {
  constructor(private fb: FormBuilder) {}

  buildForm(sections: any[]): FormGroup {
    const group: any = {};
    sections.forEach(section => {
      section.questions.forEach((q: any) => {
        if (q.type === 'conditions-array') {
          // Create a FormArray for conditions, ensure at least one group
          const arr = this.fb.array<FormGroup>([]);
          if (q.item && q.item.fields) {
            arr.push(this.buildConditionGroup(q.item.fields));
          }
          group[q.key] = arr;
        } else if (q.type === 'array') {
          group[q.key] = this.fb.array([]);
        } else if (q.type === 'group') {
          const subGroup: any = {};
          q.fields.forEach((f: any) => {
            subGroup[f.key] = new FormControl(f.defaultValue || '');
          });
          group[q.key] = this.fb.group(subGroup);
        } else if (q.type === 'checkbox-group') {
          q.options.forEach((opt: any) => {
            group[opt.key] = new FormControl(false);
          });
        } else if (q.type === 'environments-group') {
          q.environments.forEach((env: any) => {
            env.fields.forEach((field: any) => {
              const controlKey = `${env.key}_${field.key}`;
              group[controlKey] = new FormControl(field.defaultValue || '');
            });
          });
        } else {
          let validators = this.mapValidators(q.validators);

          // Ensure the validators array only includes valid functions
          const validValidators = Array.isArray(validators)
            ? validators.filter((v: any) => typeof v === 'function')
            : [];

          group[q.key] = validValidators.length > 0
            ? new FormControl(q.defaultValue || '', validValidators)
            : new FormControl(q.defaultValue || '');
        }
      });
    });
    return this.fb.group(group);
  }

  // Helper to build a FormGroup for a single condition (for conditions-array)
  buildConditionGroup(conditionFields: any[]): FormGroup {
    const group: any = {};
    conditionFields.forEach((field: any) => {
      let validators = this.mapValidators(field.validators);
      const validValidators = Array.isArray(validators)
        ? validators.filter((v: any) => typeof v === 'function')
        : [];
      group[field.key] = validValidators.length > 0
        ? new FormControl(field.defaultValue || '', validValidators)
        : new FormControl(field.defaultValue || '');
    });
    return this.fb.group(group);
  }

  private mapValidators(validators?: any[]): ValidatorFn[] {
    if (!validators) return [];

    return validators
      .map(v => {
        switch (v.type) {
          case 'required': return Validators.required;
          case 'pattern': return Validators.pattern(v.value);
          case 'maxLength': return Validators.maxLength(v.value);
          default: return null;
        }
      })
      .filter((v): v is ValidatorFn => v !== null);
  }
}
