import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable, map } from 'rxjs';
import { AppViewService } from '../../../../services/app-view.service';
import { EnvironmentService } from '../../../../services/environment.service';

@Component({
  selector: 'app-create-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
  ],
  templateUrl: './create-user-dialog.component.html',
  styleUrl: './create-user-dialog.component.scss',
})
export class CreateUserDialogComponent {
  userForm: FormGroup;
  appViews$: Observable<Array<{ uuid: string; name: string }>>;
  hidePassword = true;
  isProd: boolean;

  // Password pattern for prod: min 12 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
  private prodPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;

  constructor(
    private fb: FormBuilder,
    private appViewService: AppViewService,
    private envService: EnvironmentService,
    public dialogRef: MatDialogRef<CreateUserDialogComponent>
  ) {
    this.isProd = this.envService.getEnvironment() === 'prod';

    // Password validators depend on environment
    const passwordValidators = this.isProd
      ? [Validators.required, Validators.minLength(12), Validators.pattern(this.prodPasswordPattern)]
      : [Validators.required, Validators.minLength(6)];

    this.userForm = this.fb.group({
      // User fields
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', passwordValidators],
      role: ['user'],
      defaultLang: ['fr'],
      appViewId: [''],
      // Identity fields
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      birthDate: [''],
      birthCity: [''],
      city: [''],
      country: [''],
      biologicalSex: [''],
    });

    this.appViews$ = this.appViewService
      .getAllAppViews()
      .pipe(map((result) => result.data?.appViews || []));
  }

  getPasswordErrorMessage(): string {
    const password = this.userForm.get('password');
    if (password?.hasError('required')) {
      return 'Password is required';
    }
    if (password?.hasError('minlength')) {
      return this.isProd ? 'Minimum 12 characters' : 'Minimum 6 characters';
    }
    if (password?.hasError('pattern')) {
      return 'Must include uppercase, lowercase, number, and special character (@$!%*?&)';
    }
    return '';
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      const formValue = this.userForm.value;

      // Remove appViewId if empty
      if (!formValue.appViewId) {
        delete formValue.appViewId;
      }

      // Convert date to ISO string if present
      if (formValue.birthDate) {
        formValue.birthDate = formValue.birthDate.toISOString().split('T')[0];
      } else {
        delete formValue.birthDate;
      }

      // Remove empty optional identity fields
      if (!formValue.birthCity) delete formValue.birthCity;
      if (!formValue.city) delete formValue.city;
      if (!formValue.country) delete formValue.country;
      if (!formValue.biologicalSex) delete formValue.biologicalSex;

      this.dialogRef.close(formValue);
    }
  }
}
