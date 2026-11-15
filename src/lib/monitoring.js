export function captureError(error, context = {}) {
    console.error('[error]', error, context)
    // To add monitoring later, forward it here, e.g.:
    // Sentry.captureException(error, { extra: context })
}

export function installGlobalErrorHandlers() {
    window.addEventListener('unhandledrejection', (e) => captureError(e.reason, { type: 'unhandledrejection' }))
    window.addEventListener('error', (e) => captureError(e.error ?? e.message, { type: 'window.error' }))
}