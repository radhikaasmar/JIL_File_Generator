import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { CalendarService, CustomCalendar } from '../../services/calendar.service';

@Component({
  selector: 'app-calendar-popup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="calendar-dialog-overlay">
      <div class="calendar-dialog-box">
        <div class="calendar-dialog-header">
          <h3>Create Custom Calendar</h3>
          <button class="calendar-dialog-close" (click)="closePopup()" type="button">×</button>
        </div>
        <form [formGroup]="calendarForm" (ngSubmit)="onSubmit()">
          <div class="form-grid">
            <div class="form-field">
              <label>Extended Calendar <span class="required">*</span></label>
              <input type="text" formControlName="extendedCalendar" placeholder="e.g., 169912_REG_PLN_CDA_SERVING">
              <div class="field-hint">Format: number_type_department_purpose</div>
              <div class="validation-error" *ngIf="calendarForm.get('extendedCalendar')?.errors?.['required'] && calendarForm.get('extendedCalendar')?.touched">
                Extended Calendar is required
              </div>
            </div>

            <div class="form-field full-width">
              <label>Description <span class="required">*</span></label>
              <textarea formControlName="description" placeholder="e.g., Reg PLN CDA serving" rows="3"></textarea>
              <div class="validation-error" *ngIf="calendarForm.get('description')?.errors?.['required'] && calendarForm.get('description')?.touched">
                Description is required
              </div>
            </div>

            <div class="form-field">
              <label>Workdays</label>
              <input type="text" formControlName="workdays" placeholder="e.g., mo,tu,we,th,fr,sa">
              <div class="field-hint">Comma-separated values (mo,tu,we,th,fr,sa,su)</div>
            </div>

            <div class="form-field">
              <label>Non-Workdays</label>
              <input type="text" formControlName="nonWorkdays" placeholder="e.g., W">
              <div class="field-hint">Single letter or comma-separated</div>
            </div>

            <div class="form-field">
              <label>Holiday</label>
              <input type="text" formControlName="holiday" placeholder="Optional">
            </div>

            <div class="form-field">
              <label>Holiday Calendar</label>
              <input type="text" formControlName="holcal" placeholder="Optional">
            </div>

            <div class="form-field">
              <label>Cycle Calendar</label>
              <input type="text" formControlName="cyccal" placeholder="Optional">
            </div>

            <div class="form-field">
              <label>Adjust</label>
              <input type="number" formControlName="adjust" placeholder="0" value="0">
            </div>

            <div class="form-field full-width">
              <label>Condition</label>
              <input type="text" formControlName="condition" placeholder="e.g., MNTHD#2">
              <div class="field-hint">Calendar condition expression</div>
            </div>
          </div>

          <div class="calendar-dialog-actions">
            <button type="button" class="btn btn-secondary" (click)="closePopup()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="!calendarForm.valid">Create Calendar</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styleUrls: ['./calendar-popup.component.css']
})
export class CalendarPopupComponent implements OnInit {
  @Input() isVisible = false;
  @Output() close = new EventEmitter<void>();
  @Output() calendarCreated = new EventEmitter<CustomCalendar>();

  calendarForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private calendarService: CalendarService
  ) {
    this.calendarForm = this.fb.group({
      extendedCalendar: ['', Validators.required],
      description: ['', Validators.required],
      workday: [''],
      nonWorkday: [''],
      holiday: [''],
      holcal: [''],
      cyccal: [''],
      adjust: [0],
      condition: ['']
    });
  }

  ngOnInit() {}

  closePopup() {
    this.close.emit();
  }

  onSubmit() {
    if (this.calendarForm.valid) {
      const calendar: CustomCalendar = {
        extendedCalendar: this.calendarForm.value.extendedCalendar,
        description: this.calendarForm.value.description,
        workday: this.calendarForm.value.workday,
        nonWorkday: this.calendarForm.value.nonWorkday,
        holiday: this.calendarForm.value.holiday,
        holcal: this.calendarForm.value.holcal,
        cyccal: this.calendarForm.value.cyccal,
        adjust: this.calendarForm.value.adjust,
        condition: this.calendarForm.value.condition
      };

      this.calendarService.addCustomCalendar(calendar);
      this.calendarCreated.emit(calendar);
      this.closePopup();
    }
  }
}

