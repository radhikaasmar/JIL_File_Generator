import { Injectable } from '@angular/core';

export interface FunctionJobOption {
  value: string;
  label: string;
  jobType: string;
  subformType: string;
}

@Injectable({ providedIn: 'root' })
export class FunctionJobMappingService {
  private functionJobMappings: FunctionJobOption[] = [
    { value: 'ing', label: 'ING (CMD)', jobType: 'cmd', subformType: 'cmd' },
    { value: 'dq', label: 'DQ (CMD)', jobType: 'cmd', subformType: 'cmd' },
    { value: 'ext', label: 'EXT (CMD)', jobType: 'cmd', subformType: 'cmd' },
    { value: 'ld', label: 'LD (CMD)', jobType: 'cmd', subformType: 'cmd' },
    { value: 'ndm', label: 'NDM (CMD)', jobType: 'cmd', subformType: 'cmd' },
    { value: 'pg', label: 'PG (CMD)', jobType: 'cmd', subformType: 'cmd' },
    { value: 'rp', label: 'RP (CMD)', jobType: 'cmd', subformType: 'cmd' },
    { value: 'rv', label: 'RV (CMD)', jobType: 'cmd', subformType: 'cmd' },
    { value: 're', label: 'RE (CMD)', jobType: 'cmd', subformType: 'cmd' },
    { value: 'cs', label: 'CS (CMD)', jobType: 'cmd', subformType: 'cmd' },
    { value: 'purge', label: 'PURGE (CMD)', jobType: 'cmd', subformType: 'cmd' },
    { value: 'pub', label: 'PUB (CMD)', jobType: 'cmd', subformType: 'cmd' },
    { value: 'drv', label: 'DRV (CMD)', jobType: 'cmd', subformType: 'cmd' },
    { value: 'fw', label: 'FW', jobType: 'fw', subformType: 'fw' },
    { value: 'cfw', label: 'CFW', jobType: 'cfw', subformType: 'cfw' }
  ];

  getAllFunctionJobOptions(): FunctionJobOption[] {
    return this.functionJobMappings;
  }

  getFunctionJobOption(functionValue: string): FunctionJobOption | undefined {
    return this.functionJobMappings.find(option => option.value === functionValue);
  }

  getAvailableFunctions(existingFunctions: string[]): FunctionJobOption[] {
    return this.functionJobMappings.filter(option =>
      !existingFunctions.includes(option.value)
    );
  }
}
