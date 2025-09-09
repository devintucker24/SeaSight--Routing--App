/**
 * Wiki Page
 *
 * This page will contain the knowledge base and wiki interface.
 * Future implementation will include:
 * - Browse articles by category and topic
 * - Search functionality for articles
 * - User contributions and editing
 * - Article version history
 */

import Link from 'next/link';

export default function WikiPage() {
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
              <Link href="/memory-castle" className="nav-link">
                Memory Castle
              </Link>
              <Link href="/wiki" className="nav-link text-primary-600 dark:text-primary-400">
                Wiki
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Knowledge Wiki
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Explore our comprehensive knowledge base with articles and learning resources. Coming soon!
          </p>
        </div>

        {/* Placeholder Content */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-slate-700">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              📖 Building Knowledge Base 📖
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We&apos;re compiling a comprehensive knowledge base for learners. This page will soon include:
            </p>
            <ul className="text-left max-w-md mx-auto space-y-2 text-gray-600 dark:text-gray-300">
              <li>• Browse articles by category and topic</li>
              <li>• Advanced search functionality</li>
              <li>• User contributions and editing</li>
              <li>• Article version history</li>
              <li>• Learning paths and curricula</li>
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
