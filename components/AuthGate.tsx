import type { ReactNode } from "react";
import { useOutletContext } from "react-router";
import { AlertCircle } from "lucide-react";
import Button from "./ui/Button";

type AuthGateProps = {
    children: ReactNode;
    /** Optional title shown on the sign-in prompt. Defaults to "Sign in required" */
    title?: string;
    /** Optional description shown under the title */
    description?: string;
};

/**
 * AuthGate wraps any protected UI.
 * If the user is not signed in it renders a sign-in prompt instead of children.
 * Auth state is read from the root outlet context (AuthContext).
 */
const AuthGate = ({
    children,
    title = "Sign in required",
    description = "You need a free Puter account to use this feature. Sign in to continue.",
}: AuthGateProps) => {
    const { isSignedIn, signIn } = useOutletContext<AuthContext>();

    if (isSignedIn) {
        return <>{children}</>;
    }

    return (
        <div className="auth-modal" style={{ position: "relative", inset: "unset", background: "transparent", backdropFilter: "none" }}>
            <div className="panel">
                <div className="icon">
                    <AlertCircle className="alert" />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <div className="actions">
                    <Button
                        variant="primary"
                        size="md"
                        fullWidth
                        className="confirm"
                        onClick={signIn}
                    >
                        Sign in with Puter
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AuthGate;
