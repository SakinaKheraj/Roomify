import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { useEffect, useState, useCallback, type ReactNode } from "react";
import "./app.css";
import { getCurrentUser, signIn as puterSignIn, signOut as puterSignOut } from "../lib/auth";
import Navbar from "../components/Navbar";

export const links = () => [
  { rel: "icon", href: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏠</text></svg>" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Roomify — AI Architectural Visualization</title>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>({
    isSignedIn: false,
    userName: null,
    userId: null,
  });

  const refreshAuth = useCallback(async (): Promise<boolean> => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setAuthState({
          isSignedIn: true,
          userName: user.userName,
          userId: user.userId,
        });
        return true;
      } else {
        setAuthState({
          isSignedIn: false,
          userName: null,
          userId: null,
        });
        return false;
      }
    } catch {
      setAuthState({
        isSignedIn: false,
        userName: null,
        userId: null,
      });
      return false;
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const handleSignIn = async (): Promise<boolean> => {
    const success = await puterSignIn();
    if (success) {
      await refreshAuth();
    }
    return success;
  };

  const handleSignOut = async (): Promise<boolean> => {
    const success = await puterSignOut();
    setAuthState({
      isSignedIn: false,
      userName: null,
      userId: null,
    });
    return success;
  };

  const authContext: AuthContext = {
    isSignedIn: authState.isSignedIn,
    userName: authState.userName,
    userId: authState.userId,
    refreshAuth,
    signIn: handleSignIn,
    signOut: handleSignOut,
  };

  return (
    <>
      <Navbar
        isSignedIn={authState.isSignedIn}
        userName={authState.userName}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />
      <main className="min-h-screen">
        <Outlet context={authContext} />
      </main>
    </>
  );
}
