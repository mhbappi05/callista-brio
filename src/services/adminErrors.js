const CODES = {
    forbidden: 'You don’t have permission for this action.',
    invalid_status_transition: 'That status change isn’t allowed from the order’s current status.',
    order_not_found: 'That order no longer exists.',
    invalid_tracking_url: 'The tracking link must start with http:// or https://.',
    invalid_change: 'Enter a quantity change that is not zero.',
    invalid_reason: 'Choose a valid reason.',
    variant_required: 'Choose which option to adjust.',
    variant_not_applicable: 'This product has no options.',
    product_not_found: 'That product no longer exists.',
    variant_not_found: 'That option no longer exists.',
    cannot_demote_self: 'You can’t remove your own owner access.',
    invalid_role: 'That role isn’t valid.',
    single_fallback: 'Only one fallback zone is allowed. Turn it off on the other zone first.',
    FILE_TYPE: 'Use a JPG, PNG, WebP or AVIF image.',
    FILE_SIZE: 'Images must be 5 MB or smaller.',
}

export function adminErrorMessage(err) {
    if (!err) return ''
    if (CODES[err.message]) return CODES[err.message]
    if (CODES[err.code]) return CODES[err.code]
    if (err.code === '23505') return 'That value is already used (for example a slug, SKU or code). Choose a different one.'
    if (err.code === '23514') return 'One of the values isn’t allowed. Check prices, quantities and limits. Stock can’t go below zero.'
    if (err.code === '23503') return 'This record is still in use by something else.'
    if (err.code === '42501') return 'You don’t have permission for this action.'
    return 'That didn’t work. Please try again.'
}