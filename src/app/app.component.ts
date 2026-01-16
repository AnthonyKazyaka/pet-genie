import { Component, OnInit, inject } from '@angular/core';
import { AppShellComponent } from './layout';
import { DataService, GoogleCalendarService, FirebaseService } from './core/services';

@Component({
  selector: 'app-root',
  standalone: true,
  template: '<app-shell></app-shell>',
  styleUrl: './app.component.scss',
  imports: [AppShellComponent],
})
export class AppComponent implements OnInit {
  title = 'pet-genie';
  
  private dataService = inject(DataService);
  private googleCalendarService = inject(GoogleCalendarService);
  private firebaseService = inject(FirebaseService);

  async ngOnInit(): Promise<void> {
    // Initialize Firebase (happens automatically via service constructor)
    console.log('Firebase initialized:', this.firebaseService.getApp().name);

    // Initialize Google Calendar service if we have credentials
    await this.initializeGoogleCalendar();
  }

  private async initializeGoogleCalendar(): Promise<void> {
    try {
      const settings = this.dataService.settings();
      const googleClientId = settings.googleClientId;
      
      // Check if we have a client ID and stored token
      if (googleClientId && this.googleCalendarService.authState().accessToken) {
        // Initialize the Google Calendar API
        await this.googleCalendarService.initialize(googleClientId);
        console.log('Google Calendar API initialized on startup');
      }
    } catch (error) {
      console.error('Failed to initialize Google Calendar on startup:', error);
      // Clear the stored token if initialization fails
      this.googleCalendarService.signOut();
    }
  }
}
