import { Injectable } from '@angular/core';

export interface MetadataState {
  applications: string[];
  profiles: string[];
}

export const DEFAULT_STATE: MetadataState = {
  applications: [
    'i-virtual',
    'virtuosis',
    'skinive',
    'medical-imaging',
    'injury-prediction',
    'visible-patient',
    'exact-cure',
  ],
  profiles: [
    'identity',
    'handicaps',
    'allergies',
    'family-history',
    'measurements',
    'professionals',
    'contacts',
    'documents',
    'connected-data',
    'user-preferences',
  ],
};

@Injectable({
  providedIn: 'root',
})
export class AppMetadataService {
  constructor() {}
}
