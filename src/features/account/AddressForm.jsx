import { useState } from 'react'
import { DISTRICTS } from '@/utils/districts'
import { normalizeBDPhone } from '@/utils/phone'

const EMPTY = {
  recipient_name: '', phone: '', district: '', city_or_area: '',
  postal_code: '', address_line: '', delivery_instructions: '', is_default: false,
}

export function fromRow(row) {
  if (!row) return EMPTY
  return Object.fromEntries(
    Object.keys(EMPTY).map((k) => [k, row[k] ?? (k === 'is_default' ? false : '')])
  )
}

const inputClass = 'mt-1 w-full border border-maroon/30 bg-cream px-3 py-2'

function Field({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {children}
      {error && <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-maroon">{error}</p>}
    </div>
  )
}

export default function AddressForm({ initial, onSubmit, onCancel, submitLabel = 'Save address' }) {
  const [values, setValues] = useState(fromRow(initial))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const set = (key) => (e) =>
    setValues((v) => ({ ...v, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  function validate() {
    const e = {}
    if (!values.recipient_name.trim()) e.recipient_name = 'Enter the recipient’s name.'
    if (!normalizeBDPhone(values.phone)) e.phone = 'Enter a valid Bangladesh mobile number, e.g. 01712345678.'
    if (!values.district) e.district = 'Choose a district.'
    if (!values.city_or_area.trim()) e.city_or_area = 'Enter your city or area.'
    if (!values.address_line.trim()) e.address_line = 'Enter the street address.'
    return e
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length) return

    setSaving(true)
    setFormError('')
    try {
      await onSubmit({
        recipient_name: values.recipient_name.trim(),
        phone: normalizeBDPhone(values.phone),
        district: values.district,
        city_or_area: values.city_or_area.trim(),
        postal_code: values.postal_code.trim() || null,
        address_line: values.address_line.trim(),
        delivery_instructions: values.delivery_instructions.trim() || null,
        is_default: values.is_default,
      })
    } catch (err) {
      console.error(err)
      setFormError('We couldn’t save this address. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field id="addr-name" label="Recipient name *" error={errors.recipient_name}>
        <input id="addr-name" className={inputClass} value={values.recipient_name} onChange={set('recipient_name')}
          autoComplete="name" aria-invalid={!!errors.recipient_name} aria-describedby={errors.recipient_name ? 'addr-name-error' : undefined} />
      </Field>
      <Field id="addr-phone" label="Mobile number *" error={errors.phone}>
        <input id="addr-phone" className={inputClass} value={values.phone} onChange={set('phone')} inputMode="tel"
          autoComplete="tel" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'addr-phone-error' : undefined} />
      </Field>
      <Field id="addr-district" label="District *" error={errors.district}>
        <select id="addr-district" className={inputClass} value={values.district} onChange={set('district')}
          aria-invalid={!!errors.district} aria-describedby={errors.district ? 'addr-district-error' : undefined}>
          <option value="">Select a district</option>
          {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </Field>
      <Field id="addr-area" label="City or area *" error={errors.city_or_area}>
        <input id="addr-area" className={inputClass} value={values.city_or_area} onChange={set('city_or_area')}
          aria-invalid={!!errors.city_or_area} aria-describedby={errors.city_or_area ? 'addr-area-error' : undefined} />
      </Field>
      <div className="sm:col-span-2">
        <Field id="addr-line" label="Street address *" error={errors.address_line}>
          <textarea id="addr-line" rows={2} className={inputClass} value={values.address_line} onChange={set('address_line')}
            autoComplete="street-address" aria-invalid={!!errors.address_line} aria-describedby={errors.address_line ? 'addr-line-error' : undefined} />
        </Field>
      </div>
      <Field id="addr-postal" label="Postal code (optional)">
        <input id="addr-postal" className={inputClass} value={values.postal_code} onChange={set('postal_code')}
          inputMode="numeric" autoComplete="postal-code" maxLength={12} />
      </Field>
      <Field id="addr-notes" label="Delivery instructions (optional)">
        <input id="addr-notes" className={inputClass} value={values.delivery_instructions}
          onChange={set('delivery_instructions')} maxLength={300} />
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={values.is_default} onChange={set('is_default')} />
        Use as my default address
      </label>

      {formError && <p role="alert" className="text-sm text-maroon sm:col-span-2">{formError}</p>}
      <div className="flex gap-3 sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
        {onCancel && <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}