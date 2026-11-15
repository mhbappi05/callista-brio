import PasswordForm from '@/features/account/PasswordForm.jsx'
import { PageHeader } from '@/features/admin/ui.jsx'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function AdminPassword() {
    useDocumentTitle('Password (admin)')
    const { updatePassword } = useAuth()

    return (
        <section>
            <PageHeader title="Change password" />
            <p className="mt-2 max-w-prose text-sm">
                This account can manage orders, payments and products, so use a long, unique password and don’t reuse it anywhere else.
            </p>
            <div className="float-card mt-6 max-w-md p-5">
                <PasswordForm updatePassword={updatePassword} minLength={12} title={null} />
            </div>
        </section>
    )
}