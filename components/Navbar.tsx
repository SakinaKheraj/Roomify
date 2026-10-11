import { Link } from "react-router";
import { Box, LogIn, LogOut } from "lucide-react";
import Button from "./ui/Button";

interface NavbarProps {
    isSignedIn: boolean;
    userName: string | null;
    onSignIn: () => void;
    onSignOut: () => void;
}

const Navbar = ({ isSignedIn, userName, onSignIn, onSignOut }: NavbarProps) => {
    return (
        <header className="navbar">
            <div className="inner">
                <div className="left">
                    <Link to="/" className="brand">
                        <Box className="logo" />
                        <span className="name">Roomify</span>
                    </Link>
                    <nav className="links">
                        <Link to="/">Studio</Link>
                    </nav>
                </div>

                <div className="actions">
                    {isSignedIn ? (
                        <>
                            <span className="greeting">Hi, {userName || "Creator"}</span>
                            <Button variant="ghost" size="sm" onClick={onSignOut}>
                                <LogOut className="w-4 h-4 mr-1" /> Sign Out
                            </Button>
                        </>
                    ) : (
                        <Button variant="primary" size="sm" onClick={onSignIn} className="cta">
                            <LogIn className="w-4 h-4 mr-1" /> Sign In
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar;
