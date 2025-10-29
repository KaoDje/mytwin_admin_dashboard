import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule, MatSelect } from '@angular/material/select';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { DEFAULT_STATE } from '../../../../services/app-metadata.service';

@Component({
  selector: 'app-create-app-view-dialog',
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
    DragDropModule,
  ],
  templateUrl: './create-app-view-dialog.component.html',
  styleUrl: './create-app-view-dialog.component.scss',
})
export class CreateAppViewDialogComponent {
  readonly availableApplications = DEFAULT_STATE.applications;
  readonly availableProfiles = DEFAULT_STATE.profiles;

  selectedApplications: { id: string; order: number }[] = [];
  selectedProfiles: { id: string; order: number }[] = [];

  newApplicationCustom = '';
  newProfileCustom = '';

  appViewForm: FormGroup;

  @ViewChild('applicationSelect') applicationSelect?: MatSelect;
  @ViewChild('profileSelect') profileSelect?: MatSelect;
  @ViewChild('applicationCustomInput')
  applicationCustomInput?: ElementRef<HTMLInputElement>;
  @ViewChild('profileCustomInput')
  profileCustomInput?: ElementRef<HTMLInputElement>;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CreateAppViewDialogComponent>
  ) {
    this.appViewForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
    });
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

  handleApplicationSelection(value: string | null): void {
    if (!value) {
      return;
    }
    this.addApplication(value);
    if (this.applicationSelect) {
      this.applicationSelect.value = null;
    }
  }

  confirmCustomApplication(): void {
    const customValue = this.newApplicationCustom.trim();
    if (!customValue) {
      return;
    }
    this.addApplication(customValue);
    this.newApplicationCustom = '';
    this.applicationSelect?.close();
  }

  onApplicationDropdownOpened(opened: boolean): void {
    if (!opened) {
      return;
    }
    queueMicrotask(() => {
      this.applicationCustomInput?.nativeElement.focus();
    });
  }

  removeApplication(index: number): void {
    this.selectedApplications.splice(index, 1);
    this.recalculateOrder(this.selectedApplications);
  }

  dropApplication(event: CdkDragDrop<{ id: string; order: number }[]>): void {
    moveItemInArray(
      this.selectedApplications,
      event.previousIndex,
      event.currentIndex
    );
    this.recalculateOrder(this.selectedApplications);
  }

  handleProfileSelection(value: string | null): void {
    if (!value) {
      return;
    }
    this.addProfile(value);
    if (this.profileSelect) {
      this.profileSelect.value = null;
    }
  }

  confirmCustomProfile(): void {
    const customValue = this.newProfileCustom.trim();
    if (!customValue) {
      return;
    }
    this.addProfile(customValue);
    this.newProfileCustom = '';
    this.profileSelect?.close();
  }

  onProfileDropdownOpened(opened: boolean): void {
    if (!opened) {
      return;
    }
    queueMicrotask(() => {
      this.profileCustomInput?.nativeElement.focus();
    });
  }

  removeProfile(index: number): void {
    this.selectedProfiles.splice(index, 1);
    this.recalculateOrder(this.selectedProfiles);
  }

  dropProfile(event: CdkDragDrop<{ id: string; order: number }[]>): void {
    moveItemInArray(
      this.selectedProfiles,
      event.previousIndex,
      event.currentIndex
    );
    this.recalculateOrder(this.selectedProfiles);
  }

  isApplicationSelected(appId: string): boolean {
    return this.selectedApplications.some((app) => app.id === appId);
  }

  isProfileSelected(profileId: string): boolean {
    return this.selectedProfiles.some((profile) => profile.id === profileId);
  }

  private addApplication(newId: string): void {
    if (this.selectedApplications.some((app) => app.id === newId)) {
      return;
    }
    const order = this.selectedApplications.length + 1;
    this.selectedApplications.push({ id: newId, order });
  }

  private addProfile(newId: string): void {
    if (this.selectedProfiles.some((profile) => profile.id === newId)) {
      return;
    }
    const order = this.selectedProfiles.length + 1;
    this.selectedProfiles.push({ id: newId, order });
  }

  private recalculateOrder(list: { id: string; order: number }[]): void {
    list.forEach((item, idx) => {
      item.order = idx + 1;
    });
  }
}
