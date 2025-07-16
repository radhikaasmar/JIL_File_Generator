import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-upload-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload-dialog.component.html',
  styleUrls: ['./file-upload-dialog.component.css']
})
export class FileUploadDialogComponent {
  @Output() fileParsed = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();
  error: string = '';
  selectedFileName: string = '';
  loading: boolean = false;

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.error = 'No file selected.';
      this.selectedFileName = '';
      return;
    }
    const file = input.files[0];
    this.selectedFileName = file.name;
    if (!file.name.endsWith('.txt')) {
      this.error = 'Please upload a .txt file.';
      this.selectedFileName = '';
      return;
    }
    this.loading = true;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const content = e.target.result as string;
      this.fileParsed.emit(content);
      this.loading = false;
    };
    reader.readAsText(file);
  }

  closeDialog() {
    this.closed.emit();
  }
} 