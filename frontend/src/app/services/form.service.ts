import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { debounceTime, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FormService {
  mainForm: FormGroup;
  private storageKey = 'jilFormData';

  constructor(public fb: FormBuilder) {
    this.mainForm = this.fb.group({
      allJobs: this.fb.array([])
    });

    this.mainForm.valueChanges.pipe(
      debounceTime(500),
      tap(value => {
        this.saveFormsToLocalStorage();
      })
    ).subscribe();
  }

  get allJobs(): FormArray {
    return this.mainForm.get('allJobs') as FormArray;
  }

  loadFormsFromLocalStorage() {
    const savedData = localStorage.getItem(this.storageKey);
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      this.clearAllForms();

      parsedData.allJobs.forEach((jobWrapper: any) => {
        const jobType = jobWrapper.type;
        const formData = jobWrapper.form;
        let formGroup: FormGroup;

        switch (jobType) {
          case 'box':
            formGroup = this.createBoxJobForm(formData);
            break;
          case 'fw':
            formGroup = this.createFileWatcherForm(formData);
            break;
          case 'cmd':
            formGroup = this.createCmdJobForm(formData);
            break;
          case 'cfw':
            formGroup = this.createCfwJobForm(formData);
            break;
          default:
            return;
        }

        this.allJobs.push(this.fb.group({ type: jobType, form: formGroup }));
      });
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
    this.allJobs.clear();
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

  createCmdJobForm(data?: any): FormGroup {
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

  createCfwJobForm(data?: any): FormGroup {
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

  // Add CMD JIL generator
  generateCmdJIL(cmdJobForm: FormGroup): string {
    const v = cmdJobForm.getRawValue();
    const jobName = `csi_${v.csi}_${v.efforttype}_${v.prodlob}_${v.purpose}_${v.loadfreq}_${v.loadlayer}_${v.funofjob}_${v.jobtitle}`;
    return `insert_job: ${jobName}
job_type: CMD
owner: ${v.owner}
permission: gx,ge,wx,we,mx,me
alarm_if_fail: ${v.alarmFail === 'y' || v.alarm_if_fail === 1 ? 1 : 0}
alarm_if_terminated: ${v.alarmTerm === 'y' || v.alarm_if_terminated === 1 ? 1 : 0}
timezone: ${v.timezone}
profile: ${v.profile || ''}
send_notification: ${v.sendNotif === 'y' ? 1 : 0}
std_out_file: ${v.stdOutFile || ''}
std_err_file: ${v.stdErrFile || ''}
command: ${v.command || ''}
status: ${v.status}`;
  }

  // Add CFW JIL generator
  generateCfwJIL(cfwJobForm: FormGroup): string {
    const v = cfwJobForm.getRawValue();
    const jobName = `csi_${v.csi}_${v.efforttype}_${v.prodlob}_${v.purpose}_${v.loadfreq}_${v.loadlayer}_${v.funofjob}_${v.jobtitle}`;
    return `insert_job: ${jobName}
job_type: CFW
owner: ${v.owner}
permission: gx,ge,wx,we,mx,me
alarm_if_fail: ${v.alarmFail === 'y' || v.alarm_if_fail === 1 ? 1 : 0}
alarm_if_terminated: ${v.alarmTerm === 'y' || v.alarm_if_terminated === 1 ? 1 : 0}
timezone: ${v.timezone}
profile: ${v.profile || ''}
send_notification: ${v.sendNotif === 'y' ? 1 : 0}
std_out_file: ${v.stdOutFile || ''}
std_err_file: ${v.stdErrFile || ''}
command: ${v.command || ''}
status: ${v.status}`;
  }
}
