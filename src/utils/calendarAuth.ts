import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { app } from '../firebase';

export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Calendar scopes
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/calendar.events');

// Enable incremental auth and select account
provider.setCustomParameters({
  prompt: 'select_account'
});

let isSigningIn = false;
let currentProfileId: string | null = null;

export const setProfileUserId = (id: string | null) => {
  currentProfileId = id;
};

export const getConnectedGoogleUser = () => {
  if (!currentProfileId) return null;
  const cachedUserStr = localStorage.getItem(`lallettre_google_user_${currentProfileId}`);
  const token = localStorage.getItem(`lallettre_google_token_${currentProfileId}`);
  if (token && cachedUserStr) {
    try {
      return JSON.parse(cachedUserStr);
    } catch {
      return null;
    }
  }
  return null;
};

// Initialize auth state listener.
export const initAuth = (
  onAuthSuccess?: (user: { email: string; displayName?: string; photoURL?: string }, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && currentProfileId) {
      const token = localStorage.getItem(`lallettre_google_token_${currentProfileId}`);
      const cachedUser = getConnectedGoogleUser();
      
      if (token && cachedUser) {
        if (onAuthSuccess) onAuthSuccess(cachedUser, token);
        return;
      }
    }
    if (onAuthFailure) onAuthFailure();
  });
};

// Sign in with Google with optional email validation
export const googleSignIn = async (expectedEmail?: string): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    
    if (expectedEmail && result.user.email?.toLowerCase() !== expectedEmail.toLowerCase()) {
      await auth.signOut();
      throw new Error(`O e-mail da conta Google (${result.user.email}) não corresponde ao e-mail do seu perfil no CRM (${expectedEmail}).`);
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google.');
    }

    const token = credential.accessToken;
    if (currentProfileId) {
      localStorage.setItem(`lallettre_google_token_${currentProfileId}`, token);
      localStorage.setItem(`lallettre_google_user_${currentProfileId}`, JSON.stringify({
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL
      }));
    }
    return { user: result.user, accessToken: token };
  } catch (error: any) {
    console.error('Google Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (currentProfileId) {
    return localStorage.getItem(`lallettre_google_token_${currentProfileId}`);
  }
  return null;
};

export const logoutGoogle = async () => {
  await auth.signOut();
  if (currentProfileId) {
    localStorage.removeItem(`lallettre_google_token_${currentProfileId}`);
    localStorage.removeItem(`lallettre_google_user_${currentProfileId}`);
  }
};

// Interface for event creation
export interface CalendarEventDetails {
  summary: string;
  description: string;
  location?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  attendeeEmail?: string;
}

// Function to schedule event on primary Google Calendar
export const scheduleCalendarEvent = async (eventDetails: CalendarEventDetails): Promise<any> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Usuário não autenticado no Google Agenda.');
  }

  const body: any = {
    summary: eventDetails.summary,
    description: eventDetails.description,
    location: eventDetails.location || 'Lallettre Maison',
    start: {
      dateTime: eventDetails.startTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'
    },
    end: {
      dateTime: eventDetails.endTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'
    }
  };

  if (eventDetails.attendeeEmail) {
    body.attendees = [{ email: eventDetails.attendeeEmail }];
    // Send email notification to attendee
    body.sendUpdates = 'all';
  }

  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error('Error scheduling calendar event:', errData);
    throw new Error(errData.error?.message || 'Falha ao agendar evento no Google Agenda.');
  }

  return await response.json();
};

// Function to list upcoming primary calendar events (limit 15)
export const listCalendarEvents = async (): Promise<any[]> => {
  const token = await getAccessToken();
  if (!token) {
    return [];
  }

  const nowISO = new Date().toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${nowISO}&orderBy=startTime&singleEvents=true&maxResults=15`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    console.error('Failed to list calendar events');
    return [];
  }

  const data = await response.json();
  return data.items || [];
};
