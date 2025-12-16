import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticatedUserRepository } from '../../repositories/authenticated-user.repository';
import { AuthenticationService } from '../../services/authentication.service';
import { AuthenticationProdService } from '../../services/authentication-prod.service';
import { EnvironmentService, Environment } from '../../services/environment.service';

@Component({
  selector: 'app-authentication',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './authentication.component.html',
  styleUrl: './authentication.component.scss',
})
export class AuthenticationComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  selectedEnvironment: Environment = 'dev';
  environments = [
    { value: 'dev' as Environment, label: 'Development', description: 'api.my-twin.io' },
    { value: 'prod' as Environment, label: 'Production', description: 'mytwin-backend.osc-fr1.scalingo.io' },
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthenticationService,
    private authProdService: AuthenticationProdService,
    private authUserRepo: AuthenticatedUserRepository,
    private envService: EnvironmentService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.selectedEnvironment = this.envService.getEnvironment();
  }

  onEnvironmentChange(env: Environment): void {
    if (env !== this.selectedEnvironment) {
      this.selectedEnvironment = env;
      this.envService.setEnvironment(env);
      // Clear any existing tokens when switching environments
      this.authUserRepo.clearToken();
      // Reload the page to reinitialize Apollo with the new URL
      window.location.reload();
    }
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;

    const { username, password } = this.loginForm.value;

    if (this.selectedEnvironment === 'prod') {
      this.loginWithProdService(username, password);
    } else {
      this.loginWithDevService(username, password);
    }
  }

  private loginWithDevService(username: string, password: string): void {
    this.authService.sendLoginRequest(username, password).subscribe({
      next: (result: any) => {
        this.isLoading = false;

        if (result.data?.login) {
          const role = this.authService.getUserRole();

          if (role === 'admin') {
            this.router.navigate(['/dashboard']);
          } else {
            this.errorMessage = 'Access denied. Admin role required.';
            this.authUserRepo.clearToken();
          }
        } else {
          this.errorMessage = 'Invalid credentials. Please try again.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = this.getErrorMessage(error);
      },
    });
  }

  private loginWithProdService(username: string, password: string): void {
    this.authProdService.sendLoginRequest(username, password).subscribe({
      next: (result: any) => {
        this.isLoading = false;

        if (result.data?.login) {
          const role = this.authProdService.getUserRole();

          if (role === 'admin') {
            this.router.navigate(['/dashboard']);
          } else {
            this.errorMessage = 'Access denied. Admin role required.';
            this.authUserRepo.clearToken();
          }
        } else {
          this.errorMessage = 'Invalid credentials. Please try again.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = this.getErrorMessage(error);
      },
    });
  }

  private getErrorMessage(error: any): string {
    // Handle rate limiting
    if (error.status === 429 || error.message?.includes('429')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }

    // Handle network errors
    if (error.networkError) {
      return 'Network error. Please check your connection.';
    }

    // Handle GraphQL errors
    if (error.graphQLErrors?.length > 0) {
      return error.graphQLErrors[0].message || 'Login failed. Please try again.';
    }

    return error.message || 'Login failed. Please try again.';
  }

  get username() {
    return this.loginForm.get('username');
  }

  get password() {
    return this.loginForm.get('password');
  }
}
