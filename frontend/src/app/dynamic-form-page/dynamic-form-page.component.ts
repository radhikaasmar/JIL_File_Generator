import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, HostListener } from '@angular/core';
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
import { JilOutputComponent } from '../components/jil-output/jil-output.component';
import { CalendarService, CustomCalendar } from '../services/calendar.service';

@Component({
  selector: 'app-dynamic-form-page',
  templateUrl: './dynamic-form-page.component.html',
  standalone: true,
  imports: [DynamicFormViewerComponent, RouterModule, CommonModule, ReactiveFormsModule, JilOutputComponent],
  styleUrls: ['./dynamic-form-page.component.css']
})
export class DynamicFormPageComponent implements OnInit {
  subformInstances: SubformInstance[] = [];
  subformConfigs: {[key: string]: ResolvedSubformConfig} = {};
  
  // Add Function Button Properties
  showAddCmdDropdown: boolean = false;
  
  // JIL Preview Properties
  showJILPreview: boolean = false;
  previewJILContent: string = '';
  previewEnvironment: string = '';
  previewJobName: string = '';
  
  // Navigation tab properties
  activeNavTab: string = '';
  
  // Collapsed subforms state
  collapsedSubforms: {[key: string]: boolean} = {};
  
  // Collapsed sections
  collapsedSections: {[key: string]: boolean} = {};

  constructor(
    private questionService: DynamicQuestionService,
    private formBuilder: DynamicFormBuilderService,
    private subformConfigService: SubformConfigService,
    private functionJobMappingService: FunctionJobMappingService,
    private environmentStateService: EnvironmentStateService,
    private daysOfWeekService: DaysOfWeekService,
    private loadFrequencyService: LoadFrequencyService,
    private calendarService: CalendarService
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
    
    // Set default collapsed state
    setTimeout(() => {
      this.subformInstances.forEach(instance => {
        // For example, collapse non-essential subforms by default
        if (instance.type !== 'top' && instance.type !== 'box') {
          this.collapsedSubforms[instance.id] = true;
        }
      });
    }, 100);
  }

  // Navigation tab functionality
  scrollToSubform(instanceId: string): void {
    this.activeNavTab = instanceId;
    const element = document.getElementById(`subform-${instanceId}`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest' 
      });
    }
  }

  // Get tab icon based on subform type
  getTabIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'top': '⚙️',
      'box': '📦',
      'cmd': '💻',
      'fw': '👁️',
      'cfw': '🔍'
    };
    return icons[type] || '📋';
  }
  // Get instance count for grouping
  getInstanceCount(type: string): number {
    return this.subformInstances.filter(instance => instance.type === type).length;
  }

  // Get instance number for display
  getInstanceNumber(instance: SubformInstance): number {
    const sameTypeInstances = this.subformInstances.filter(
      inst => inst.type === instance.type
    );
    return sameTypeInstances.indexOf(instance) + 1;
  }

  // Update active tab on scroll
  @HostListener('window:scroll')
  onWindowScroll(): void {
    const scrollPosition = window.pageYOffset;
    
    for (const instance of this.subformInstances) {
      const element = document.getElementById(`subform-${instance.id}`);
      if (element) {
        const rect = element.getBoundingClientRect();
        const elementTop = rect.top + scrollPosition;
        
        if (scrollPosition >= elementTop - 100) {
          this.activeNavTab = instance.id;
        }
      }
    }
  }
  // Toggle subform collapse
  toggleSubformCollapse(instanceId: string): void {
    this.collapsedSubforms[instanceId] = !this.collapsedSubforms[instanceId];
  }

  // Check if subform is collapsed
  isSubformCollapsed(instanceId: string): boolean {
    return this.collapsedSubforms[instanceId] || false;
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

  toggleCmdDropdown(): void {
    this.showAddCmdDropdown = !this.showAddCmdDropdown;
  }

  private initializeDefaultSubforms() {
    // Always add top subform
    this.addSubformInstance('top', 'Common Configuration', false);
    // Always add box subform
    this.addSubformInstance('box', 'Box Job', false, 'boxfunc');
  }

  private addSubformInstance(type: string, displayName: string, removable: boolean, functionOfJob?: string) {
    const config = this.subformConfigs[type];
    if (!config) return;

    const form = this.formBuilder.buildSubform(config.sections);

    // Pre-fill function and job type if provided
    if (functionOfJob) {
      const functionOption = this.functionJobMappingService.getFunctionJobOption(functionOfJob);
      if (functionOption) {
        // Use different field names based on job type
        if (type === 'box') {
          form.get('funofbox')?.setValue(functionOfJob);
        } else {
          form.get('funofjob')?.setValue(functionOfJob);
        }
        // Job type should always be set and fixed for all subforms
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

  // **NEW: Get CMD function options**
  getCmdOptions(): FunctionJobOption[] {
    return this.allFunctionOptions.filter(option =>
      option.subformType === 'cmd' && option.value !== 'boxfunc'
    );
  }

  // **NEW: Add CMD function with numbered instances**
  addCmdFunction(option: FunctionJobOption): void {
    const existingInstances = this.subformInstances.filter(
      instance => instance.functionOfJob === option.value
    );
    const instanceNumber = existingInstances.length + 1;
    const displayName = `${option.label.toUpperCase()} #${instanceNumber}`;
    
    this.addSubformInstance('cmd', displayName, true, option.value);
    
    // Set default values for new instance
    const selectedEnvs = this.environmentStateService.getSelectedEnvironments();
    const newInstance = this.subformInstances[this.subformInstances.length - 1];
    this.setDefaultMachineValues(newInstance, selectedEnvs);
    
    // Propagate owner values from box if exists
    const boxInstance = this.subformInstances.find(s => s.type === 'box');
    if (boxInstance) {
      this.propagateOwnerValuesFromBox(boxInstance.form);
    }
    
    this.sortSubformInstances();
    // Close dropdown after selection
    this.showAddCmdDropdown = false;
  }

  // **NEW: Add FW function (allows duplicates)**
  addFwFunction(): void {
    const existingInstances = this.subformInstances.filter(
      instance => instance.functionOfJob === 'fw'
    );
    const instanceNumber = existingInstances.length + 1;
    const displayName = instanceNumber > 1 ? `FW #${instanceNumber}` : 'FW';
    
    this.addSubformInstance('fw', displayName, true, 'fw');
    
    // Set default values for new instance
    const selectedEnvs = this.environmentStateService.getSelectedEnvironments();
    const newInstance = this.subformInstances[this.subformInstances.length - 1];
    this.setDefaultMachineValues(newInstance, selectedEnvs);
    
    // Propagate owner values from box if exists
    const boxInstance = this.subformInstances.find(s => s.type === 'box');
    if (boxInstance) {
      this.propagateOwnerValuesFromBox(boxInstance.form);
    }
    
    this.sortSubformInstances();
  }

  // **NEW: Add CFW function (allows duplicates)**
  addCfwFunction(): void {
    const existingInstances = this.subformInstances.filter(
      instance => instance.functionOfJob === 'cfw'
    );
    const instanceNumber = existingInstances.length + 1;
    const displayName = instanceNumber > 1 ? `CFW #${instanceNumber}` : 'CFW';
    
    this.addSubformInstance('cfw', displayName, true, 'cfw');
    
    // Set default values for new instance
    const selectedEnvs = this.environmentStateService.getSelectedEnvironments();
    const newInstance = this.subformInstances[this.subformInstances.length - 1];
    this.setDefaultMachineValues(newInstance, selectedEnvs);
    
    // Propagate owner values from box if exists
    const boxInstance = this.subformInstances.find(s => s.type === 'box');
    if (boxInstance) {
      this.propagateOwnerValuesFromBox(boxInstance.form);
    }
    
    this.sortSubformInstances();
  }

  // **NEW: Close dropdown when clicking outside**
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.function-button-group')) {
      this.showAddCmdDropdown = false;
    }
  }

  get allFunctionOptions(): FunctionJobOption[] {
    const options = this.functionJobMappingService.getAllFunctionJobOptions();
    return options.sort((a, b) => {
      // Box type (boxfunc) always comes first
      if (a.value === 'boxfunc' && b.value !== 'boxfunc') return -1;
      if (a.value !== 'boxfunc' && b.value === 'boxfunc') return 1;
      // For other types, maintain alphabetical order by label
      return 0;
    });
  }

  removeSubformInstance(instanceId: string) {
    this.subformInstances = this.subformInstances.filter(instance => instance.id !== instanceId);
    this.updateJobNames();
    // Sort to maintain proper order
    this.sortSubformInstances();
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
    
    // Update box names for CMD, CFW, FW subforms - directly use box job name
    const boxInstance = this.subformInstances.find(s => s.type === 'box');
    if (boxInstance) {
      const boxJobName = this.getJobNameForInstance(boxInstance);
      this.subformInstances
        .filter(instance => ['cmd', 'cfw', 'fw'].includes(instance.type))
        .forEach(instance => {
          instance.form.get('box_name')?.setValue(boxJobName);
        });
    }
  }

  // **FIXED: Generate base job name from common configuration only**
  private generateBaseJobName(topForm: FormGroup): string {
    // Only include fields that exist in common configuration
    const commonFields = ['csi', 'efforttype', 'prodlob', 'loadfreq'];
    const values = commonFields.map(f => topForm.get(f)?.value || '').map(v => v.toString().toUpperCase());
    return values.filter(v => v !== '').join('_');
  }

  // **FIXED: Generate truncated base job name for display in common configuration**
  private generateTruncatedBaseJobName(topForm: FormGroup): string {
    const commonFields = ['csi', 'efforttype', 'prodlob', 'loadfreq'];
    const values = commonFields.map(f => topForm.get(f)?.value || '').map(v => v.toString().toUpperCase());
    const nonEmptyValues = values.filter(v => v !== '');
    
    if (nonEmptyValues.length === 0) return 'Job name will appear here (complete in subforms)';
    
    const partialJobName = nonEmptyValues.join('_');
    return `${partialJobName}... (complete in subforms)`;
  }

  trackByInstanceId(index: number, instance: SubformInstance): string {
    return instance.id;
  }

  // **FIXED: Generate job name with correct field ordering and purpose/load layer from subforms**
  getJobNameForInstance(instance: SubformInstance): string {
    if (instance.type === 'top') {
      return this.generateTruncatedBaseJobName(instance.form);
    }
    
    const topInstance = this.subformInstances.find(s => s.type === 'top');
    if (!topInstance) return '';
    
    // Generate job name with correct field order: csi_effort type_prod/lob name_purpose_load frequency_load layer_function of box_job type
    return this.generateJobNameWithCorrectOrder(instance);
  }

  // **NEW: Generate job name with correct field order**
  private generateJobNameWithCorrectOrder(instance: SubformInstance): string {
    const topInstance = this.subformInstances.find(s => s.type === 'top');
    if (!topInstance) return '';
    
    // Collect values in the correct order: csi_effort type_prod/lob name_purpose_load frequency_load layer_function of box_job type
    const fieldOrder = [
      { key: 'csi', form: topInstance.form },
      { key: 'efforttype', form: topInstance.form },
      { key: 'prodlob', form: topInstance.form },
      { key: 'purpose', form: instance.form },
      { key: 'loadfreq', form: topInstance.form },
      { key: 'loadlayer', form: instance.form },
      // Use funofbox for box jobs, funofjob for all others
      { key: instance.type === 'box' ? 'funofbox' : 'funofjob', form: instance.form },
    ];
    
    // ALWAYS add job type for ALL subforms
    fieldOrder.push({ key: 'jobtitle', form: instance.form });
    
    const values = fieldOrder.map(field => {
      const value = field.form.get(field.key)?.value || '';
      return value.toString().toUpperCase();
    });
    
    const nonEmptyValues = values.filter(v => v !== '');
    const fullJobName = nonEmptyValues.join('_');
    
    // Apply truncation if needed
    return this.applySmartTruncation(fullJobName, values);
  }

  // **NEW: Smart truncation that prioritizes purpose field**
  private applySmartTruncation(fullJobName: string, orderedValues: string[]): string {
    if (fullJobName.length <= 60) {
      return fullJobName;
    }
    
    const purposeIndex = 3; // Purpose is 4th field (index 3)
    const purpose = orderedValues[purposeIndex] || '';
    
    if (purpose.length === 0) {
      return fullJobName.substring(0, 60);
    }
    
    // Calculate space needed for all other fields
    const otherValues = [...orderedValues];
    otherValues[purposeIndex] = '';
    const otherFieldsLength = otherValues.filter(v => v !== '').join('_').length;
    
    // Calculate available space for purpose (including underscore)
    const availableForPurpose = 60 - otherFieldsLength - 1;
    
    if (availableForPurpose <= 0) {
      return otherValues.filter(v => v !== '').join('_').substring(0, 60);
    }
    
    // Truncate purpose and rebuild
    const truncatedValues = [...orderedValues];
    truncatedValues[purposeIndex] = purpose.substring(0, availableForPurpose);
    
    return truncatedValues.filter(v => v !== '').join('_');
  }

  // Add method to generate full job name for truncation check
  private generateFullJobNameForTruncationCheck(instance: SubformInstance): string {
    const topInstance = this.subformInstances.find(s => s.type === 'top');
    if (!topInstance) return '';
    
    // Generate the full job name without any truncation
    const fieldOrder = [
      { key: 'csi', form: topInstance.form },
      { key: 'efforttype', form: topInstance.form },
      { key: 'prodlob', form: topInstance.form },
      { key: 'purpose', form: instance.form },
      { key: 'loadfreq', form: topInstance.form },
      { key: 'loadlayer', form: instance.form },
      { key: instance.type === 'box' ? 'funofbox' : 'funofjob', form: instance.form },
    ];
    
    // Add job type only for non-FW/CFW jobs
    if (instance.type !== 'fw' && instance.type !== 'cfw') {
      fieldOrder.push({ key: 'jobtitle', form: instance.form });
    }
    
    const values = fieldOrder.map(field => {
      const value = field.form.get(field.key)?.value || '';
      return value.toString().toUpperCase();
    });
    
    return values.filter(v => v !== '').join('_');
  }

  // **FIXED: Check if job name is truncated for each subform**
  isJobNameTruncated(instance: SubformInstance): boolean {
    const topInstance = this.subformInstances.find(s => s.type === 'top');
    if (!topInstance) return false;
    
    if (instance.type === 'top') {
      // For top form, check if partial job name indicates truncation
      const commonFields = ['csi', 'efforttype', 'prodlob', 'loadfreq'];
      const values = commonFields.map(f => instance.form.get(f)?.value || '').map(v => v.toString().toUpperCase());
      const fullJobName = values.filter(v => v !== '').join('_');
      return fullJobName.length > 60;
    }
    
    // For subforms, check if the full job name would be truncated
    const fullJobName = this.generateFullJobNameForTruncationCheck(instance);
    return fullJobName.length > 60;
  }

  getDebugInfo(): any {
    return {
      subformCount: this.subformInstances.length,
      availableFunctions: this.allFunctionOptions.length,
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
  // JIL Preview and Download methods
  previewJILForEnvironment(environment: string) {
    const topInstance = this.subformInstances.find(s => s.type === 'top');
    if (!topInstance) {
      alert('No configuration found to generate JIL preview');
      return;
    }

    const selectedEnvs = this.getSelectedEnvironments(topInstance.form);
    if (!selectedEnvs.includes(environment)) {
      alert(`${environment.toUpperCase()} environment is not selected`);
      return;
    }

    const baseJobName = this.generateBaseJobName(topInstance.form);
    if (!baseJobName) {
      alert('Please fill in the required fields to generate job name');
      return;
    }

    // Generate JIL content for preview
    const jilContent = this.generateJILContent(environment, baseJobName, topInstance);
    
    // Set preview data
    this.previewJILContent = jilContent;
    this.previewEnvironment = environment;
    this.previewJobName = baseJobName;
    this.showJILPreview = true;
  }

  closeJILPreview() {
    this.showJILPreview = false;
    this.previewJILContent = '';
    this.previewEnvironment = '';
    this.previewJobName = '';
  }

 downloadFromPreview(event: { content: string; fileName: string }): void {
    this.downloadFile(event.content, event.fileName);
  }

  getAvailableEnvironments(): string[] {
    const topInstance = this.subformInstances.find(s => s.type === 'top');
    if (!topInstance) return [];
    
    return this.getSelectedEnvironments(topInstance.form);
  }

  toggleSectionCollapse(sectionId: string) {
    this.collapsedSections[sectionId] = !this.collapsedSections[sectionId];
  }

  isSectionCollapsed(sectionId: string): boolean {
    return this.collapsedSections[sectionId] || false;
  }

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
onCalendarSelected(calendarName: string) {
  const topInstance = this.subformInstances.find(s => s.type === 'top');
  if (topInstance) {
    const runCalendarControl = topInstance.form.get('run_calendar');
    if (runCalendarControl) {
      runCalendarControl.setValue(calendarName);
      runCalendarControl.markAsTouched();
    }
    this.updateJobNames();
  }
}

onCustomCalendarCreated(calendar: CustomCalendar) {
  const topInstance = this.subformInstances.find(s => s.type === 'top');
  if (topInstance) {
    const runCalendarControl = topInstance.form.get('run_calendar');
    if (runCalendarControl) {
      runCalendarControl.setValue(calendar.extendedCalendar);
      runCalendarControl.markAsTouched();
    }
    this.updateJobNames();
  }
}

  private generateJILContent(environment: string, baseJobName: string, topInstance: SubformInstance): string {
    let jilContent = '';
  
  // Add custom calendars at the top
  const customCalendars = this.calendarService.getCustomCalendars();
  customCalendars.forEach(calendar => {
    jilContent += this.calendarService.generateCalendarJIL(calendar);
    jilContent += '\n\n';
  });
    
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

  private generateDynamicJobJIL(environment: string, baseJobName: string, topInstance: SubformInstance, jobInstance: SubformInstance, jobType: string): string {
    const jobForm = jobInstance.form;
    const topForm = topInstance.form;
    
    // Use the existing getJobNameForInstance method to generate job name
    const jobName = this.getJobNameForInstance(jobInstance);
    
    // Get jobtitle for job_type field
    const jobtitle = jobForm.get('jobtitle')?.value || '';
    
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
    // Process conditions for all job types
    const conditions = jobForm.get('conditions')?.value;
    if (conditions && Array.isArray(conditions) && conditions.length > 0) {
      const conditionString = this.buildConditionString(conditions);
      if (conditionString) {
        jilFields['condition'] = conditionString;
      }
    }

    // Then continue with existing switch statement
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
  // Use different field names based on job type
  const functionField = jobType === 'box' ? 'funofbox' : 'funofjob';
  const baseFields = [functionField, 'jobtitle', 'box_name', 'purpose', 'loadlayer'];

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

  private sortSubformInstances(): void {
    this.subformInstances.sort((a, b) => {
      // Define the desired order
      const typeOrder = {
        'top': 0,  // Common Configuration always first
        'box': 1,  // Box type always second
        'cmd': 2,  // CMD types after box
        'fw': 2,   // FW types after CMD
        'cfw': 2   // CFW types last
      };

      const orderA = typeOrder[a.type as keyof typeof typeOrder] ?? 999;
      const orderB = typeOrder[b.type as keyof typeof typeOrder] ?? 999;

      return orderA - orderB;
    });
  }
}
