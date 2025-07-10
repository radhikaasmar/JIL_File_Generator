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

  onAddFunctionJob(event: any) {
    const selectedFunction = event.target.value;
    if (!selectedFunction) return;

    const functionOption = this.functionJobMappingService.getFunctionJobOption(selectedFunction);
    if (!functionOption) return;

    const instanceCount = this.subformInstances.filter(s => s.type === functionOption.subformType).length;
    const displayName = `${functionOption.subformType.toUpperCase()} Job #${instanceCount + 1}`;

    this.addSubformInstance(functionOption.subformType, displayName, true, selectedFunction);

    // Reset dropdown
    event.target.value = '';
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

  private generateBoxName(baseJobName: string, subformForm: FormGroup): string {
    const funofjob = subformForm.get('funofjob')?.value || '';
    const jobtitle = subformForm.get('jobtitle')?.value || '';

    const boxInstance = this.subformInstances.find(s => s.type === 'box');
    if (boxInstance) {
      const boxFunofjob = boxInstance.form.get('funofjob')?.value || '';
      const boxJobtitle = boxInstance.form.get('jobtitle')?.value || '';

      if (baseJobName && boxFunofjob && boxJobtitle) {
        return `${baseJobName}_${boxFunofjob.toUpperCase()}_${boxJobtitle.toUpperCase()}`;
      }
    }

    return baseJobName;
  }
trackByInstanceId(index: number, instance: SubformInstance): string {
  return instance.id;
}

getJobNameForInstance(instance: SubformInstance): string {
  if (instance.type === 'top') {
    return this.generateBaseJobName(instance.form);
  }

  const topInstance = this.subformInstances.find(s => s.type === 'top');
  if (!topInstance) return '';

  const baseJobName = this.generateBaseJobName(topInstance.form);
  const funofjob = instance.form.get('funofjob')?.value || '';
  const jobtitle = instance.form.get('jobtitle')?.value || '';

  if (baseJobName && funofjob && jobtitle) {
    return `${baseJobName}_${funofjob.toUpperCase()}_${jobtitle.toUpperCase()}`;
  }

  return baseJobName;
}

isJobNameTruncated(instance: SubformInstance): boolean {
  const jobName = this.getJobNameForInstance(instance);
  return jobName.length > 64;
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
}

