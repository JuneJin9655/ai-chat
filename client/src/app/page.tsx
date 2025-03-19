// src/app/page.tsx
import Link from 'next/link';

export default function HomePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2">
            <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
                <h1 className="text-6xl font-bold">
                    Welcome
                    <span className="text-blue-600"> AIChat</span>
                </h1>

                <p className="mt-3 text-2xl">
                    Start to chat with AI
                </p>

                <div className="flex flex-wrap items-center justify-around max-w-4xl mt-6 sm:w-full">
                    <Link
                        href="/login"
                        className="p-6 mt-6 text-left border w-96 rounded-xl hover:text-blue-600 focus:text-blue-600"
                    >
                        <h3 className="text-2xl font-bold">Login &rarr;</h3>
                        <p className="mt-4 text-xl">
                            Login for Chat
                        </p>
                    </Link>

                    <Link
                        href="/register"
                        className="p-6 mt-6 text-left border w-96 rounded-xl hover:text-blue-600 focus:text-blue-600"
                    >
                        <h3 className="text-2xl font-bold">Register &rarr;</h3>
                        <p className="mt-4 text-xl">
                            Join Us!
                        </p>
                    </Link>
                </div>
            </main>
        </div>
    );
}