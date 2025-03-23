// src/app/page.tsx
import RoundedContainer from '@/components/ui/RoundedContainer';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import HomeIntro from '@/components/Home/HomeIntro';

export default function HomePage() {
    return (
        <RoundedContainer label='Jun Jin'>
            <Navbar />
            <div className="flex h-[calc(100vh-80px)]">
                <Sidebar />
                <div className="flex-1 flex justify-center ml-16 mt-24">
                    <HomeIntro />
                </div>
            </div>
        </RoundedContainer>
    );
}