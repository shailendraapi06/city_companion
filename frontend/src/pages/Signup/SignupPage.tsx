import { SignupForm } from '../../components/auth/SignupForm'

export function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">City Companion</h1>
          <p className="mt-2 text-sm text-slate-400">
            Every new city deserves a familiar friend.
          </p>
        </div>

        <div className="mt-8 rounded-2xl bg-slate-900/60 border border-slate-800 p-8 shadow-xl backdrop-blur-xl">
          <h2 className="text-xl font-bold text-white mb-6">Create Account</h2>
          <SignupForm />
        </div>
      </div>
    </div>
  )
}
