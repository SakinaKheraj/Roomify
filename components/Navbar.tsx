import {Box} from "lucide-react";
import {Link} from "react-router";
import Button from "./ui/Button";

interface NavbarProps {
    isSignedIn: boolean;
    userName: string | null;
    onSignIn: () => Promise<boolean>;
    onSignOut: () => Promise<boolean>;
}

const Navbar = ({ isSignedIn, userName, onSignIn, onSignOut }: NavbarProps) => {
    const handleAuthClick = async () => {
        if(isSignedIn) {
            try {
                await onSignOut();
            } catch (e) {
                console.error(`Sign out failed: ${e}`);
            }

            return;
        }

        try {
            await onSignIn();
        } catch (e) {
            console.error(`Sign in failed: ${e}`);
        }
    };

    return (
        <header className="navbar">
            <nav className="inner">
                <div className="left">
                    <div className="brand">
                        <Box  className="logo" />

                        <span className="name">
                            Roomify
                        </span>
                    </div>

                    <ul className="links">
                        <Link to="/">Home</Link>
                        <Link to="/community">Community</Link>
                    </ul>
                </div>

                <div className="actions">
                    {isSignedIn ? (
                        <>
                            <span className="greeting">
                                {userName ? `Hi, ${userName}` : 'Signed in'}
                            </span>

                            <Button size="sm" onClick={handleAuthClick} className="btn">
                                Log Out
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button onClick={handleAuthClick} size="sm" variant="ghost">
                                Log In
                            </Button>

                            <Button onClick={handleAuthClick} size="sm" variant="primary" className="cta">
                                Get Started
                            </Button>
                        </>
                    )}
                </div>
            </nav>
        </header>
    )
}

export default Navbar
