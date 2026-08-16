import { SignupForm } from '../../components/auth/SignupForm'

export function SignupPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">City Companion</h1>
          <p className="mt-2 text-sm text-text-secondary">Every new city deserves a familiar friend.</p>
        </div>

        <div className="card-surface p-8 shadow-xl">
          <h2 className="mb-6 text-xl font-bold text-text-primary">Create Account</h2>
          <SignupForm />
        </div>
      </div>
    </div>
  )
}
