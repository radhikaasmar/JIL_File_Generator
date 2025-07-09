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
    { value: 'master', label: 'MASTER', jobType: 'box', subformType: 'box' },
    { value: 'ing', label: 'ING (CMD)', jobType: 'cmd', subformType: 'cmd' },
    { value: 'dq', label: 'DQ (CMD)', jobType: 'cmd', subformType: 'cmd' },
    { value: 'ext', label: 'EXT (CMD)', jobType: 'cmd', subformType: 'cmd' },
    { value: 'ld', label: 'LD (CMD)', jobType: 'cmd', subformType: 'cmd' },
    { value: 'ndm', label: 'NDM (FW)', jobType: 'fw', subformType: 'fw' },
    { value: 'pg', label: 'PG (FW)', jobType: 'fw', subformType: 'fw' },
    { value: 'rp', label: 'RP (FW)', jobType: 'fw', subformType: 'fw' },
    { value: 'rv', label: 'RV (CFW)', jobType: 'cfw', subformType: 'cfw' },
    { value: 're', label: 'RE (CFW)', jobType: 'cfw', subformType: 'cfw' },
    { value: 'cs', label: 'CS (CFW)', jobType: 'cfw', subformType: 'cfw' },
    { value: 'purge', label: 'PURGE (FW)', jobType: 'fw', subformType: 'fw' },
    { value: 'pub', label: 'PUB (CMD)', jobType: 'cmd', subformType: 'cmd' },
    { value: 'drv', label: 'DRV (CMD)', jobType: 'cmd', subformType: 'cmd' }
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
