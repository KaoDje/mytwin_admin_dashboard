import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AppView, AppViewItem } from '../../../../entities/app-view.entity';
import { DEFAULT_STATE } from '../../../../services/app-metadata.service';

@Component({
  selector: 'app-edit-app-view-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
  ],
  templateUrl: './edit-app-view-dialog.component.html',
  styleUrl: './edit-app-view-dialog.component.scss',
})
export class EditAppViewDialogComponent {
  readonly availableApplications = DEFAULT_STATE.applications;
  readonly availableProfiles = DEFAULT_STATE.profiles;

  selectedApplications: { id: string; order: number }[] = [];
  selectedProfiles: { id: string; order: number }[] = [];

  newApplicationSelect = '';
  newApplicationCustom = '';
  newProfileSelect = '';
  newProfileCustom = '';

  appViewForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<EditAppViewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AppView
  ) {
    // Initialize form
    this.appViewForm = this.fb.group({
      name: [data.name, [Validators.required, Validators.minLength(3)]],
    });

    // Convert existing AppViewItem arrays to working format
    this.selectedApplications = data.applications.map((item) => ({
      id: item.id,
      order: item.order,
    }));

    this.selectedProfiles = data.profile.map((item) => ({
      id: item.id,
      order: item.order,
    }));
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.appViewForm.valid && this.isSelectionValid()) {
      const formValue = this.appViewForm.value;

      const result = {
        name: formValue.name,
        applications: this.selectedApplications,
        profile: this.selectedProfiles,
      };

      this.dialogRef.close(result);
    } else {
      this.appViewForm.markAllAsTouched();
    }
  }

  isSelectionValid(): boolean {
    return (
      this.selectedApplications.length > 0 && this.selectedProfiles.length > 0
    );
  }

  addApplication(): void {
    let newId: string;

    if (this.newApplicationSelect === '') {
      // Custom entry
      const customValue = this.newApplicationCustom.trim();
      if (customValue === '') {
        return;
      }
      newId = customValue;
    } else {
      // Selected from dropdown
      newId = this.newApplicationSelect;
    }

    // Check if already exists
    if (this.selectedApplications.some((app) => app.id === newId)) {
      return;
    }

    const order = this.selectedApplications.length + 1;
    this.selectedApplications.push({ id: newId, order });

    // Reset inputs
    this.newApplicationSelect = '';
    this.newApplicationCustom = '';
  }

  removeApplication(index: number): void {
    this.selectedApplications.splice(index, 1);
    // Recalculate order
    this.selectedApplications.forEach((app, idx) => {
      app.order = idx + 1;
    });
  }

  moveApplicationUp(index: number): void {
    if (index === 0) return;

    const temp = this.selectedApplications[index];
    this.selectedApplications[index] = this.selectedApplications[index - 1];
    this.selectedApplications[index - 1] = temp;

    // Recalculate order
    this.selectedApplications.forEach((app, idx) => {
      app.order = idx + 1;
    });
  }

  moveApplicationDown(index: number): void {
    if (index === this.selectedApplications.length - 1) return;

    const temp = this.selectedApplications[index];
    this.selectedApplications[index] = this.selectedApplications[index + 1];
    this.selectedApplications[index + 1] = temp;

    // Recalculate order
    this.selectedApplications.forEach((app, idx) => {
      app.order = idx + 1;
    });
  }

  addProfile(): void {
    let newId: string;

    if (this.newProfileSelect === '') {
      // Custom entry
      const customValue = this.newProfileCustom.trim();
      if (customValue === '') {
        return;
      }
      newId = customValue;
    } else {
      // Selected from dropdown
      newId = this.newProfileSelect;
    }

    // Check if already exists
    if (this.selectedProfiles.some((profile) => profile.id === newId)) {
      return;
    }

    const order = this.selectedProfiles.length + 1;
    this.selectedProfiles.push({ id: newId, order });

    // Reset inputs
    this.newProfileSelect = '';
    this.newProfileCustom = '';
  }

  removeProfile(index: number): void {
    this.selectedProfiles.splice(index, 1);
    // Recalculate order
    this.selectedProfiles.forEach((profile, idx) => {
      profile.order = idx + 1;
    });
  }

  moveProfileUp(index: number): void {
    if (index === 0) return;

    const temp = this.selectedProfiles[index];
    this.selectedProfiles[index] = this.selectedProfiles[index - 1];
    this.selectedProfiles[index - 1] = temp;

    // Recalculate order
    this.selectedProfiles.forEach((profile, idx) => {
      profile.order = idx + 1;
    });
  }

  moveProfileDown(index: number): void {
    if (index === this.selectedProfiles.length - 1) return;

    const temp = this.selectedProfiles[index];
    this.selectedProfiles[index] = this.selectedProfiles[index + 1];
    this.selectedProfiles[index + 1] = temp;

    // Recalculate order
    this.selectedProfiles.forEach((profile, idx) => {
      profile.order = idx + 1;
    });
  }
}
