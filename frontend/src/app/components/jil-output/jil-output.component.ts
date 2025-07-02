import { Component, Input } from '@angular/core';
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
} 