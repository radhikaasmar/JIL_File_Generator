import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { debounceTime, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FormService {
  mainForm: FormGroup;
  private storageKey = 'jilFormData';

  constructor(private fb: FormBuilder) {
    this.mainForm = this.fb.group({
      boxJobs: this.fb.array([]),
      fileWatchers: this.fb.array([]),
      dqJobs: this.fb.array([]),
      ingestionJobs: this.fb.array([])
    });

    this.mainForm.valueChanges.pipe(
      debounceTime(500), // Wait for 500ms of inactivity before saving
      tap(value => {
        this.saveFormsToLocalStorage();
      })
    ).subscribe();
  }

  get boxJobs(): FormArray {
    return this.mainForm.get('boxJobs') as FormArray;
  }

  get fileWatchers(): FormArray {
    return this.mainForm.get('fileWatchers') as FormArray;
  }

  get dqJobs(): FormArray {
    return this.mainForm.get('dqJobs') as FormArray;
  }

  get ingestionJobs(): FormArray {
    return this.mainForm.get('ingestionJobs') as FormArray;
  }

  loadFormsFromLocalStorage() {
    const savedData = localStorage.getItem(this.storageKey);
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      this.clearAllForms();

      parsedData.boxJobs.forEach((jobData: any) => this.boxJobs.push(this.createBoxJobForm(jobData)));
      parsedData.fileWatchers.forEach((jobData: any) => this.fileWatchers.push(this.createFileWatcherForm(jobData)));
      parsedData.dqJobs.forEach((jobData: any) => this.dqJobs.push(this.createDQJobForm(jobData)));
      parsedData.ingestionJobs.forEach((jobData: any) => this.ingestionJobs.push(this.createIngestionJobForm(jobData)));
    }
  }

  hasStoredData(): boolean {
    return !!localStorage.getItem(this.storageKey);
  }

  saveFormsToLocalStorage() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.mainForm.getRawValue()));
  }

  clearLocalStorage() {
    localStorage.removeItem(this.storageKey);
  }
  
  clearAllForms() {
    this.boxJobs.clear();
    this.fileWatchers.clear();
    this.dqJobs.clear();
    this.ingestionJobs.clear();
  }

  createBoxJobForm(data?: any): FormGroup {
    const formGroup = this.fb.group({
      csi: ['169912', Validators.required],
      efforttype: ['reg', Validators.required],
      prodlob: ['', Validators.required],
      purpose: ['', Validators.required],
      loadfreq: ['', Validators.required],
      loadlayer: ['', Validators.required],
      funofjob: ['', Validators.required],
      jobtitle: ['', Validators.required],
      owner: ['', Validators.required],
      alarmFail: ['n', Validators.required],
      alarmTerm: ['y', Validators.required],
      dateCond: ['n', Validators.required],
      timezone: ['us central', Validators.required],
      runCalendar: ['', Validators.required],
      startTime: ['', Validators.required],
      sendNotif: ['y', Validators.required],
      status: ['', Validators.required],
    });
    if (data) {
      formGroup.patchValue(data);
    }
    return formGroup;
  }

  createFileWatcherForm(data?: any): FormGroup {
    const formGroup = this.fb.group({
      csi: ['169912', Validators.required],
      efforttype: ['reg', Validators.required],
      prodlob: ['', Validators.required],
      purpose: ['', Validators.required],
      loadfreq: ['', Validators.required],
      loadlayer: ['', Validators.required],
      funofjob: ['', Validators.required],
      jobtitle: ['fw', Validators.required],
      owner: ['', Validators.required],
      alarmFail: ['n', Validators.required],
      alarmTerm: ['y', Validators.required],
      dateCond: ['n', Validators.required],
      timezone: ['us central', Validators.required],
      runCalendar: ['', Validators.required],
      startTime: ['', Validators.required],
      sendNotif: ['y', Validators.required],
      status: ['', Validators.required],
    });
    if (data) {
      formGroup.patchValue(data);
    }
    return formGroup;
  }

  createDQJobForm(data?: any): FormGroup {
    const formGroup = this.fb.group({
      description: ['', Validators.required],
      machine: ['', Validators.required],
      owner: ['', Validators.required],
      alarmFail: ['n', Validators.required],
      alarmTerm: ['y', Validators.required],
      timezone: ['us central', Validators.required],
      profile: ['', Validators.required],
      sendNotif: ['y', Validators.required],
      stdOutFile: ['', Validators.required],
      stdErrFile: ['', Validators.required],
      command: ['', Validators.required],
      status: ['', Validators.required],
    });
    if (data) {
      formGroup.patchValue(data);
    }
    return formGroup;
  }

  createIngestionJobForm(data?: any): FormGroup {
    const formGroup = this.fb.group({
      description: ['', Validators.required],
      machine: ['', Validators.required],
      owner: ['', Validators.required],
      alarmFail: ['n', Validators.required],
      alarmTerm: ['y', Validators.required],
      timezone: ['us central', Validators.required],
      profile: ['', Validators.required],
      sendNotif: ['y', Validators.required],
      stdOutFile: ['', Validators.required],
      stdErrFile: ['', Validators.required],
      command: ['', Validators.required],
      status: ['', Validators.required],
    });
    if (data) {
      formGroup.patchValue(data);
    }
    return formGroup;
  }

  generateJIL(boxJobForm: FormGroup, fileWatcherForm?: FormGroup, showFileWatcher: boolean = false): string {
    const v = boxJobForm.getRawValue();
    const boxJobName = `csi_${v.csi}_${v.efforttype}_${v.prodlob}_${v.purpose}_${v.loadfreq}_${v.loadlayer}_${v.funofjob}_${v.jobtitle}`;

    let jil = `insert_job: ${boxJobName}\n` +
      `job_type: BOX\n` +
      `owner: ${v.owner}\n` +
      `permission: gx,ge,wx,we,mx,me\n` +
      `alarm_if_fail: ${v.alarmFail === 'y' ? 1 : 0}\n` +
      `alarm_if_terminated: ${v.alarmTerm === 'y' ? 1 : 0}\n` +
      `date_conditions: ${v.dateCond === 'y' ? 1 : 0}\n` +
      `timezone: ${v.timezone}\n` +
      `run_calendar: ${v.runCalendar}\n` +
      `start_times: "${v.startTime}"\n` +
      `send_notification: ${v.sendNotif === 'y' ? 1 : 0}\n` +
      `status: ${v.status}`;

    if (showFileWatcher && fileWatcherForm) {
      const fw = fileWatcherForm.getRawValue();
      const fileWatcherJobName = `csi_${fw.csi}_${fw.efforttype}_${fw.prodlob}_${fw.purpose}_${fw.loadfreq}_${fw.loadlayer}_${fw.funofjob}_${fw.jobtitle}`;

      const fileWatcherJIL = `\n\n\n\n` +
        `insert_job: ${fileWatcherJobName}\n` +
        `job_type: FW\n` +
        `owner: ${fw.owner}\n` +
        `box_name: ${boxJobName}\n` +
        `alarm_if_fail: ${fw.alarmFail === 'y' ? 1 : 0}\n` +
        `alarm_if_terminated: ${fw.alarmTerm === 'y' ? 1 : 0}\n` +
        `date_conditions: ${fw.dateCond === 'y' ? 1 : 0}\n` +
        `timezone: ${fw.timezone}\n` +
        `run_calendar: ${fw.runCalendar}\n` +
        `start_times: "${fw.startTime}"\n` +
        `send_notification: ${fw.sendNotif === 'y' ? 1 : 0}\n` +
        `status: ${fw.status}`;

      jil += fileWatcherJIL;
    }

    return jil;
  }
} 