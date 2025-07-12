import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators, ValidatorFn, AbstractControl, FormArray } from '@angular/forms';

export interface SubformInstance {
  id: string;
  type: string;
  displayName: string;
  functionOfJob?: string;
  form: FormGroup;
  sections: any[];
  removable: boolean;
}

@Injectable({ providedIn: 'root' })
export class DynamicFormBuilderService {
  constructor(private fb: FormBuilder) {}

  buildForm(sections: any[]): FormGroup {
    const group: any = {};

    sections.forEach(section => {
      section.questions.forEach((q: any) => {
        if (q.type === 'conditions-array') {
          const arr = this.fb.array([]);
          if (q.item && q.item.fields) {
            const conditionGroup = this.buildConditionGroup(q.item.fields);
            arr.push(conditionGroup as any);
          }
          group[q.key] = arr;
        } 
        else if (q.type === 'array') {
          group[q.key] = this.fb.array([]);
        } 
        else if (q.type === 'group') {
          const subGroup: any = {};
          q.fields.forEach((f: any) => {
            subGroup[f.key] = new FormControl(f.defaultValue || '');
          });
          group[q.key] = this.fb.group(subGroup);
        } 
        else if (q.type === 'checkbox-group') {
          q.options.forEach((opt: any) => {
            group[opt.key] = new FormControl(false);
          });
        }
        else if (q.type === 'mcq_multi') {
          group[q.key] = new FormControl([]);
        }
        else if (q.type === 'environments-group') {
          q.environments.forEach((env: any) => {
            env.fields.forEach((field: any) => {
              const controlKey = `${env.key}_${field.key}`;
              group[controlKey] = new FormControl(field.defaultValue || '');
            });
          });
        } 
        else {
          let validators = this.mapValidators(q.validators);
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

  buildSubform(sections: any[], prefilledData?: any): FormGroup {
    return this.buildForm(sections);
  }

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
  private buildControl(question: any): FormControl {
  const validators = this.buildValidators(question.validators || []);
  const value = question.defaultValue || '';
  
  return new FormControl(value, validators);
}

private buildValidators(validatorConfigs: any[]): any[] {
  const validators: any[] = [];
  
  validatorConfigs.forEach(config => {
    switch (config.type) {
      case 'required':
        validators.push(Validators.required);
        break;
        
      case 'pattern':
        validators.push(Validators.pattern(config.value));
        break;
        
      case 'maxLength':
        validators.push(Validators.maxLength(config.value));
        break;
        
      case 'minLength':
        validators.push(Validators.minLength(config.value));
        break;
        
      case 'min':
        validators.push(Validators.min(config.value));
        break;
        
      case 'max':
        validators.push(Validators.max(config.value));
        break;
    }
  });
  
  return validators;
}

}
