import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { Apollo } from 'apollo-angular';
import { Observable, map } from 'rxjs';
import { User } from '../../../../entities/user.entity';
import { UserService } from '../../../../services/user.service';

@Component({
  selector: 'app-assign-app-view-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatCheckboxModule],
  templateUrl: './assign-app-view-dialog.component.html',
  styleUrl: './assign-app-view-dialog.component.scss',
})
export class AssignAppViewDialogComponent {
  users$: Observable<User[]>;
  selectedUsers: string[] = [];

  constructor(
    public dialogRef: MatDialogRef<AssignAppViewDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      appViewId: string;
      appViewName: string;
      applications: string[];
      profile: string[];
    },
    private apollo: Apollo
  ) {
    const userService = new UserService(this.apollo);
    this.users$ = userService
      .getAllUsers()
      .pipe(map((result) => result.data?.users || []));
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    this.dialogRef.close({ selectedUsers: this.selectedUsers });
  }

  toggleUser(uuid: string): void {
    const index = this.selectedUsers.indexOf(uuid);
    if (index > -1) {
      this.selectedUsers.splice(index, 1);
    } else {
      this.selectedUsers.push(uuid);
    }
  }
}