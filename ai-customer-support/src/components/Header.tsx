'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/authStore';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();

  const navigation = {
    customer: [
      { name: 'My Tickets', href: '/dashboard/customer' },
      { name: 'New Ticket', href: '/tickets/new' },
    ],
    agent: [
      { name: 'Assigned Tickets', href: '/dashboard/agent' },
      { name: 'All Tickets', href: '/tickets' },
    ],
    supervisor: [
      { name: 'Overview', href: '/dashboard/supervisor' },
      { name: 'All Tickets', href: '/tickets' },
      { name: 'Manage Agents', href: '/agents' },
    ],
  };

  return (
    <header className="bg-white shadow">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="w-full py-6 flex items-center justify-between border-b border-indigo-500 lg:border-none">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-indigo-600">
              Support Hub
            </Link>
            {isAuthenticated && user && (
              <div className="hidden ml-10 space-x-8 lg:block">
                {navigation[user.role].map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="text-base font-medium text-gray-500 hover:text-gray-900"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="ml-10 space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  {user?.email} ({user?.role})
                </span>
                <button
                  onClick={() => logout()}
                  className="inline-block bg-indigo-600 py-2 px-4 border border-transparent rounded-md text-base font-medium text-white hover:bg-opacity-75"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-block bg-indigo-600 py-2 px-4 border border-transparent rounded-md text-base font-medium text-white hover:bg-opacity-75"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="inline-block bg-white py-2 px-4 border border-transparent rounded-md text-base font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="py-4 flex flex-wrap justify-center space-x-6 lg:hidden">
          {isAuthenticated && user &&
            navigation[user.role].map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-base font-medium text-gray-500 hover:text-gray-900"
              >
                {link.name}
              </Link>
            ))}
        </div>
      </nav>
    </header>
  );
}