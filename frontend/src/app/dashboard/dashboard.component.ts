import { Component, OnInit } from '@angular/core';
import { FormArray, FormGroup,Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BoxJobComponent } from '../components/box-job/box-job.component';
import { FileWatcherComponent } from '../components/file-watcher/file-watcher.component';
import { JilOutputComponent } from '../components/jil-output/jil-output.component';
import { CmdJobComponent } from '../components/cmd-job/cmd-job.component';
import { CfwJobComponent } from '../components/cfw-job/cfw-job.component';
import { FormService } from '../services/form.service';
import { AbstractControl } from '@angular/forms';
// import { FormGroup, FormControl, ReactiveFormsModule, FormArray, Validators } from '@angular/forms';

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

    if(this.allJobs.controls
  .filter(job => (job as FormGroup).get('type')?.value === 'box').length > 0) {
      this.subscribeToBoxJobChanges(0);
    }
  }

  subscribeToBoxJobChanges(index: number) {
    const boxJobForm = this.allJobs.controls
  .filter(job => (job as FormGroup).get('type')?.value === 'box').at(index);
    if (boxJobForm) {
      this.updateNamingConventions(boxJobForm as FormGroup);
      boxJobForm.valueChanges.subscribe(() => {
        this.updateNamingConventions(boxJobForm as FormGroup);
      });
    }
  }

get allJobs(): FormArray {
  return this.formService.allJobs;
}

addInitialBoxJob() {
  if (this.allJobs.length === 0) {
    const jobGroup = this.formService.fb.group({
      type: ['box', Validators.required],
      form: this.formService.createBoxJobForm()
    });
    this.allJobs.push(jobGroup);
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
    if (this.allJobs.controls
  .filter(job => (job as FormGroup).get('type')?.value === 'box').length > 0) {
      const firstBoxJob = this.allJobs.controls
  .filter(job => (job as FormGroup).get('type')?.value === 'box').at(0) as FormGroup;
      this.generatedJIL = this.formService.generateJIL(firstBoxJob);
      this.showJIL = true;
    }
  }

  // Add this method to generate combined JIL for all jobs
generateAllJIL(): string {
  let jil = '';

  this.allJobs.controls.forEach(jobCtrl => {
    const job = jobCtrl as FormGroup;
    const type = job.get('type')?.value;
    const form = job.get('form') as FormGroup;

    switch (type) {
      case 'box':
        jil += this.formService.generateJIL(form);
        break;
      case 'fw':
        jil += this.formService.generateJIL(form);
        break;
      case 'cmd':
        jil += this.formService.generateCmdJIL(form);
        break;
      case 'cfw':
        jil += this.formService.generateCfwJIL(form);
        break;
    }

    jil += '\n\n';
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
  this.allJobs.push(this.formService.fb.group({
    type: ['fw'],
    form: this.formService.createFileWatcherForm()
  }));
}

addCmdJob() {
  this.allJobs.push(this.formService.fb.group({
    type: ['cmd'],
    form: this.formService.createCmdJobForm()
  }));
}

addCfwJob() {
  this.allJobs.push(this.formService.fb.group({
    type: ['cfw'],
    form: this.formService.createCfwJobForm()
  }));
}

removeJob(index: number) {
  this.allJobs.removeAt(index);
}

  isFormInvalid(formArray: FormArray): boolean {
    return formArray.controls.some(control => control.invalid);
  }

  toFormGroup(control: AbstractControl | null): FormGroup {
    return control as FormGroup;
  }
}
