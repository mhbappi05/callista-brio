export default function Field({ id, label, error, hint, children }) {
    return (
      <div>
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        {children}
        {hint && <p className="mt-1 text-xs opacity-70">{hint}</p>}
        {error && <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-maroon">{error}</p>}
      </div>
    )
  }