import { useState } from 'react'
import { ErrorState } from '@/components/common/States.jsx'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  flagPayment, listPayments, listRefunds, processRefund, requestRefund, verifyPayment,
} from '@/services/adminPaymentService'
import { formatBDT } from '@/utils/currency'
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, formatDhakaDate } from '@/utils/orderLabels'

const REFUND_LABELS = { requested: 'Requested', approved: 'Approved', processed: 'Processed', rejected: 'Rejected' }
const field = 'border border-maroon/30 bg-cream px-3 py-2 text-sm'

export default function AdminPayments() {
  useDocumentTitle('Payments (admin)')
  const [tab, setTab] = useState('payments')

  return (
    <section>
      <h1 className="text-4xl text-maroon">Payments</h1>
      <div className="mt-6 flex gap-2" role="tablist" aria-label="Payments sections">
        {[['payments', 'Payments'], ['refunds', 'Refunds']].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 ${tab === key ? 'bg-maroon text-ink-light' : 'border border-maroon/40'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="mt-6">{tab === 'payments' ? <PaymentsTab /> : <RefundsTab />}</div>
    </section>
  )
}

function PaymentsTab() {
  const [status, setStatus] = useState('pending')
  const [method, setMethod] = useState('')
  const { data, error, loading, reload } = useAsync(() => listPayments({ status, method }), [status, method])

  const [open, setOpen] = useState(null) // { id, kind }
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  function begin(p, kind) {
    setOpen({ id: p.id, kind })
    setNote('')
    setAmount(kind === 'refund' ? String(p.amount) : '')
    setMsg('')
  }

  async function submit(p) {
    setBusy(true)
    setMsg('')
    try {
      if (open.kind === 'approve') await verifyPayment(p.id, true, note)
      else if (open.kind === 'reject') await verifyPayment(p.id, false, note)
      else if (open.kind === 'flag') await flagPayment(p.id, note)
      else await requestRefund(p.id, Number(amount), note)
      setOpen(null)
      reload()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setBusy(false)
    }
  }

  const canVerify = (p) => p.method !== 'gateway' && ['unpaid', 'pending', 'failed', 'requires_review'].includes(p.status)
  const canFlag = (p) => ['unpaid', 'pending', 'failed'].includes(p.status)
  const canRefund = (p) => ['paid', 'partially_refunded'].includes(p.status)

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">Status{' '}
          <select className={field} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="text-sm">Method{' '}
          <select className={field} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="">All</option>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>

      {error ? <ErrorState error={error} onRetry={reload} />
        : loading && !data ? <p className="mt-6" aria-busy="true">Loading…</p>
          : !data?.length ? <p className="mt-6">No payments match these filters.</p>
            : (
              <ul className="mt-6 divide-y divide-maroon/15 border border-maroon/20">
                {data.map((p) => (
                  <li key={p.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="text-sm">
                        <p className="font-medium">
                          {p.order?.order_number} · {formatBDT(p.amount)}
                          <span className="ml-2 bg-blush px-2 py-0.5 text-xs">{PAYMENT_STATUS_LABELS[p.status]}</span>
                        </p>
                        <p>{PAYMENT_METHOD_LABELS[p.method]} · {formatDhakaDate(p.created_at)}</p>
                        <p>{p.order?.customer_name} · {p.order?.customer_phone}</p>
                        {p.manual_transaction_id && (
                          <p>Transaction ID: <strong>{p.manual_transaction_id}</strong>
                            {p.manual_sender_phone && ` · from ${p.manual_sender_phone}`}</p>
                        )}
                        {p.verification_metadata?.note && <p className="opacity-70">Note: {p.verification_metadata.note}</p>}
                        {p.verification_metadata?.flag_note && <p className="opacity-70">Flag: {p.verification_metadata.flag_note}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        {canVerify(p) && (
                          <button type="button" className="btn-primary !px-4 !py-2" onClick={() => begin(p, 'approve')}>
                            {p.method === 'cod' ? 'Mark cash collected' : 'Verify & mark paid'}
                          </button>
                        )}
                        {canVerify(p) && p.method !== 'cod' && (
                          <button type="button" className="btn-secondary !px-4 !py-2" onClick={() => begin(p, 'reject')}>Reject</button>
                        )}
                        {canFlag(p) && (
                          <button type="button" className="btn-secondary !px-4 !py-2" onClick={() => begin(p, 'flag')}>Flag for review</button>
                        )}
                        {canRefund(p) && (
                          <button type="button" className="btn-secondary !px-4 !py-2" onClick={() => begin(p, 'refund')}>Request refund</button>
                        )}
                      </div>
                    </div>

                    {open?.id === p.id && (
                      <div className="mt-3 space-y-3 bg-blush/50 p-3">
                        {open.kind === 'approve' && p.method !== 'cod' && (
                          <p className="text-sm">Confirm the transaction ID above appears in your merchant account for {formatBDT(p.amount)} before approving.</p>
                        )}
                        {open.kind === 'refund' && (
                          <label className="block text-sm">Refund amount (৳)
                            <input type="number" min="1" step="0.01" className={`${field} ml-2 w-32`} value={amount}
                              onChange={(e) => setAmount(e.target.value)} />
                          </label>
                        )}
                        <label className="block text-sm">{open.kind === 'refund' ? 'Reason' : 'Note (optional)'}
                          <textarea rows={2} maxLength={500} className={`${field} mt-1 w-full`} value={note}
                            onChange={(e) => setNote(e.target.value)} />
                        </label>
                        {msg && <p role="alert" className="text-sm text-maroon">{msg}</p>}
                        <div className="flex gap-2">
                          <button type="button" className="btn-primary !px-4 !py-2" disabled={busy} onClick={() => submit(p)}>
                            {busy ? 'Saving…' : 'Confirm'}
                          </button>
                          <button type="button" className="btn-secondary !px-4 !py-2" onClick={() => setOpen(null)}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
    </>
  )
}

function RefundsTab() {
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'
  const { data, error, loading, reload } = useAsync(listRefunds, [])
  const [busyId, setBusyId] = useState(null)
  const [msg, setMsg] = useState('')

  async function act(id, action) {
    setBusyId(id)
    setMsg('')
    try {
      await processRefund(id, action)
      reload()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (error) return <ErrorState error={error} onRetry={reload} />
  if (loading && !data) return <p aria-busy="true">Loading…</p>
  if (!data?.length) return <p>No refunds yet.</p>

  return (
    <>
      {msg && <p role="alert" className="mb-3 text-sm text-maroon">{msg}</p>}
      {!isOwner && <p className="mb-3 text-sm">Only the owner can approve or process refunds.</p>}
      <ul className="divide-y divide-maroon/15 border border-maroon/20">
        {data.map((r) => (
          <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-medium">
                {r.order?.order_number} · {formatBDT(r.amount)}
                <span className="ml-2 bg-blush px-2 py-0.5 text-xs">{REFUND_LABELS[r.status]}</span>
              </p>
              <p>{r.order?.customer_name} · requested {formatDhakaDate(r.created_at)}</p>
              {r.reason && <p className="opacity-70">Reason: {r.reason}</p>}
            </div>
            {isOwner && (
              <div className="flex flex-wrap gap-2">
                {r.status === 'requested' && (
                  <button type="button" className="btn-primary !px-4 !py-2" disabled={busyId === r.id}
                    onClick={() => act(r.id, 'approve')}>Approve</button>
                )}
                {r.status === 'approved' && (
                  <button type="button" className="btn-primary !px-4 !py-2" disabled={busyId === r.id}
                    onClick={() => { if (window.confirm('Only confirm after you have actually sent the money back.')) act(r.id, 'mark_processed') }}>
                    Mark processed
                  </button>
                )}
                {['requested', 'approved'].includes(r.status) && (
                  <button type="button" className="btn-secondary !px-4 !py-2" disabled={busyId === r.id}
                    onClick={() => act(r.id, 'reject')}>Reject</button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}