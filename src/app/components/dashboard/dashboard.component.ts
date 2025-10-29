import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { AppView } from '../../entities/app-view.entity';
import { User } from '../../entities/user.entity';
import { AuthenticatedUserRepository } from '../../repositories/authenticated-user.repository';
import { AppViewService } from '../../services/app-view.service';
import { IdentityService } from '../../services/identity.service';
import { UserService } from '../../services/user.service';
import { AssignAppViewDialogComponent } from './dialogs/assign-app-view-dialog/assign-app-view-dialog.component';
import { ConfirmDeleteDialogComponent } from './dialogs/confirm-delete-dialog/confirm-delete-dialog.component';
import { CreateAppViewDialogComponent } from './dialogs/create-app-view-dialog/create-app-view-dialog.component';
import { CreateUserDialogComponent } from './dialogs/create-user-dialog/create-user-dialog.component';
import { EditAppViewDialogComponent } from './dialogs/edit-app-view-dialog/edit-app-view-dialog.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
    MatCardModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  users$!: Observable<User[]>;
  appViews$!: Observable<AppView[]>;
  filteredUsers$!: Observable<User[]>;
  filteredAppViews$!: Observable<AppView[]>;
  searchTerm = '';
  appViewSearchTerm = '';

  displayedColumnsUsers: string[] = [
    'username',
    'role',
    'appView',
    'defaultLang',
    'actions',
  ];
  displayedColumnsAppViews: string[] = [
    'name',
    'applications',
    'profile',
    'actions',
  ];

  constructor(
    private authUserRepo: AuthenticatedUserRepository,
    private userService: UserService,
    private appViewService: AppViewService,
    private identityService: IdentityService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.users$ = this.userService.getAllUsers().pipe(
      map((result) => result.data?.users || []),
      catchError((error) => {
        this.showError('Failed to load users');
        return of([]);
      })
    );

    this.appViews$ = this.appViewService.getAllAppViews().pipe(
      map((result) => result.data?.appViews || []),
      catchError((error) => {
        this.showError('Failed to load app views');
        return of([]);
      })
    );

    this.filteredUsers$ = this.users$;
    this.filteredAppViews$ = this.appViews$;
  }

  onSearchChange(): void {
    this.filteredUsers$ = this.users$.pipe(
      map((users) =>
        users.filter(
          (user) =>
            user.username
              .toLowerCase()
              .includes(this.searchTerm.toLowerCase()) ||
            user.role.toLowerCase().includes(this.searchTerm.toLowerCase())
        )
      )
    );
  }

  onAppViewSearchChange(): void {
    this.filteredAppViews$ = this.appViews$.pipe(
      map((views) =>
        views.filter((view) =>
          view.name.toLowerCase().includes(this.appViewSearchTerm.toLowerCase())
        )
      )
    );
  }

  openCreateUserDialog(): void {
    const dialogRef = this.dialog.open(CreateUserDialogComponent, {
      width: '600px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Separate user data from identity data
        const userData = {
          username: result.username,
          password: result.password,
          role: result.role,
          defaultLang: result.defaultLang,
          appViewId: result.appViewId,
        };

        const identityData = {
          firstName: result.firstName,
          lastName: result.lastName,
          birthDate: result.birthDate,
          birthCity: result.birthCity,
          city: result.city,
          country: result.country,
          biologicalSex: result.biologicalSex,
        };

        // Chain the two API calls: create user first, then create identity
        this.userService
          .createUser(userData)
          .pipe(
            switchMap((userResponse) => {
              const userId = userResponse.data?.createUser?.uuid;
              if (!userId) {
                throw new Error('Failed to get user ID from response');
              }

              // Create identity with the userId
              return this.identityService.createIdentity(identityData, userId);
            })
          )
          .subscribe({
            next: () => {
              this.showSuccess('User and identity created successfully');
              this.loadData();
            },
            error: (error) => {
              console.error('Error creating user/identity:', error);
              this.showError('Failed to create user or identity');
            },
          });
      }
    });
  }

  openDeleteUserDialog(user: User): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      data: { type: 'user', name: user.username },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.userService.deleteUser(user.uuid).subscribe({
          next: () => {
            this.showSuccess('User deleted successfully');
            this.loadData();
          },
          error: (error) => {
            this.showError('Failed to delete user');
          },
        });
      }
    });
  }

  openCreateAppViewDialog(): void {
    const dialogRef = this.dialog.open(CreateAppViewDialogComponent);

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.appViewService.createAppView(result).subscribe({
          next: () => {
            this.showSuccess('AppView created successfully');
            this.loadData();
          },
          error: (error) => {
            this.showError('Failed to create app view');
          },
        });
      }
    });
  }

  openEditAppViewDialog(appView: AppView): void {
    const dialogRef = this.dialog.open(EditAppViewDialogComponent, {
      data: appView,
      width: '600px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.appViewService.updateAppView(appView.uuid, result).subscribe({
          next: () => {
            this.showSuccess('AppView updated successfully');
            this.loadData();
          },
          error: (error) => {
            this.showError('Failed to update app view');
          },
        });
      }
    });
  }

  openDeleteAppViewDialog(appView: AppView): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      data: { type: 'app view', name: appView.name },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.appViewService.deleteAppView(appView.uuid).subscribe({
          next: () => {
            this.showSuccess('AppView deleted successfully');
            this.loadData();
          },
          error: (error) => {
            this.showError('Failed to delete app view');
          },
        });
      }
    });
  }

  openAssignAppViewDialog(appView: AppView): void {
    // Convert AppViewItem arrays to string arrays for display
    const applicationIds = appView.applications.map((item) => item.id);
    const profileIds = appView.profile.map((item) => item.id);

    const dialogRef = this.dialog.open(AssignAppViewDialogComponent, {
      data: {
        appViewId: appView.uuid,
        appViewName: appView.name,
        applications: applicationIds,
        profile: profileIds,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.selectedUsers && result.selectedUsers.length > 0) {
        console.log(
          'Assigning app view:',
          appView.uuid,
          'to users:',
          result.selectedUsers
        );
        this.appViewService
          .assignAppViewToUsers(appView.uuid, result.selectedUsers)
          .subscribe({
            next: (response) => {
              console.log('Assignment response:', response);
              this.showSuccess(
                `AppView assigned to ${result.selectedUsers.length} user(s)`
              );
              this.loadData();
            },
            error: (error) => {
              console.error('Error assigning app view:', error);
              console.error('Error details:', error.error?.errors || error);
              this.showError(
                'Failed to assign app view: ' +
                  (error.message || 'Unknown error')
              );
            },
          });
      }
    });
  }

  logout(): void {
    this.authUserRepo.clearToken();
    this.router.navigate(['/login']);
  }

  getAppViewName(user: User): string {
    return user.preferences?.appView?.name || 'None';
  }

  getApplicationIds(appView: AppView): string {
    return appView.applications.map((item) => item.id).join(', ');
  }

  getProfileIds(appView: AppView): string {
    return appView.profile.map((item) => item.id).join(', ');
  }

  showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar'],
    });
  }
}
