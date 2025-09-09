# My Study App

A comprehensive learning application built with Next.js, TypeScript, and Supabase. Features AI-powered tutoring, question banks, flash cards, memory techniques, and a knowledge wiki.

## 🚀 Features

- **AI Tutor**: Personalized learning assistance with AI-powered tutoring
- **Question Bank**: Comprehensive collection of practice questions
- **Flash Cards**: Interactive flash card system with spaced repetition
- **Memory Castle**: Advanced memory techniques using the method of loci
- **Knowledge Wiki**: Comprehensive learning resources and articles
- **Responsive Design**: Modern UI built with Tailwind CSS
- **Dark Mode**: Automatic dark mode support
- **TypeScript**: Full type safety throughout the application

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **Font**: Geist Sans & Geist Mono
- **Linting**: ESLint

## 📁 Project Structure

```
my-study-app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── ai-tutor/          # AI Tutor page
│   │   ├── flash-cards/       # Flash Cards page
│   │   ├── memory-castle/     # Memory Castle page
│   │   ├── question-bank/     # Question Bank page
│   │   ├── wiki/              # Wiki page
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   └── lib/
│       └── supabaseClient.ts  # Supabase client configuration
├── public/                    # Static assets
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm, yarn, pnpm, or bun package manager

### Installation

1. **Clone the repository** (if not already done):
   ```bash
   cd "/Users/VSCode Projects/my-study-app"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Supabase** (optional for basic functionality):
   - Create a new project at [supabase.com](https://supabase.com)
   - Get your project URL and anon key from Settings > API
   - Update `src/lib/supabaseClient.ts` with your credentials:
     ```typescript
     const supabaseUrl = 'your-project-url'
     const supabaseAnonKey = 'your-anon-key'
     ```

### Running the Development Server

Start the development server with Turbopack for faster builds:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Other Available Scripts

- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint for code quality checks

## 🎯 Usage

1. **Home Page**: Navigate to different sections of the app
2. **AI Tutor**: Access AI-powered learning assistance (coming soon)
3. **Question Bank**: Browse and practice with questions (coming soon)
4. **Flash Cards**: Create and study flash cards (coming soon)
5. **Memory Castle**: Learn memory techniques (coming soon)
6. **Wiki**: Explore learning resources (coming soon)

## 🔧 Configuration

### Environment Variables

For production deployment, create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Supabase Setup

1. Create tables for:
   - Users
   - Questions
   - Flash Cards
   - Study Sessions
   - Wiki Articles

2. Set up Row Level Security (RLS) policies

3. Configure authentication if needed

## 🌐 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Add your environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- Self-hosted with Docker

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Next.js Documentation](https://nextjs.org/docs)
2. Review the [Supabase Documentation](https://supabase.com/docs)
3. Open an issue on GitHub

## 🎉 What's Next

The application is currently in its initial setup phase. Future developments include:

- Implementing AI tutor functionality
- Building the question bank system
- Creating flash card management
- Developing memory palace features
- Populating the knowledge wiki
- Adding user authentication
- Implementing progress tracking
- Mobile app development
