import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function PasswordInput({ id, value, onChange, autoComplete, describedBy, invalid, ...rest }) {
    const [shown, setShown] = useState(false)

    return (
        <div className="relative mt-1">
            <input
                id={id}
                type={shown ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                autoComplete={autoComplete}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                className="w-full border border-maroon/30 bg-cream py-2 pl-3 pr-12 text-sm"
                {...rest}
            />
            <button
                type="button"
                onClick={() => setShown((s) => !s)}
                aria-label={shown ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-maroon/70 transition hover:text-maroon"
            >
                {shown ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
        </div>
    )
}