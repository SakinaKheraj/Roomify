import {Box} from "lucide-react";
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
                console.error(`Puter sign out failed: ${e}`);
            }

            return;
        }

        try {
            await onSignIn();
        } catch (e) {
            console.error(`Puter sign in failed: ${e}`);
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
                        <a href="#">Product</a>
                        <a href="#">Pricing</a>
                        <a href="#">Community</a>
                        <a href="#">Enterprise</a>
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

                            <a href="#upload" className="cta">Get Started</a>
                        </>
                    )}
                </div>
            </nav>
        </header>
    )
}

export default Navbar
