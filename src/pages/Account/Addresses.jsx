import { useState } from 'react'
import AddressForm from '@/features/account/AddressForm.jsx'
import { EmptyState, ErrorState } from '@/components/common/States.jsx'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  MAX_ADDRESSES, createAddress, deleteAddress, listAddresses, updateAddress,
} from '@/services/addressService'

export default function Addresses() {
  useDocumentTitle('Saved addresses')
  const { user } = useAuth()
  const { data, error, loading, reload } = useAsync(() => listAddresses(user.id), [user.id])
  const [editing, setEditing] = useState(null) // null | 'new' | address id
  const [actionError, setActionError] = useState('')

  async function run(action) {
    setActionError('')
    try {
      await action()
      setEditing(null)
      reload()
    } catch (err) {
      console.error(err)
      setActionError('That didn’t work. Please try again.')
    }
  }

  const list = data ?? []

  return (
    <section className="max-w-3xl">
      <h1 className="text-4xl text-maroon">Saved addresses</h1>

      {error ? <ErrorState error={error} onRetry={reload} />
        : loading && !data ? <p className="mt-6" aria-busy="true">Loading…</p>
        : (
          <>
            {actionError && <p role="alert" className="mt-4 text-sm text-maroon">{actionError}</p>}

            {list.length === 0 && editing !== 'new' && (
              <EmptyState title="No saved addresses" message="Add one to speed up checkout."
                action={<button type="button" className="btn-primary" onClick={() => setEditing('new')}>Add an address</button>} />
            )}

            <ul className="mt-6 space-y-4">
              {list.map((a) => (
                <li key={a.id} className="border border-maroon/20 p-4">
                  {editing === a.id ? (
                    <AddressForm initial={a} submitLabel="Update address"
                      onCancel={() => setEditing(null)}
                      onSubmit={(values) => run(() => updateAddress(a.id, values))} />
                  ) : (
                    <>
                      <p className="font-medium">
                        {a.recipient_name}
                        {a.is_default && <span className="ml-2 bg-blush px-2 py-0.5 text-xs">Default</span>}
                      </p>
                      <p className="text-sm">{a.phone}</p>
                      <p className="mt-1 text-sm">{a.address_line}, {a.city_or_area}, {a.district}{a.postal_code ? ` ${a.postal_code}` : ''}</p>
                      {a.delivery_instructions && <p className="mt-1 text-sm opacity-70">Note: {a.delivery_instructions}</p>}
                      <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        <button type="button" className="underline" onClick={() => setEditing(a.id)}>Edit</button>
                        {!a.is_default && (
                          <button type="button" className="underline" onClick={() => run(() => updateAddress(a.id, { is_default: true }))}>Make default</button>
                        )}
                        <button type="button" className="underline"
                          onClick={() => { if (window.confirm('Delete this address?')) run(() => deleteAddress(a.id)) }}>Delete</button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>

            {editing === 'new' ? (
              <div className="mt-6 border border-maroon/20 p-4">
                <h2 className="mb-4 text-2xl text-maroon">New address</h2>
                <AddressForm initial={{ is_default: list.length === 0 }} onCancel={() => setEditing(null)}
                  onSubmit={(values) => run(() => createAddress(user.id, values))} />
              </div>
            ) : list.length > 0 && (
              list.length < MAX_ADDRESSES
                ? <button type="button" className="btn-secondary mt-6" onClick={() => setEditing('new')}>Add another address</button>
                : <p className="mt-6 text-sm">You’ve reached the limit of {MAX_ADDRESSES} saved addresses.</p>
            )}
          </>
        )}
    </section>
  )
}