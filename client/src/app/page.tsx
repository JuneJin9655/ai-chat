import RoundedContainer from '@/components/ui/RoundedContainer';
import { Suspense } from 'react';
import ClientHomePage from '@/components/Home/ClientHomePage';

// SEO MetaData
export const metadata = {
    title: 'Jun Jin Portfolio Blog',
    description: 'Jun Jin Portfolio Blog, a place that records my growth',
    keywords: 'Jun Jin, Portfolio Blog, resume, SaaS, Full stack'
};

export default function HomePage() {
    return (
        <RoundedContainer label='Jun Jin'>
            <Suspense fallback={<div>Loading...</div>}>
                <ClientHomePage />
            </Suspense>
        </RoundedContainer>
    );
}