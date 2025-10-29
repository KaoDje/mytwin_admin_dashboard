import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticatedUserRepository } from '../../repositories/authenticated-user.repository';
import { AuthenticationService } from '../../services/authentication.service';

@Component({
  selector: 'app-authentication',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './authentication.component.html',
  styleUrl: './authentication.component.scss',
})
export class AuthenticationComponent {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthenticationService,
    private authUserRepo: AuthenticatedUserRepository,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;

    const { username, password } = this.loginForm.value;

    this.authService.sendLoginRequest(username, password).subscribe({
      next: (result: any) => {
        this.isLoading = false;

        if (result.data?.login) {
          // Check if user has admin role
          const role = this.authService.getUserRole();

          if (role === 'admin') {
            // Successful login with admin role
            this.router.navigate(['/dashboard']);
          } else {
            // User exists but is not admin
            this.errorMessage = 'Access denied. Admin role required.';
            this.authUserRepo.clearToken();
          }
        } else {
          this.errorMessage = 'Invalid credentials. Please try again.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Login failed. Please try again.';
      },
    });
  }

  get username() {
    return this.loginForm.get('username');
  }

  get password() {
    return this.loginForm.get('password');
  }
}
