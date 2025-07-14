'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    // Check if user is accessing the correct dashboard based on their role
    const currentPath = window.location.pathname;
    const expectedPath = `/dashboard/${user.role}`;
    if (currentPath !== expectedPath) {
      router.push(expectedPath);
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !user) {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">Welcome, {user.name}</p>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}