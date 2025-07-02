import { Component, OnInit } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BoxJobComponent } from '../components/box-job/box-job.component';
import { FileWatcherComponent } from '../components/file-watcher/file-watcher.component';
import { JilOutputComponent } from '../components/jil-output/jil-output.component';
import { DqJobComponent } from '../components/dq-job/dq-job.component';
import { IngestionJobComponent } from '../components/ingestion-job/ingestion-job.component';
import { FormService } from '../services/form.service';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  standalone: true,
  imports: [CommonModule, BoxJobComponent, FileWatcherComponent, JilOutputComponent, DqJobComponent, IngestionJobComponent]
})
export class DashboardComponent implements OnInit {
  generatedJIL: string = '';
  showJIL: boolean = false;
  boxJobNaming: string = '';
  fileWatcherNaming: string = '';

  constructor(public formService: FormService) {}

  ngOnInit() {
    if (this.formService.hasStoredData()) {
      if (confirm('Previous form data found. Do you want to load it?')) {
        this.formService.loadFormsFromLocalStorage();
      } else {
        this.formService.clearLocalStorage();
        this.formService.clearAllForms();
        this.addInitialBoxJob(); // Start with one box job if clearing
      }
    } else {
      this.addInitialBoxJob(); // Start with one box job on first visit
    }

    if(this.boxJobs.length > 0) {
      this.subscribeToBoxJobChanges(0);
    }
  }

  subscribeToBoxJobChanges(index: number) {
    const boxJobForm = this.boxJobs.at(index);
    if (boxJobForm) {
      this.updateNamingConventions(boxJobForm as FormGroup);
      boxJobForm.valueChanges.subscribe(() => {
        this.updateNamingConventions(boxJobForm as FormGroup);
      });
    }
  }

  get boxJobs(): FormArray {
    return this.formService.boxJobs;
  }
  get fileWatcherJobs(): FormArray {
    return this.formService.fileWatchers;
  }
  get dqJobs(): FormArray {
    return this.formService.dqJobs;
  }
  get ingestionJobs(): FormArray {
    return this.formService.ingestionJobs;
  }

  addInitialBoxJob() {
    if (this.boxJobs.length === 0) {
      const boxJobForm = this.formService.createBoxJobForm();
      this.boxJobs.push(boxJobForm);
    }
  }
  
  updateNamingConventions(boxJobForm: FormGroup) {
    const v = boxJobForm.getRawValue();
    const csi = v.csi || '';
    const efforttype = v.efforttype || '';
    const prodlob = v.prodlob || '';
    const purpose = v.purpose || '';
    const loadfreq = v.loadfreq || '';
    const loadlayer = v.loadlayer || '';
    const funofjob = v.funofjob || '';
    const jobtitle = v.jobtitle || '';
    this.boxJobNaming = `${csi}_${efforttype}_${prodlob}_${purpose}_${loadfreq}_${loadlayer}_${funofjob}_${jobtitle}`;
    this.fileWatcherNaming = this.boxJobNaming + '_FW';
  }

  generateJIL() {
    // This will need to be updated to handle all job types and multiple instances
    if (this.boxJobs.length > 0) {
      const firstBoxJob = this.boxJobs.at(0) as FormGroup;
      this.generatedJIL = this.formService.generateJIL(firstBoxJob);
      this.showJIL = true;
    }
  }

  addFileWatcherJob() {
    this.fileWatcherJobs.push(this.formService.createFileWatcherForm());
  }

  addDQJob() {
    this.dqJobs.push(this.formService.createDQJobForm());
  }

  addIngestionJob() {
    this.ingestionJobs.push(this.formService.createIngestionJobForm());
  }

  onDeleteFileWatcherJob(index: number) {
    this.fileWatcherJobs.removeAt(index);
  }

  onDeleteDQJob(index: number) {
    this.dqJobs.removeAt(index);
  }

  onDeleteIngestionJob(index: number) {
    this.ingestionJobs.removeAt(index);
  }

  isFormInvalid(formArray: FormArray): boolean {
    return formArray.controls.some(control => control.invalid);
  }

  toFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }
} 