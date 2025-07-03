import { Component, OnInit } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BoxJobComponent } from '../components/box-job/box-job.component';
import { FileWatcherComponent } from '../components/file-watcher/file-watcher.component';
import { JilOutputComponent } from '../components/jil-output/jil-output.component';
import { CmdJobComponent } from '../components/cmd-job/cmd-job.component';
import { CfwJobComponent } from '../components/cfw-job/cfw-job.component';
import { FormService } from '../services/form.service';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  standalone: true,
  imports: [CommonModule, BoxJobComponent, FileWatcherComponent, JilOutputComponent, CmdJobComponent, CfwJobComponent]
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
  get cmdJobs(): FormArray {
    return this.formService.cmdJobs;
  }
  get cfwJobs(): FormArray {
    return this.formService.cfwJobs;
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

  // Add this method to generate combined JIL for all jobs
  generateAllJIL(): string {
    let jil = '';

    // Box Jobs
    this.boxJobs.controls.forEach((ctrl, idx) => {
      jil += this.formService.generateJIL(ctrl as FormGroup);
      jil += '\n\n';
    });

    // File Watcher Jobs
    this.fileWatcherJobs.controls.forEach((ctrl, idx) => {
      jil += this.formService.generateJIL(ctrl as FormGroup);
      jil += '\n\n';
    });

    // CMD Jobs
    this.cmdJobs.controls.forEach((ctrl, idx) => {
      // You may want to implement generateCmdJIL in FormService for proper formatting
      if (this.formService.generateCmdJIL) {
        jil += this.formService.generateCmdJIL(ctrl as FormGroup);
        jil += '\n\n';
      }
    });

    // CFW Jobs
    this.cfwJobs.controls.forEach((ctrl, idx) => {
      // You may want to implement generateCfwJIL in FormService for proper formatting
      if (this.formService.generateCfwJIL) {
        jil += this.formService.generateCfwJIL(ctrl as FormGroup);
        jil += '\n\n';
      }
    });

    return jil.trim();
  }

  // Add this method to trigger the download
  downloadJILFile() {
    const content = this.generateAllJIL();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jobs.txt';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  addFileWatcherJob() {
    this.fileWatcherJobs.push(this.formService.createFileWatcherForm());
  }

  addCmdJob() {
    this.cmdJobs.push(this.formService.createCmdJobForm());
  }

  addCfwJob() {
    this.cfwJobs.push(this.formService.createCfwJobForm());
  }

  onDeleteFileWatcherJob(index: number) {
    this.fileWatcherJobs.removeAt(index);
  }

  onDeleteCmdJob(index: number) {
    this.cmdJobs.removeAt(index);
  }

  onDeleteCfwJob(index: number) {
    this.cfwJobs.removeAt(index);
  }

  isFormInvalid(formArray: FormArray): boolean {
    return formArray.controls.some(control => control.invalid);
  }

  toFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }
}
