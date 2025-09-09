/**
 * Question Bank Page
 *
 * This page will contain the question bank interface.
 * Future implementation will include:
 * - Browse questions by subject and difficulty
 * - Practice tests and quizzes
 * - Question search and filtering
 * - Progress tracking for answered questions
 */

import Link from 'next/link';

export default function QuestionBankPage() {
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
              <Link href="/question-bank" className="nav-link text-primary-600 dark:text-primary-400">
                Question Bank
              </Link>
              <Link href="/flash-cards" className="nav-link">
                Flash Cards
              </Link>
              <Link href="/memory-castle" className="nav-link">
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
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Question Bank
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Access thousands of practice questions across all subjects. Coming soon!
          </p>
        </div>

        {/* Placeholder Content */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-slate-700">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              📚 Building Question Library 📚
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We&apos;re compiling a comprehensive collection of practice questions. This page will soon include:
            </p>
            <ul className="text-left max-w-md mx-auto space-y-2 text-gray-600 dark:text-gray-300">
              <li>• Browse questions by subject and difficulty</li>
              <li>• Practice tests and quizzes</li>
              <li>• Question search and filtering</li>
              <li>• Progress tracking for answered questions</li>
              <li>• Performance analytics and insights</li>
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
