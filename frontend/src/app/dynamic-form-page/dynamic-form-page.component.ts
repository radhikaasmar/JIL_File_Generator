import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { LoadFrequencyService } from '../services/load-frequency.service';
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
import { DaysOfWeekService } from '../services/days-of-week.service';
import { JILFieldOrder, getFieldOrder, EXCLUDED_FROM_JIL, JOB_TYPE_RESTRICTIONS } from '../enums/jil-field-order.enum';

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
    private environmentStateService: EnvironmentStateService,
    private daysOfWeekService: DaysOfWeekService,
    private loadFrequencyService: LoadFrequencyService
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
    this.addSubformInstance('box', 'Box Job #1', false,'boxfunc');
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

    if (baseJobName && funofjob) {
      // Special handling for FW and CFW - only include function, not job type
      if (instance.type === 'fw' || instance.type === 'cfw') {
        const fullJobName = `${baseJobName}_${funofjob.toUpperCase()}`;
        return this.truncateJobNameForSubformFwCfw(fullJobName, topInstance.form, funofjob);
      }

      // For other job types, include both function and job type
      if (jobtitle) {
        const fullJobName = `${baseJobName}_${funofjob.toUpperCase()}_${jobtitle.toUpperCase()}`;
        return this.truncateJobNameForSubform(fullJobName, topInstance.form);
      }
    }

    return baseJobName;
  }

  private truncateJobNameForSubformFwCfw(fullJobName: string, topForm: FormGroup, functionOfJob: string): string {
    if (fullJobName.length <= 60) {
      return fullJobName;
    }

    // Get the original field values from top form
    const fields = ['csi', 'efforttype', 'prodlob', 'purpose', 'loadfreq', 'loadlayer'];
    const topValues = fields.map(f => topForm.get(f)?.value || '').map(v => v.toString().toUpperCase());

    // Calculate space needed for function only (no job type for FW/CFW)
    const functionLength = functionOfJob.length + 1; // +1 for underscore

    // Calculate available space for the base job name
    const availableSpaceForBase = 60 - functionLength;

    if (availableSpaceForBase <= 0) {
      return fullJobName.substring(0, 60);
    }

    // Build truncated base job name that fits in available space
    const truncatedBaseJobName = this.truncateBaseJobNameToFit(topValues, availableSpaceForBase);

    // Combine truncated base + function (no job type)
    return `${truncatedBaseJobName}_${functionOfJob}`;
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

  // Enhanced JIL generation with enum-based ordering and filtering
  downloadJILFiles() {
    const topInstance = this.subformInstances.find(s => s.type === 'top');
    if (!topInstance) {
      alert('No configuration found to generate JIL files');
      return;
    }

    const selectedEnvs = this.getSelectedEnvironments(topInstance.form);
    if (selectedEnvs.length === 0) {
      alert('Please select at least one environment');
      return;
    }

    const baseJobName = this.generateBaseJobName(topInstance.form);
    if (!baseJobName) {
      alert('Please fill in the required fields to generate job name');
      return;
    }

    selectedEnvs.forEach(env => {
      const jilContent = this.generateJILContent(env, baseJobName, topInstance);
      const fileName = `${baseJobName}_${env.toUpperCase()}.jil.txt`;
      this.downloadFile(jilContent, fileName);
    });
  }

  private generateJILContent(environment: string, baseJobName: string, topInstance: SubformInstance): string {
    let jilContent = '';

    // 1. Generate Box Job first
    const boxInstance = this.subformInstances.find(s => s.type === 'box');
    if (boxInstance) {
      jilContent += this.generateDynamicJobJIL(environment, baseJobName, topInstance, boxInstance, 'box');
      jilContent += '\n\n';
    }

    // 2. Generate Function Jobs (CMD, FW, CFW)
    const functionInstances = this.subformInstances.filter(s => ['cmd', 'fw', 'cfw'].includes(s.type));
    functionInstances.forEach(instance => {
      jilContent += this.generateDynamicJobJIL(environment, baseJobName, topInstance, instance, instance.type);
      jilContent += '\n\n';
    });

    return jilContent;
  }

  // Updated generateDynamicJobJIL method with enum-based ordering and filtering
  private generateDynamicJobJIL(environment: string, baseJobName: string, topInstance: SubformInstance, jobInstance: SubformInstance, jobType: string): string {
    const jobForm = jobInstance.form;
    const topForm = topInstance.form;

    // Generate job name
    const funofjob = jobForm.get('funofjob')?.value || '';
    const jobtitle = jobForm.get('jobtitle')?.value || '';
    let jobName: string;

    if (funofjob.toLowerCase() === 'fw' || funofjob.toLowerCase() === 'cfw') {
      jobName = `${baseJobName}_${funofjob.toUpperCase()}`;
    } else {
      jobName = `${baseJobName}_${funofjob.toUpperCase()}_${jobtitle.toUpperCase()}`;
    }

    // Collect all field values in a map
    const jilFields: {[key: string]: string} = {};

    // Always start with insert_job and job_type
    jilFields['insert_job'] = jobName;
    jilFields['job_type'] = jobType === 'box' ? 'BOX' : jobtitle.toUpperCase();

    // Add box_name for non-box jobs
    if (jobType !== 'box') {
      const boxName = jobForm.get('box_name')?.value || '';
      if (boxName) {
        jilFields['box_name'] = boxName;
      }
    }

    // Collect all other fields with proper filtering
    this.collectFilteredFields(topForm, jobForm, environment, jobType, jilFields);

    // Generate ordered JIL content
    return this.generateOrderedJIL(jilFields);
  }

  private collectFilteredFields(topForm: FormGroup, jobForm: FormGroup, environment: string, jobType: string, jilFields: {[key: string]: string}) {
    // Collect common fields from top form (filtered)
    this.collectCommonFieldsFiltered(topForm, jobType, jilFields);

    // Collect environment-specific fields
    this.collectEnvironmentFieldsToMap(jobForm, environment, jilFields);

    // Collect job-specific fields (filtered)
    this.collectJobSpecificFieldsFiltered(jobForm, jobType, jilFields);
  }

  private collectCommonFieldsFiltered(topForm: FormGroup, jobType: string, jilFields: {[key: string]: string}) {
    // Permission
    const permission = topForm.get('permission')?.value;
    if (permission && this.isFieldAllowedForJobType('permission', jobType)) {
      jilFields['permission'] = permission;
    }

    // Description (quoted)
    const description = topForm.get('description')?.value;
    if (description && this.isFieldAllowedForJobType('description', jobType)) {
      jilFields['description'] = `"${description}"`;
    }

    // Timezone
    const timezone = topForm.get('timezone')?.value;
    if (timezone && this.isFieldAllowedForJobType('timezone', jobType)) {
      jilFields['timezone'] = timezone;
    }

    // Days of week (only for specific job types and load frequencies)
    const selectedDays = this.daysOfWeekService.getSelectedDays();
    if (selectedDays && selectedDays.length > 0 && this.isFieldAllowedForJobType('days_of_week', jobType)) {
      jilFields['days_of_week'] = selectedDays.join(',');
    }

    // Run calendar
    const runCalendar = topForm.get('run_calendar')?.value;
    if (runCalendar && this.isFieldAllowedForJobType('run_calendar', jobType)) {
      jilFields['run_calendar'] = runCalendar;
    }

    // Date conditions
    const dateConditions = topForm.get('date_conditions')?.value;
    if (dateConditions && this.isFieldAllowedForJobType('date_conditions', jobType)) {
      jilFields['date_conditions'] = '1';
    }

    // Conditions
    const conditions = topForm.get('conditions')?.value;
    if (conditions && Array.isArray(conditions) && conditions.length > 0 && this.isFieldAllowedForJobType('condition', jobType)) {
      const conditionString = this.buildConditionString(conditions);
      if (conditionString) {
        jilFields['condition'] = conditionString;
      }
    }

    // Alarm settings
    const alarmIfFail = topForm.get('alarm_if_fail')?.value;
    if (alarmIfFail && this.isFieldAllowedForJobType('alarm_if_fail', jobType)) {
      jilFields['alarm_if_fail'] = alarmIfFail;
    }

    const alarmIfTerminated = topForm.get('alarm_if_terminated')?.value;
    if (alarmIfTerminated && this.isFieldAllowedForJobType('alarm_if_terminated', jobType)) {
      jilFields['alarm_if_terminated'] = alarmIfTerminated;
    }

    // Status
    const status = topForm.get('status')?.value;
    if (status && this.isFieldAllowedForJobType('status', jobType)) {
      jilFields['status'] = status;
    }

    // Auto-detect additional fields from top form (filtered)
    this.autoDetectAdditionalFieldsFiltered(topForm, jilFields, jobType);
  }

  private collectEnvironmentFieldsToMap(jobForm: FormGroup, environment: string, jilFields: {[key: string]: string}) {
    // Owner
    const owner = jobForm.get(`${environment}_owner`)?.value;
    if (owner) {
      jilFields['owner'] = owner;
    }

    // Machine
    const machine = jobForm.get(`${environment}_machine`)?.value;
    if (machine) {
      jilFields['machine'] = machine;
    }

    // Command (quoted)
    const command = jobForm.get(`${environment}_command`)?.value;
    if (command) {
      jilFields['command'] = `"${command}"`;
    }
  }

  private collectJobSpecificFieldsFiltered(jobForm: FormGroup, jobType: string, jilFields: {[key: string]: string}) {
    switch (jobType) {
      case 'cmd':
        this.collectCmdFieldsFiltered(jobForm, jilFields);
        break;
      case 'fw':
        this.collectFwFieldsFiltered(jobForm, jilFields);
        break;
      case 'cfw':
        this.collectCfwFieldsFiltered(jobForm, jilFields);
        break;
      case 'box':
        this.collectBoxFieldsFiltered(jobForm, jilFields);
        break;
    }

    // Auto-detect any additional job-specific fields (filtered)
    this.autoDetectJobSpecificFieldsFiltered(jobForm, jilFields, jobType);
  }

  private collectCmdFieldsFiltered(jobForm: FormGroup, jilFields: {[key: string]: string}) {
    const stdOutFile = jobForm.get('std_out_file')?.value;
    if (stdOutFile) {
      jilFields['std_out_file'] = `"${stdOutFile}"`;
    }

    const stdErrFile = jobForm.get('std_err_file')?.value;
    if (stdErrFile) {
      jilFields['std_err_file'] = `"${stdErrFile}"`;
    }

    const profile = jobForm.get('profile')?.value;
    if (profile) {
      jilFields['profile'] = profile;
    }
  }

  private collectFwFieldsFiltered(jobForm: FormGroup, jilFields: {[key: string]: string}) {
    const watchFile = jobForm.get('watch_file')?.value;
    if (watchFile) {
      jilFields['watch_file'] = `"${watchFile}"`;
    }

    const watchInterval = jobForm.get('watch_interval')?.value;
    if (watchInterval) {
      jilFields['watch_interval'] = watchInterval;
    }

    const maxRunAlarm = jobForm.get('max_run_alarm')?.value;
    if (maxRunAlarm) {
      jilFields['max_run_alarm'] = maxRunAlarm;
    }

    const jobLoad = jobForm.get('job_load')?.value;
    if (jobLoad) {
      jilFields['job_load'] = jobLoad;
    }

    const priority = jobForm.get('priority')?.value;
    if (priority) {
      jilFields['priority'] = priority;
    }
  }

  private collectCfwFieldsFiltered(jobForm: FormGroup, jilFields: {[key: string]: string}) {
    const watchFile = jobForm.get('watch_file')?.value;
    if (watchFile) {
      jilFields['watch_file'] = `"${watchFile}"`;
    }

    const watchInterval = jobForm.get('watch_interval')?.value;
    if (watchInterval) {
      jilFields['watch_interval'] = watchInterval;
    }

    const jobLoad = jobForm.get('job_load')?.value;
    if (jobLoad) {
      jilFields['job_load'] = jobLoad;
    }

    const priority = jobForm.get('priority')?.value;
    if (priority) {
      jilFields['priority'] = priority;
    }
  }

  private collectBoxFieldsFiltered(jobForm: FormGroup, jilFields: {[key: string]: string}) {
    const startTime = jobForm.get('start_time')?.value;
    if (startTime) {
      jilFields['start_times'] = `${startTime}`;
    }
  }

  // Helper method to check if a field is allowed for a specific job type
  private isFieldAllowedForJobType(fieldName: string, jobType: string): boolean {
    // Check if field is globally excluded
    if (EXCLUDED_FROM_JIL.includes(fieldName)) {
      return false;
    }

    // Check job-type specific restrictions
    const restrictions = JOB_TYPE_RESTRICTIONS[jobType as keyof typeof JOB_TYPE_RESTRICTIONS];
    if (restrictions && restrictions.includes(fieldName)) {
      return false;
    }

    return true;
  }

  // Auto-detect additional fields from top form (with filtering)
  private autoDetectAdditionalFieldsFiltered(form: FormGroup, jilFields: {[key: string]: string}, jobType: string) {
    Object.keys(form.controls).forEach(controlKey => {
      // Skip if already processed
      if (jilFields[controlKey]) {
        return;
      }

      // Skip if field is not allowed for this job type
      if (!this.isFieldAllowedForJobType(controlKey, jobType)) {
        return;
      }

      // Skip environment-specific fields (they contain underscores with env names)
      if (controlKey.includes('_') && ['dev', 'uat', 'prod', 'cob'].some(env => controlKey.startsWith(env + '_'))) {
        return;
      }

      // Skip complex fields like arrays and objects
      const control = form.get(controlKey);
      if (control && this.hasValidValue(control.value)) {
        const value = control.value;

        // Only include simple values (string, number, boolean)
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          jilFields[controlKey] = value.toString();
        }
      }
    });
  }

  // Auto-detect job-specific fields (with filtering)
  private autoDetectJobSpecificFieldsFiltered(jobForm: FormGroup, jilFields: {[key: string]: string}, jobType: string) {
    const explicitlyHandledFields = this.getExplicitlyHandledFieldsForJobType(jobType);

    Object.keys(jobForm.controls).forEach(controlKey => {
      // Skip if already processed or explicitly handled
      if (jilFields[controlKey] || explicitlyHandledFields.includes(controlKey)) {
        return;
      }

      // Skip if field is not allowed for this job type
      if (!this.isFieldAllowedForJobType(controlKey, jobType)) {
        return;
      }

      // Skip environment-specific fields
      if (controlKey.includes('_') && ['dev', 'uat', 'prod', 'cob'].some(env => controlKey.startsWith(env + '_'))) {
        return;
      }

      // Skip complex fields
      const control = jobForm.get(controlKey);
      if (control && this.hasValidValue(control.value)) {
        const value = control.value;

        // Only include simple values
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          jilFields[controlKey] = value.toString();
        }
      }
    });
  }

  private getExplicitlyHandledFieldsForJobType(jobType: string): string[] {
    const baseFields = ['funofjob', 'jobtitle', 'box_name'];

    switch (jobType) {
      case 'cmd':
        return [...baseFields, 'std_out_file', 'std_err_file', 'profile'];
      case 'fw':
        return [...baseFields, 'watch_file', 'watch_interval', 'max_run_alarm', 'job_load', 'priority'];
      case 'cfw':
        return [...baseFields, 'watch_file', 'watch_interval', 'job_load', 'priority'];
      case 'box':
        return [...baseFields, 'start_time'];
      default:
        return baseFields;
    }
  }

  // Generate JIL content in the order defined by the enum
  private generateOrderedJIL(jilFields: {[key: string]: string}): string {
    let jil = '';

    // Create array of field entries with their order values
    const fieldEntries = Object.entries(jilFields).map(([fieldName, value]) => ({
      fieldName,
      value,
      order: getFieldOrder(fieldName)
    }));

    // Sort by order value
    fieldEntries.sort((a, b) => a.order - b.order);

    // Generate JIL content in sorted order
    fieldEntries.forEach(entry => {
      jil += `${entry.fieldName}: ${entry.value}\n`;
    });

    return jil;
  }

  private buildConditionString(conditions: any[]): string {
    return conditions
      .map((condition, index) => {
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

  private hasValidValue(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'number') return !isNaN(value);
    if (Array.isArray(value)) return value.length > 0;
    return !!value;
  }

  private downloadFile(content: string, fileName: string) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
