import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GoogleCalendarService } from '../services';

/**
 * Guard that checks if the user is connected to Google Calendar.
 * Redirects to settings page if not connected.
 */
export const calendarConnectedGuard: CanActivateFn = () => {
  const googleCalendarService = inject(GoogleCalendarService);
  const router = inject(Router);

  if (googleCalendarService.isSignedIn()) {
    return true;
  }

  // Redirect to settings page to connect Google Calendar
  return router.createUrlTree(['/settings'], {
    queryParams: { reason: 'calendar-required' },
  });
};

/**
 * Guard that allows access only if NOT connected (for onboarding flows).
 */
export const calendarNotConnectedGuard: CanActivateFn = () => {
  const googleCalendarService = inject(GoogleCalendarService);
  const router = inject(Router);

  if (!googleCalendarService.isSignedIn()) {
    return true;
  }

  // Already connected, redirect to dashboard
  return router.createUrlTree(['/dashboard']);
};
