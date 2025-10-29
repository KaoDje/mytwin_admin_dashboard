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

  constructor(
    private fb: FormBuilder,
    private appViewService: AppViewService,
    public dialogRef: MatDialogRef<CreateUserDialogComponent>
  ) {
    this.userForm = this.fb.group({
      // User fields
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
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
