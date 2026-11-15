import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from '@/components/layout/Layout.jsx'
import RequireAuth from '@/components/common/RequireAuth.jsx'
import RequireRole from '@/components/common/RequireRole.jsx'
import { CATALOG_ROLES, ORDER_ROLES, OWNER, STAFF } from '@/features/admin/roles.js'
import Home from '@/pages/Home.jsx'
import Shop from '@/pages/Shop.jsx'
import ProductDetails from '@/pages/ProductDetails.jsx'
import NotFound from '@/pages/NotFound.jsx'

const Collections = lazy(() => import('@/pages/Collections.jsx'))
const Contact = lazy(() => import('@/pages/Contact.jsx'))
const PolicyPage = lazy(() => import('@/pages/PolicyPage.jsx'))
const Cart = lazy(() => import('@/pages/Cart.jsx'))
const Checkout = lazy(() => import('@/pages/Checkout.jsx'))
const OrderConfirmation = lazy(() => import('@/pages/OrderConfirmation.jsx'))
const TrackOrder = lazy(() => import('@/pages/TrackOrder.jsx'))
const Auth = lazy(() => import('@/pages/Auth.jsx'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword.jsx'))
const Wishlist = lazy(() => import('@/pages/Wishlist.jsx'))

const AccountLayout = lazy(() => import('@/features/account/AccountLayout.jsx'))
const AccountOrders = lazy(() => import('@/pages/Account/Orders.jsx'))
const AccountOrderDetail = lazy(() => import('@/pages/Account/OrderDetail.jsx'))
const ReturnRequest = lazy(() => import('@/pages/Account/ReturnRequest.jsx'))
const AccountReturns = lazy(() => import('@/pages/Account/Returns.jsx'))
const AccountReviews = lazy(() => import('@/pages/Account/Reviews.jsx'))
const ReviewForm = lazy(() => import('@/pages/Account/ReviewForm.jsx'))
const Addresses = lazy(() => import('@/pages/Account/Addresses.jsx'))
const AccountNotifications = lazy(() => import('@/pages/Account/Notifications.jsx'))
const AccountProfile = lazy(() => import('@/pages/Account/Profile.jsx'))

const AdminLayout = lazy(() => import('@/features/admin/AdminLayout.jsx'))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard.jsx'))
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders.jsx'))
const AdminOrderDetail = lazy(() => import('@/pages/admin/AdminOrderDetail.jsx'))
const AdminPayments = lazy(() => import('@/pages/admin/AdminPayments.jsx'))
const AdminReturns = lazy(() => import('@/pages/admin/AdminReturns.jsx'))
const AdminCustomers = lazy(() => import('@/pages/admin/AdminCustomers.jsx'))
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts.jsx'))
const AdminProductEdit = lazy(() => import('@/pages/admin/AdminProductEdit.jsx'))
const AdminTaxonomy = lazy(() => import('@/pages/admin/AdminTaxonomy.jsx'))
const AdminReviews = lazy(() => import('@/pages/admin/AdminReviews.jsx'))
const AdminCoupons = lazy(() => import('@/pages/admin/AdminCoupons.jsx'))
const AdminDelivery = lazy(() => import('@/pages/admin/AdminDelivery.jsx'))
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings.jsx'))
const AdminBanners = lazy(() => import('@/pages/admin/AdminBanners.jsx'))
const AdminPassword = lazy(() => import('@/pages/admin/AdminPassword.jsx'))
const AdminMessages = lazy(() => import('@/pages/admin/AdminMessages.jsx'))

const guard = (roles, element) => <RequireRole roles={roles}>{element}</RequireRole>

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="product/:slug" element={<ProductDetails />} />
        <Route path="collections" element={<Collections />} />
        <Route path="about" element={<PolicyPage slug="about" />} />
        <Route path="contact" element={<Contact />} />
        <Route path="faq" element={<PolicyPage slug="faq" />} />
        <Route path="policies/:slug" element={<PolicyPage />} />

        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order-confirmation" element={<OrderConfirmation />} />
        <Route path="track" element={<TrackOrder />} />
        <Route path="auth" element={<Auth />} />
        <Route path="auth/reset" element={<ResetPassword />} />
        <Route path="wishlist" element={<RequireAuth><Wishlist /></RequireAuth>} />

        <Route path="account" element={<RequireAuth><AccountLayout /></RequireAuth>}>
          <Route index element={<Navigate to="orders" replace />} />
          <Route path="orders" element={<AccountOrders />} />
          <Route path="orders/:id" element={<AccountOrderDetail />} />
          <Route path="orders/:id/return" element={<ReturnRequest />} />
          <Route path="returns" element={<AccountReturns />} />
          <Route path="reviews" element={<AccountReviews />} />
          <Route path="reviews/new" element={<ReviewForm />} />
          <Route path="addresses" element={<Addresses />} />
          <Route path="notifications" element={<AccountNotifications />} />
          <Route path="profile" element={<AccountProfile />} />
        </Route>

        <Route path="admin" element={guard(STAFF, <AdminLayout />)}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={guard(ORDER_ROLES, <AdminOrders />)} />
          <Route path="orders/:id" element={guard(ORDER_ROLES, <AdminOrderDetail />)} />
          <Route path="payments" element={guard(ORDER_ROLES, <AdminPayments />)} />
          <Route path="returns" element={guard(ORDER_ROLES, <AdminReturns />)} />
          <Route path="customers" element={guard(ORDER_ROLES, <AdminCustomers />)} />
          <Route path="products" element={guard(CATALOG_ROLES, <AdminProducts />)} />
          <Route path="products/new" element={guard(CATALOG_ROLES, <AdminProductEdit />)} />
          <Route path="products/:id" element={guard(CATALOG_ROLES, <AdminProductEdit />)} />
          <Route path="categories" element={guard(CATALOG_ROLES, <AdminTaxonomy table="categories" />)} />
          <Route path="collections" element={guard(CATALOG_ROLES, <AdminTaxonomy table="collections" />)} />
          <Route path="reviews" element={guard(CATALOG_ROLES, <AdminReviews />)} />
          <Route path="coupons" element={guard(OWNER, <AdminCoupons />)} />
          <Route path="delivery" element={guard(OWNER, <AdminDelivery />)} />
          <Route path="settings" element={guard(OWNER, <AdminSettings />)} />
          <Route path="banners" element={guard(CATALOG_ROLES, <AdminBanners />)} />
          <Route path="password" element={<AdminPassword />} />
          <Route path="messages" element={guard(ORDER_ROLES, <AdminMessages />)} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}