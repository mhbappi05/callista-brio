import { Component } from 'react'
import { captureError } from '@/lib/monitoring'

// After a new deploy, a visitor's open tab can ask for files that no longer exist.
const isStaleBuild = (e) =>
    /dynamically imported module|Importing a module script failed|Loading chunk/i.test(String(e?.message ?? e))

export default class ErrorBoundary extends Component {
    state = { error: null }

    static getDerivedStateFromError(error) {
        return { error }
    }

    componentDidCatch(error, info) {
        captureError(error, { componentStack: info?.componentStack })
    }

    render() {
        const { error } = this.state
        if (!error) return this.props.children
        const stale = isStaleBuild(error)

        return (
            <section role="alert" className="container-page py-16 text-center">
                <h1 className="text-4xl text-maroon">
                    {stale ? 'A new version of the store is available' : 'Something went wrong'}
                </h1>
                <p className="mx-auto mt-3 max-w-md">
                    {stale
                        ? 'Please reload the page to continue.'
                        : 'This page ran into a problem. Your cart is safe. Try again, or reload the page.'}
                </p>
                <div className="mt-6 flex justify-center gap-3">
                    {!stale && (
                        <button type="button" className="btn-secondary" onClick={() => this.setState({ error: null })}>
                            Try again
                        </button>
                    )}
                    <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
                        Reload page
                    </button>
                </div>
            </section>
        )
    }
}