import { Component } from '@angular/core';
import { ParserConfigService } from '../services/parser-config.service';
import { MainFormPopulationService } from '../services/main-form-population.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-parse-upload-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './parse-upload-page.component.html',
  styleUrls: ['./parse-upload-page.component.css'],
  providers: [ParserConfigService]
})
export class ParseUploadPageComponent {
  parsedData: any = null;
  error: string = '';
  keyMapping: {[key: string]: string} = {};
  selectedFileName: string = '';
  loading: boolean = false;

  constructor(
    private parserConfig: ParserConfigService,
    private mainFormPopulation: MainFormPopulationService,
    private router: Router
  ) {
    this.parserConfig.getKeyMapping().subscribe(mapping => {
      this.keyMapping = mapping;
    });
  }

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
      this.parseFileContent(content);
    };
    reader.readAsText(file);
  }

  parseFileContent(content: string) {
    const lines = content.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '');
    const data: any = {};
    // Normalize mapping for case-insensitive matching
    const normalizedMapping: {[key: string]: string} = {};
    Object.keys(this.keyMapping).forEach(k => {
      normalizedMapping[k.trim().toLowerCase()] = this.keyMapping[k];
    });

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      // Skip obvious headers
      if (/insert job configuration/i.test(line)) {
        i++;
        continue;
      }
      // If line looks like a job name (e.g., 169912_REG_DEP_DFBV_D_STG), parse it
      if (/^\d{6}_[A-Z]+_[A-Z]+_[A-Z0-9]+_[A-Z]_[A-Z]+(_[A-Z0-9]+)*$/i.test(line)) {
        const parts = line.split('_');
        if (parts.length >= 6) {
          data['csi'] = parts[0];
          data['efforttype'] = parts[1];
          data['prodlob'] = parts[2];
          data['purpose'] = parts[3];
          data['loadfreq'] = parts[4];
          data['loadlayer'] = parts[5];
          if (parts.length > 6) data['funofjob'] = parts[6].toLowerCase();
          if (parts.length > 7) data['jobtitle'] = parts[7].toLowerCase();
        }
        i++;
        continue;
      }
      // Support key:value or key=value
      let delimiterMatch = line.match(/^([^:=]+)\s*[:=]\s*(.+)$/);
      if (delimiterMatch) {
        const rawKey = delimiterMatch[1].trim().toLowerCase();
        const mappedKey = normalizedMapping[rawKey] || rawKey;
        data[mappedKey] = delimiterMatch[2].trim();
        i++;
        continue;
      }
      // Otherwise, treat as label/value pair (label on this line, value on next)
      const label = line;
      const value = lines[i + 1] || '';
      const mappedKey = normalizedMapping[label.trim().toLowerCase()] || label.trim().toLowerCase();
      if (value && mappedKey) {
        data[mappedKey] = value.trim();
        i += 2;
      } else {
        i++;
      }
    }
    this.parsedData = data;
    console.log('Parsed data:', data); // DEBUG: See what keys are produced
    this.error = '';
    this.loading = false;
  }

  populateMainForm() {
    if (this.parsedData) {
      this.mainFormPopulation.sendParsedData(this.parsedData);
      this.router.navigate(['/dynamic-form']);
    }
  }
} 