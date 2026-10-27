/**
 * Auth callback route — handles the redirect from Supabase Google OAuth.
 * Supabase automatically parses the URL hash/params and sets the session.
 * We just wait for the SIGNED_IN event and redirect home.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/auth';

export default function AuthCallback() {
    const navigate = useNavigate();
    const [status, setStatus] = useState('Signing you in...');

    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                setStatus('Success! Redirecting...');
                setTimeout(() => navigate('/'), 400);
            }
        });

        // Fallback: if event doesn't fire within 5 seconds, redirect anyway
        const timeout = setTimeout(() => {
            navigate('/');
        }, 5000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, [navigate]);

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
                color: '#71717a',
            }}
        >
            {status}
        </div>
    );
}
