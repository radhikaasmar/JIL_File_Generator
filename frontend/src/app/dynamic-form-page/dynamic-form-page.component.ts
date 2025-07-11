import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormGroup, Validators } from '@angular/forms';
import { DynamicQuestionService } from '../services/dynamic-question.service';
import { DynamicFormBuilderService, SubformInstance } from '../services/dynamic-form-builder.service';
import { SubformConfigService, ResolvedSubformConfig } from '../services/subform-config.service';
import { FunctionJobMappingService, FunctionJobOption } from '../services/function-job-mapping.service';
import { DynamicFormViewerComponent } from '../components/dynamic-form-viewer/dynamic-form-viewer.component';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { EnvironmentStateService } from '../services/environment-state.service';

@Component({
  selector: 'app-dynamic-form-page',
  templateUrl: './dynamic-form-page.component.html',
  standalone: true,
  imports: [DynamicFormViewerComponent, RouterModule, CommonModule, ReactiveFormsModule],
  styleUrls: ['./dynamic-form-page.component.css']
})
export class DynamicFormPageComponent implements OnInit {
  subformInstances: SubformInstance[] = [];
  subformConfigs: {[key: string]: ResolvedSubformConfig} = {};

  constructor(
    private questionService: DynamicQuestionService,
    private formBuilder: DynamicFormBuilderService,
    private subformConfigService: SubformConfigService,
    private functionJobMappingService: FunctionJobMappingService,
    private environmentStateService: EnvironmentStateService
  ) {}

  ngOnInit() {
  this.loadSubformConfigs();

  // Initialize environment state after subforms are loaded
  setTimeout(() => {
    const topInstance = this.subformInstances.find(s => s.type === 'top');
    if (topInstance) {
      const selectedEnvs = this.getSelectedEnvironments(topInstance.form);
      this.environmentStateService.updateSelectedEnvironments(selectedEnvs);
    }
  }, 100);
}

  private loadSubformConfigs() {
    this.subformConfigService.loadAllSubformConfigs().subscribe(configs => {
      const resolvePromises = Object.keys(configs).map(key =>
        this.subformConfigService.resolveSubformConfig(configs[key]).toPromise()
      );

      Promise.all(resolvePromises).then(resolvedConfigs => {
        resolvedConfigs.forEach(config => {
          if (config) {
            this.subformConfigs[config.subformType] = config;
          }
        });
        this.initializeDefaultSubforms();
      });
    });
  }

  private initializeDefaultSubforms() {
    // Always add top subform
    this.addSubformInstance('top', 'Common Configuration', false);
    // Always add box subform
    this.addSubformInstance('box', 'Box Job #1', false);
  }

  private addSubformInstance(type: string, displayName: string, removable: boolean, functionOfJob?: string) {
    const config = this.subformConfigs[type];
    if (!config) return;

    const form = this.formBuilder.buildSubform(config.sections);

    // Pre-fill function of job and job type if provided
    if (functionOfJob) {
      const functionOption = this.functionJobMappingService.getFunctionJobOption(functionOfJob);
      if (functionOption) {
        form.get('funofjob')?.setValue(functionOfJob);
        form.get('jobtitle')?.setValue(functionOption.jobType);
      }
    }

    const instance: SubformInstance = {
      id: `${type}-${Date.now()}`,
      type,
      displayName,
      functionOfJob,
      form,
      sections: config.sections,
      removable
    };

    this.subformInstances.push(instance);
    this.updateJobNames();
  }

  get availableFunctionOptions(): FunctionJobOption[] {
    const existingFunctions = this.subformInstances
      .filter(instance => instance.functionOfJob)
      .map(instance => instance.functionOfJob!);

    return this.functionJobMappingService.getAvailableFunctions(existingFunctions);
  }

  // Remove onAddFunctionJob(event: any)
  // Add checkbox handler instead
  onFunctionCheckboxChange(event: any, option: FunctionJobOption) {
  if (event.target.checked) {
    const instanceCount = this.subformInstances.filter(s => s.type === option.subformType).length;
    const displayName = `${option.subformType.toUpperCase()} Job #${instanceCount + 1}`;
    this.addSubformInstance(option.subformType, displayName, true, option.value);

    // After creating the subform, set default values
    const selectedEnvs = this.environmentStateService.getSelectedEnvironments();
    const newInstance = this.subformInstances[this.subformInstances.length - 1];

    // Set machine defaults immediately
    this.setDefaultMachineValues(newInstance, selectedEnvs);

    // If box form exists, propagate owner values
    const boxInstance = this.subformInstances.find(s => s.type === 'box');
    if (boxInstance) {
      this.propagateOwnerValuesFromBox(boxInstance.form);
    }
  } else {
    this.subformInstances = this.subformInstances.filter(
      instance => instance.functionOfJob !== option.value
    );
    this.updateJobNames();
  }
}


  removeSubformInstance(instanceId: string) {
    this.subformInstances = this.subformInstances.filter(instance => instance.id !== instanceId);
    this.updateJobNames();
  }

  onSubformChange(instance: SubformInstance) {
  this.updateJobNames();

  if (instance.type === 'top') {
    const selectedEnvs = this.getSelectedEnvironments(instance.form);
    this.environmentStateService.updateSelectedEnvironments(selectedEnvs);
    this.updateEnvironmentValidators();
  }

  // If change is from box form, propagate owner values to cmd/fw
  if (instance.type === 'box') {
    this.propagateOwnerValuesFromBox(instance.form);
  }
}

private propagateOwnerValuesFromBox(boxForm: FormGroup) {
  const selectedEnvs = this.environmentStateService.getSelectedEnvironments();
  const ownerValues: {[key: string]: string} = {};

  // Extract owner values from box form
  selectedEnvs.forEach(env => {
    const ownerValue = boxForm.get(`${env}_owner`)?.value;
    if (ownerValue) {
      ownerValues[env] = ownerValue;
    }
  });

  // Set owner values in cmd and fw subforms (editable, not readonly)
  this.subformInstances
    .filter(instance => ['cmd', 'fw'].includes(instance.type))
    .forEach(instance => {
      selectedEnvs.forEach(env => {
        const ownerControl = instance.form.get(`${env}_owner`);
        if (ownerControl && ownerValues[env]) {
          ownerControl.setValue(ownerValues[env]);
          // Don't disable - keep it editable
        }
      });

      // Also set machine defaults when propagating
      this.setDefaultMachineValues(instance, selectedEnvs);
    });
}



private propagateOwnerValues(topForm: FormGroup, selectedEnvs: string[]) {
  const ownerValues: {[key: string]: string} = {};

  // Extract owner values from top form
  selectedEnvs.forEach(env => {
    const ownerValue = topForm.get(`${env}_owner`)?.value;
    if (ownerValue) {
      ownerValues[env] = ownerValue;
    }
  });

  // Set owner values in cmd and fw subforms
  this.subformInstances
    .filter(instance => ['cmd', 'fw'].includes(instance.type))
    .forEach(instance => {
      selectedEnvs.forEach(env => {
        const ownerControl = instance.form.get(`${env}_owner`);
        if (ownerControl && ownerValues[env]) {
          ownerControl.setValue(ownerValues[env]);
          ownerControl.disable(); // Make it readonly
        }
      });
    });
}


  private updateJobNames() {
    const topInstance = this.subformInstances.find(s => s.type === 'top');
    if (!topInstance) return;

    const baseJobName = this.generateBaseJobName(topInstance.form);

    // Update box names for CMD, CFW, FW subforms
    this.subformInstances
      .filter(instance => ['cmd', 'cfw', 'fw'].includes(instance.type))
      .forEach(instance => {
        const boxName = this.generateBoxName(baseJobName, instance.form);
        instance.form.get('box_name')?.setValue(boxName);
      });
  }

  private generateBaseJobName(topForm: FormGroup): string {
    const fields = ['csi', 'efforttype', 'prodlob', 'purpose', 'loadfreq', 'loadlayer'];
    const values = fields.map(f => topForm.get(f)?.value || '').map(v => v.toString().toUpperCase());
    return values.filter(v => v !== '').join('_');
  }

  private generateTruncatedBaseJobName(topForm: FormGroup): string {
    const fields = ['csi', 'efforttype', 'prodlob', 'purpose', 'loadfreq', 'loadlayer'];
    const values = fields.map(f => topForm.get(f)?.value || '').map(v => v.toString().toUpperCase());
    const nonEmptyValues = values.filter(v => v !== '');

    if (nonEmptyValues.length === 0) return '';

    const fullJobName = nonEmptyValues.join('_');

    // If job name is within limit, return as is
    if (fullJobName.length <= 60) {
      return fullJobName;
    }

    // Truncate purpose field if needed
    return this.truncateJobNameWithPurpose(values);
  }

  private generateBoxName(baseJobName: string, subformForm: FormGroup): string {
    const boxInstance = this.subformInstances.find(s => s.type === 'box');
    if (!boxInstance) return baseJobName;

    const boxFunofjob = boxInstance.form.get('funofjob')?.value || '';
    const boxJobtitle = boxInstance.form.get('jobtitle')?.value || '';

    if (baseJobName && boxFunofjob && boxJobtitle) {
      const fullBoxName = `${baseJobName}_${boxFunofjob.toUpperCase()}_${boxJobtitle.toUpperCase()}`;

      // If box name exceeds 60 characters, truncate it
      if (fullBoxName.length > 60) {
        const topInstance = this.subformInstances.find(s => s.type === 'top');
        if (topInstance) {
          return this.truncateJobNameForSubform(fullBoxName, topInstance.form);
        }
      }

      return fullBoxName;
    }

    return baseJobName;
  }

  trackByInstanceId(index: number, instance: SubformInstance): string {
    return instance.id;
  }

  getJobNameForInstance(instance: SubformInstance): string {
    if (instance.type === 'top') {
      return this.generateTruncatedBaseJobName(instance.form);
    }

    const topInstance = this.subformInstances.find(s => s.type === 'top');
    if (!topInstance) return '';

    const baseJobName = this.generateBaseJobName(topInstance.form);
    const funofjob = instance.form.get('funofjob')?.value || '';
    const jobtitle = instance.form.get('jobtitle')?.value || '';

    if (baseJobName && funofjob && jobtitle) {
      const fullJobName = `${baseJobName}_${funofjob.toUpperCase()}_${jobtitle.toUpperCase()}`;
      return this.truncateJobNameForSubform(fullJobName, topInstance.form);
    }

    return baseJobName;
  }

private truncateJobNameForSubform(fullJobName: string, topForm: FormGroup): string {
  if (fullJobName.length <= 60) {
    return fullJobName;
  }

  // Extract the function and job type from the full job name
  const jobNameParts = fullJobName.split('_');
  const functionOfJob = jobNameParts[jobNameParts.length - 2] || '';
  const jobType = jobNameParts[jobNameParts.length - 1] || '';

  // Get the original field values from top form
  const fields = ['csi', 'efforttype', 'prodlob', 'purpose', 'loadfreq', 'loadlayer'];
  const topValues = fields.map(f => topForm.get(f)?.value || '').map(v => v.toString().toUpperCase());

  // Calculate space needed for function and job type (including underscores)
  const functionAndTypeLength = functionOfJob.length + jobType.length + 2; // +2 for underscores

  // Calculate available space for the base job name (60 - function - job type)
  const availableSpaceForBase = 60 - functionAndTypeLength;

  if (availableSpaceForBase <= 0) {
    // If no space for base, just return truncated full name
    return fullJobName.substring(0, 60);
  }

  // Build truncated base job name that fits in available space
  const truncatedBaseJobName = this.truncateBaseJobNameToFit(topValues, availableSpaceForBase);

  // Combine truncated base + function + job type
  return `${truncatedBaseJobName}_${functionOfJob}_${jobType}`;
}

private truncateBaseJobNameToFit(values: string[], maxLength: number): string {
  const purposeIndex = 3; // Purpose is the 4th field (index 3)

  // First, try with full purpose
  let jobName = values.filter(v => v !== '').join('_');
  if (jobName.length <= maxLength) {
    return jobName;
  }

  // If too long, truncate purpose field
  const purpose = values[purposeIndex] || '';
  if (purpose.length === 0) {
    // No purpose to truncate, just cut the entire string
    return jobName.substring(0, maxLength);
  }

  // Calculate job name without purpose
  const valuesWithoutPurpose = [...values];
  valuesWithoutPurpose[purposeIndex] = '';
  const jobNameWithoutPurpose = valuesWithoutPurpose.filter(v => v !== '').join('_');

  // Calculate available space for purpose
  const availableSpaceForPurpose = maxLength - jobNameWithoutPurpose.length - 1; // -1 for underscore

  if (availableSpaceForPurpose <= 0) {
    // No space for purpose at all
    return jobNameWithoutPurpose.substring(0, maxLength);
  }

  // Truncate purpose to fit available space
  const truncatedPurpose = purpose.substring(0, availableSpaceForPurpose);

  // Rebuild the job name with truncated purpose
  const truncatedValues = [...values];
  truncatedValues[purposeIndex] = truncatedPurpose;

  return truncatedValues.filter(v => v !== '').join('_');
}

  private truncateJobNameWithPurpose(values: string[]): string {
    const purposeIndex = 3; // Purpose is the 4th field (index 3)
    const purpose = values[purposeIndex] || '';

    if (purpose.length === 0) {
      // If no purpose to truncate, just cut off at 60 characters
      const jobName = values.filter(v => v !== '').join('_');
      return jobName.substring(0, 60);
    }

    // Calculate the job name without purpose
    const valuesWithoutPurpose = [...values];
    valuesWithoutPurpose[purposeIndex] = '';
    const jobNameWithoutPurpose = valuesWithoutPurpose.filter(v => v !== '').join('_');

    // Calculate how much space we have for purpose
    const availableSpace = 60 - jobNameWithoutPurpose.length - 1; // -1 for the underscore

    if (availableSpace <= 0) {
      // No space for purpose at all
      return jobNameWithoutPurpose.substring(0, 60);
    }

    // Truncate purpose to fit available space
    const truncatedPurpose = purpose.substring(0, availableSpace);

    // Rebuild the job name
    const truncatedValues = [...values];
    truncatedValues[purposeIndex] = truncatedPurpose;

    return truncatedValues.filter(v => v !== '').join('_');
  }

  isJobNameTruncated(instance: SubformInstance): boolean {
    const topInstance = this.subformInstances.find(s => s.type === 'top');
    if (!topInstance) return false;

    if (instance.type === 'top') {
      const fields = ['csi', 'efforttype', 'prodlob', 'purpose', 'loadfreq', 'loadlayer'];
      const values = fields.map(f => instance.form.get(f)?.value || '').map(v => v.toString().toUpperCase());
      const fullJobName = values.filter(v => v !== '').join('_');
      return fullJobName.length > 60;
    }

    // For box, cmd, cfw, fw subforms
    const baseJobName = this.generateBaseJobName(topInstance.form);
    const funofjob = instance.form.get('funofjob')?.value || '';
    const jobtitle = instance.form.get('jobtitle')?.value || '';

    if (baseJobName && funofjob && jobtitle) {
      const fullJobName = `${baseJobName}_${funofjob.toUpperCase()}_${jobtitle.toUpperCase()}`;
      return fullJobName.length > 60;
    }

    return false;
  }

getDebugInfo(): any {
  return {
    subformCount: this.subformInstances.length,
    availableFunctions: this.availableFunctionOptions.length,
    instances: this.subformInstances.map(i => ({
      id: i.id,
      type: i.type,
      functionOfJob: i.functionOfJob,
      removable: i.removable
    }))
  };
}

private updateEnvironmentValidators() {
  const topInstance = this.subformInstances.find(s => s.type === 'top');
  if (!topInstance) return;

  // Get selected environments from top form
  const selectedEnvs = this.getSelectedEnvironments(topInstance.form);

  // Update validators for all other subforms
  this.subformInstances
    .filter(instance => instance.type !== 'top')
    .forEach(instance => {
      this.setEnvironmentFieldValidators(instance, selectedEnvs);
    });
}

private getSelectedEnvironments(topForm: FormGroup): string[] {
  const selectedEnvs: string[] = [];
  const envKeys = ['dev', 'uat', 'prod', 'cob'];

  envKeys.forEach(env => {
    if (topForm.get(env)?.value) {
      selectedEnvs.push(env);
    }
  });

  return selectedEnvs;
}

private setEnvironmentFieldValidators(instance: SubformInstance, selectedEnvs: string[]) {
  const envKeys = ['dev', 'uat', 'prod', 'cob'];

  envKeys.forEach(env => {
    const isSelected = selectedEnvs.includes(env);

    // Get fields to validate based on job type
    const fieldsToValidate = this.getFieldsForJobType(instance.type);

    fieldsToValidate.forEach(field => {
      const controlKey = `${env}_${field}`;
      const control = instance.form.get(controlKey);

      if (control) {
        if (isSelected) {
          // Add required validator
          control.setValidators([Validators.required]);
        } else {
          // Remove validators
          control.clearValidators();
        }
        control.updateValueAndValidity();
      }
    });
  });
}

private getFieldsForJobType(jobType: string): string[] {
  switch (jobType) {
    case 'box':
      return ['owner']; // Only owner field for box jobs
    case 'cmd':
    case 'cfw':
    case 'fw':
      return ['owner', 'machine', 'command']; // All fields for other job types
    default:
      return [];
  }
}
private setDefaultMachineValues(instance: SubformInstance, selectedEnvs: string[]) {
  const defaultMachines: Record<string, string> = {
    'dev': 'V169912_EAP_GCG_NAM_INGESTION_DEV',
    'uat': 'V169912_EAP_GCG_NAM_INGESTION_UAT',
    'prod': 'V169912_EAP_GCG_NAM_INGESTION_PROD',
    'cob': 'V169912_EAP_GCG_NAM_INGESTION_COB'
  };

  if (['cmd', 'fw'].includes(instance.type)) {
    selectedEnvs.forEach(env => {
      const machineControl = instance.form.get(`${env}_machine`);
      if (machineControl) {
        // Always set default value, even if field already has a value
        machineControl.setValue(defaultMachines[env] || '');
      }
    });
  }
}



}

