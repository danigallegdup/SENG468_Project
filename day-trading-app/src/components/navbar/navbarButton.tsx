import Image from "next/image";
import navbarIcon from "@/assets/data/navbarIcons.json";
import Link from "next/link";

interface NavBarButtonProps {
    feature: string;
    isClicked: boolean;
}



function NavBarButton({ feature, isClicked }: NavBarButtonProps) {
    const NavIcons = navbarIcon as { [key: string]: string };
    const images = {
        "Home": "home",
        "Trade Stock": "trade-stock",
        "Management": "management",
        "Transactions": "transactions"
    } as { [key: string]: string };

    const links = {
        "Home": "/home",
        "Trade Stock": "/trade",
        "Management": "/management",
        "Transactions": "/transactions"
    } as { [key: string]: string };
    return (
        <div>
            <Link href={links[feature]}>
                <div className="flex flex-row items-center space-x-4 cursor-pointer">
                    <img src={NavIcons[images[feature]]} alt="home" />
                    <span className="text-black">{feature}</span>
                </div>
            </Link>
        </div>
    );
}

export default NavBarButton;