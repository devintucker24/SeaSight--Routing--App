/**
 * Memory Castle Page
 *
 * This page will contain the memory palace technique interface.
 * Future implementation will include:
 * - Memory palace creation and management
 * - Guided tours through memory palaces
 * - Memory technique tutorials
 * - Progress tracking for memory exercises
 */

import Link from 'next/link';

export default function MemoryCastlePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-gray-900 dark:text-white">
                My Study App
              </Link>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="/ai-tutor" className="nav-link">
                AI Tutor
              </Link>
              <Link href="/question-bank" className="nav-link">
                Question Bank
              </Link>
              <Link href="/flash-cards" className="nav-link">
                Flash Cards
              </Link>
              <Link href="/memory-castle" className="nav-link text-primary-600 dark:text-primary-400">
                Memory Castle
              </Link>
              <Link href="/wiki" className="nav-link">
                Wiki
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Memory Castle
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Master advanced memory techniques with the method of loci. Coming soon!
          </p>
        </div>

        {/* Placeholder Content */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-slate-700">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              🏰 Building Memory Palace 🏰
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We&apos;re creating an immersive memory palace experience. This page will soon include:
            </p>
            <ul className="text-left max-w-md mx-auto space-y-2 text-gray-600 dark:text-gray-300">
              <li>• Memory palace creation and management</li>
              <li>• Guided tours through memory palaces</li>
              <li>• Memory technique tutorials</li>
              <li>• Progress tracking for memory exercises</li>
              <li>• 3D visualization of memory palaces</li>
            </ul>
            <div className="mt-8">
              <Link href="/" className="btn-primary">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
