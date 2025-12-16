import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Environment = 'dev' | 'prod';

export interface EnvironmentConfig {
  name: string;
  label: string;
  apiUrl: string;
  graphqlUrl: string;
  useRefreshToken: boolean;
}

const ENVIRONMENTS: Record<Environment, EnvironmentConfig> = {
  dev: {
    name: 'dev',
    label: 'Development',
    apiUrl: 'https://api.my-twin.io',
    graphqlUrl: 'https://api.my-twin.io/graphql',
    useRefreshToken: false,
  },
  prod: {
    name: 'prod',
    label: 'Production',
    apiUrl: 'https://mytwin-backend.osc-fr1.scalingo.io',
    graphqlUrl: 'https://mytwin-backend.osc-fr1.scalingo.io/graphql',
    useRefreshToken: true,
  },
};

const STORAGE_KEY = 'selected_environment';

@Injectable({
  providedIn: 'root',
})
export class EnvironmentService {
  private currentEnvironment$ = new BehaviorSubject<Environment>(this.loadStoredEnvironment());

  constructor() {}

  private loadStoredEnvironment(): Environment {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dev' || stored === 'prod') {
      return stored;
    }
    return 'dev'; // Default to dev
  }

  getEnvironment(): Environment {
    return this.currentEnvironment$.getValue();
  }

  getEnvironment$(): Observable<Environment> {
    return this.currentEnvironment$.asObservable();
  }

  setEnvironment(env: Environment): void {
    localStorage.setItem(STORAGE_KEY, env);
    this.currentEnvironment$.next(env);
  }

  getConfig(): EnvironmentConfig {
    return ENVIRONMENTS[this.getEnvironment()];
  }

  getApiUrl(): string {
    return this.getConfig().apiUrl;
  }

  getGraphqlUrl(): string {
    return this.getConfig().graphqlUrl;
  }

  useRefreshToken(): boolean {
    return this.getConfig().useRefreshToken;
  }

  getAllEnvironments(): EnvironmentConfig[] {
    return Object.values(ENVIRONMENTS);
  }

  getEnvironmentByName(name: Environment): EnvironmentConfig {
    return ENVIRONMENTS[name];
  }
}
