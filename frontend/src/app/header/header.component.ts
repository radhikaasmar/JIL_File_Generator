import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParserConfigService } from '../services/parser-config.service';
import { MainFormPopulationService } from '../services/main-form-population.service';
import { Router } from '@angular/router';
import { FileUploadDialogComponent } from '../components/file-upload-dialog/file-upload-dialog.component';
import levenshtein from 'js-levenshtein';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FileUploadDialogComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  dateTime: string = '';
  intervalId: any;
  isDarkMode: boolean = false;
  keyMapping: {[key: string]: string} = {};
  loading: boolean = false;
  error: string = '';
  selectedFileName: string = '';
  showUploadDialog: boolean = false;
  cmdJobsBySubform: { [subform: string]: any[] } = {};

  constructor(
    private parserConfig: ParserConfigService,
    private mainFormPopulation: MainFormPopulationService,
    private router: Router
  ) {
    this.parserConfig.getKeyMapping().subscribe(mapping => {
      this.keyMapping = mapping;
    });
  }

  ngOnInit() {
    this.updateDateTime();
    this.intervalId = setInterval(() => this.updateDateTime(), 1000);
    const savedTheme = localStorage.getItem('theme');
    this.isDarkMode = savedTheme === 'dark';
    this.applyTheme();
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private updateDateTime() {
    const now = new Date();
    this.dateTime = now.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme() {
    if (this.isDarkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  openUploadDialog() {
    this.showUploadDialog = true;
  }
  onDialogClosed() {
    this.showUploadDialog = false;
  }
  onFileParsed(content: string) {
    this.showUploadDialog = false;
    this.parseFileContent(content);
  }

  parseFileContent(content: string) {
    // Split content into job blocks
    const blocks = content.split(/(?=insert_job:)/i).map(b => b.trim()).filter(b => b);
    const jobs: any[] = [];
    const cmdJobsBySubform: { [subform: string]: any[] } = {};
    const allowedSubforms = [
      'ING', 'DQ', 'EXT', 'LD', 'NDM', 'PG', 'RP', 'RV', 'RE', 'CS', 'PURGE', 'PUB', 'DRV', 'CFW'
    ];
    const normalizedMapping: {[key: string]: string} = {};
    Object.keys(this.keyMapping).forEach(k => {
      normalizedMapping[k.trim().toLowerCase()] = this.keyMapping[k];
    });
    const knownKeys = Object.keys(normalizedMapping);

    // Dedicated CMD subform parsers
    const cmdParsers: { [key: string]: (lines: string[], normalizedMapping: any, knownKeys: string[]) => any } = {
      'ext': this.parseExtCmdJob,
      'ld': this.parseLdCmdJob,
      'ing': this.parseIngCmdJob,
      // Add more as needed
    };

    for (const block of blocks) {
      const lines = block.split(/\r?\n/).map(line => line.trim()).filter(line => line);
      let data: any = {};
      let i = 0;
      // Generic parse for job_type
      while (i < lines.length) {
        let delimiterMatch = lines[i].match(/^([^:=]+)\s*[:=]\s*(.+)$/);
        if (delimiterMatch) {
          let rawKey = delimiterMatch[1].trim().toLowerCase();
          let mappedKey = normalizedMapping[rawKey];
          if (!mappedKey) {
            // Fuzzy match fallback for typos
            let minDist = 3, bestKey = '';
            for (const k of knownKeys) {
              const dist = levenshtein(rawKey, k);
              if (dist < minDist) {
                minDist = dist;
                bestKey = k;
              }
            }
            if (minDist <= 2) mappedKey = normalizedMapping[bestKey];
          }
          if (!mappedKey) mappedKey = rawKey; // fallback to rawKey
          // Strip leading/trailing quotes from value
          let value = delimiterMatch[2].trim().replace(/^['"]+|['"]+$/g, '');
          data[mappedKey] = value;
          i++;
          continue;
        }
        i++;
      }
      // If insert_job is present, extract core fields from it
      if (data['insert_job']) {
        const parts = data['insert_job'].split('_');
        if (parts.length >= 7) {
          data['csi'] = parts[0];
          data['efforttype'] = parts[1];
          data['prodlob'] = parts[2];
          data['purpose'] = parts[3];
          data['loadfreq'] = parts[4];
          data['loadlayer'] = parts[5];
          data['funofjob'] = parts[6].toLowerCase();
          if (parts.length > 7) data['jobtitle'] = parts[7].toLowerCase();
        }
        // Subform extraction for CMD jobs using split('_')[6]
        if ((data['job_type'] || '').toUpperCase() === 'CMD') {
          const parts = data['insert_job'].split('_');
          let subform = '';
          if (parts.length > 6) {
            subform = parts[6].toUpperCase();
          }
          if (allowedSubforms.includes(subform)) {
            data['subform'] = subform;
            // Use dedicated parser if available
            const parserKey = subform.toLowerCase();
            if (cmdParsers[parserKey]) {
              data = cmdParsers[parserKey](lines, normalizedMapping, knownKeys);
              data['subform'] = subform;
            }
            if (!cmdJobsBySubform[subform]) cmdJobsBySubform[subform] = [];
            cmdJobsBySubform[subform].push(data);
          }
        }
      }
      // Normalize dropdown values
      const dropdownFieldsToUpper = ['efforttype', 'prodlob', 'loadfreq', 'loadlayer'];
      dropdownFieldsToUpper.forEach(field => {
        if (data[field]) {
          data[field] = data[field].toString().toUpperCase().trim().replace(/^"|"$/g, '');
        }
      });
      const dropdownFieldsToLower = ['jobtitle', 'funofjob'];
      dropdownFieldsToLower.forEach(field => {
        if (data[field]) {
          data[field] = data[field].toString().toLowerCase().trim().replace(/^"|"$/g, '');
        }
      });
      // Map start_times to start_time
      if (data['start_times']) {
        data['start_time'] = data['start_times'].replace(/["']+/g, '').trim();
      }
      // Parse condition string into array for conditions field
     // Parse condition string into array for conditions field
    if (data['condition']) {
      // Split by AND/OR (case-insensitive), keep logic
      const conds: any[] = [];
      const regex = /([a-zA-Z_]+)\(([^)]+)\)(?:\s+(AND|OR)\s+)?/gi;
      let match;
      
      while ((match = regex.exec(data['condition'])) !== null) {
        const type = match[1].toLowerCase();
        const job = match[2];
        const nextLogic = match[3] ? match[3].toLowerCase() : 'NONE';
        
        conds.push({ type, job, logic: nextLogic });
      }
      
      // **FIX: Ensure the last condition always has logic = "NONE"**
      if (conds.length > 0) {
        conds[conds.length - 1].logic = 'NONE';
      }
      
      data['conditions'] = conds.length ? conds : [{ type: '', job: '', logic: 'NONE' }];
    }

      // Fill missing required fields with empty string
      const requiredFields = ['insert_job', 'job_type', 'owner', 'permission', 'description', 'timezone', 'status'];
      for (const field of requiredFields) {
        if (!data[field]) {
          data[field] = '';
          if (field !== 'owner') {
            console.warn(`Missing required field: ${field} in job block`, data);
          }
        }
      }
      jobs.push(data);
    }
    this.loading = false;
    this.error = '';
    this.cmdJobsBySubform = cmdJobsBySubform; // Make available on the component
    console.log('Parsed jobs (header):', jobs);
    console.log('CMD jobs grouped by subform:', cmdJobsBySubform);
    this.mainFormPopulation.sendParsedData({ jobs, cmdJobsBySubform });
    this.router.navigate(['/dynamic-form']);
  }

  // Dedicated CMD subform parsers
  private parseExtCmdJob(lines: string[], normalizedMapping: any, knownKeys: string[]): any {
    // Custom parsing logic for EXT CMD jobs
    const data: any = {};
    lines.forEach(line => {
      let delimiterMatch = line.match(/^([^:=]+)\s*[:=]\s*(.+)$/);
      if (delimiterMatch) {
        let rawKey = delimiterMatch[1].trim().toLowerCase();
        let mappedKey = normalizedMapping[rawKey] || rawKey;
        let value = delimiterMatch[2].trim().replace(/^['"]+|['"]+$/g, '');
        data[mappedKey] = value;
      }
    });
    // Add any EXT-specific logic here
    return data;
  }

  private parseLdCmdJob(lines: string[], normalizedMapping: any, knownKeys: string[]): any {
    // Custom parsing logic for LD CMD jobs
    const data: any = {};
    lines.forEach(line => {
      let delimiterMatch = line.match(/^([^:=]+)\s*[:=]\s*(.+)$/);
      if (delimiterMatch) {
        let rawKey = delimiterMatch[1].trim().toLowerCase();
        let mappedKey = normalizedMapping[rawKey] || rawKey;
        let value = delimiterMatch[2].trim().replace(/^['"]+|['"]+$/g, '');
        data[mappedKey] = value;
      }
    });
    // Add any LD-specific logic here
    return data;
  }

  private parseIngCmdJob(lines: string[], normalizedMapping: any, knownKeys: string[]): any {
    // Custom parsing logic for ING CMD jobs
    const data: any = {};
    lines.forEach(line => {
      let delimiterMatch = line.match(/^([^:=]+)\s*[:=]\s*(.+)$/);
      if (delimiterMatch) {
        let rawKey = delimiterMatch[1].trim().toLowerCase();
        let mappedKey = normalizedMapping[rawKey] || rawKey;
        let value = delimiterMatch[2].trim().replace(/^['"]+|['"]+$/g, '');
        data[mappedKey] = value;
      }
    });
    // Add any ING-specific logic here
    return data;
  }
}
