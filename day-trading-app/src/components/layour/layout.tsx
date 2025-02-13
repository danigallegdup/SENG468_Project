// filepath: /Users/hieuvuong/Documents/uvic/fourth year/seng468/project/SENG468_Project/day-trading-app/src/components/layout/Layout.tsx
import NavBar from "@/components/navbar/navbar";
import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="relative h-screen">
      <div className="absolute top-0 left-0 w-64 h-full">
        <NavBar />
      </div>
      <div className="pl-64 h-full">
        {children}
      </div>
    </div>
  );
}