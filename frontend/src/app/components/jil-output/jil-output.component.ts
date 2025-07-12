import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-jil-output',
  templateUrl: './jil-output.component.html',
  styleUrl: './jil-output.component.css',
  standalone: true,
  imports: [CommonModule]
})
export class JilOutputComponent {
  @Input() generatedJIL: string = '';
  @Input() showJIL: boolean = false;
  @Input() environment: string = '';
  @Input() jobName: string = '';
  @Output() closePreview = new EventEmitter<void>();
  @Output() downloadJIL = new EventEmitter<{content: string, fileName: string}>();

  onClosePreview() {
    this.closePreview.emit();
  }

  onDownloadJIL() {
    if (this.generatedJIL && this.jobName && this.environment) {
      const fileName = `${this.jobName}_${this.environment.toUpperCase()}.jil.txt`;
      this.downloadJIL.emit({
        content: this.generatedJIL,
        fileName: fileName
      });
    }
  }

  copyToClipboard() {
    if (this.generatedJIL) {
      navigator.clipboard.writeText(this.generatedJIL).then(() => {
        // You could add a toast notification here
        console.log('JIL content copied to clipboard');
      });
    }
  }
}
