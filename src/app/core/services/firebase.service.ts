import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { environment } from '../../../environments/environment';

/**
 * Firebase Service
 * Handles Firebase initialization and provides access to Firebase services
 */
@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: FirebaseApp;
  private db: Firestore;
  private analytics?: Analytics;

  constructor() {
    // Initialize Firebase with environment config
    this.app = initializeApp(environment.firebase);
    this.db = getFirestore(this.app);
    
    // Initialize Analytics only in browser environment and production
    if (typeof window !== 'undefined' && environment.production) {
      try {
        this.analytics = getAnalytics(this.app);
      } catch (error) {
        console.warn('Analytics not available:', error);
      }
    }

    console.log('Firebase initialized with project:', environment.firebase.projectId);
  }

  /**
   * Get Firestore instance
   */
  getFirestore(): Firestore {
    return this.db;
  }

  /**
   * Get Firebase app instance
   */
  getApp(): FirebaseApp {
    return this.app;
  }

  /**
   * Get Analytics instance (may be undefined)
   */
  getAnalytics(): Analytics | undefined {
    return this.analytics;
  }
}
