import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout.jsx'
import RequireAuth from '@/components/common/RequireAuth.jsx'
import Home from '@/pages/Home.jsx'
import Shop from '@/pages/Shop.jsx'
import Collections from '@/pages/Collections.jsx'
import ProductDetails from '@/pages/ProductDetails.jsx'
import About from '@/pages/About.jsx'
import Contact from '@/pages/Contact.jsx'
import Cart from '@/pages/Cart.jsx'
import Checkout from '@/pages/Checkout.jsx'
import Auth from '@/pages/Auth.jsx'
import ResetPassword from '@/pages/ResetPassword.jsx'
import Wishlist from '@/pages/Wishlist.jsx'
import Addresses from '@/pages/Account/Addresses.jsx'
import NotFound from '@/pages/NotFound.jsx'
import OrderConfirmation from '@/pages/OrderConfirmation.jsx'
import TrackOrder from '@/pages/TrackOrder.jsx'
import RequireRole from '@/components/common/RequireRole.jsx'
import AdminPayments from '@/pages/admin/AdminPayments.jsx'
import AdminLayout from '@/features/admin/AdminLayout.jsx'
import { CATALOG_ROLES, ORDER_ROLES, OWNER, STAFF } from '@/features/admin/roles.js'
import AdminDashboard from '@/pages/admin/AdminDashboard.jsx'
import AdminOrders from '@/pages/admin/AdminOrders.jsx'
import AdminOrderDetail from '@/pages/admin/AdminOrderDetail.jsx'
import AdminProducts from '@/pages/admin/AdminProducts.jsx'
import AdminProductEdit from '@/pages/admin/AdminProductEdit.jsx'
import AdminTaxonomy from '@/pages/admin/AdminTaxonomy.jsx'
import AdminReviews from '@/pages/admin/AdminReviews.jsx'
import AdminCoupons from '@/pages/admin/AdminCoupons.jsx'
import AdminSettings from '@/pages/admin/AdminSettings.jsx'
import AdminDelivery from '@/pages/admin/AdminDelivery.jsx'
import AdminCustomers from '@/pages/admin/AdminCustomers.jsx'

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="collections" element={<Collections />} />
        <Route path="product/:slug" element={<ProductDetails />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="auth" element={<Auth />} />
        <Route path="auth/reset" element={<ResetPassword />} />
        <Route path="wishlist" element={<RequireAuth><Wishlist /></RequireAuth>} />
        <Route path="account/addresses" element={<RequireAuth><Addresses /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
        <Route path="order-confirmation" element={<OrderConfirmation />} />
        <Route path="track" element={<TrackOrder />} />
        <Route path="admin/payments" element={
          <RequireRole roles={['owner', 'order_manager']}><AdminPayments /></RequireRole>
        } />
        <Route path="admin" element={<RequireRole roles={STAFF}><AdminLayout /></RequireRole>}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<RequireRole roles={ORDER_ROLES}><AdminOrders /></RequireRole>} />
          <Route path="orders/:id" element={<RequireRole roles={ORDER_ROLES}><AdminOrderDetail /></RequireRole>} />
          <Route path="payments" element={<RequireRole roles={ORDER_ROLES}><AdminPayments /></RequireRole>} />
          <Route path="customers" element={<RequireRole roles={ORDER_ROLES}><AdminCustomers /></RequireRole>} />
          <Route path="products" element={<RequireRole roles={CATALOG_ROLES}><AdminProducts /></RequireRole>} />
          <Route path="products/new" element={<RequireRole roles={CATALOG_ROLES}><AdminProductEdit /></RequireRole>} />
          <Route path="products/:id" element={<RequireRole roles={CATALOG_ROLES}><AdminProductEdit /></RequireRole>} />
          <Route path="categories" element={<RequireRole roles={CATALOG_ROLES}><AdminTaxonomy table="categories" /></RequireRole>} />
          <Route path="collections" element={<RequireRole roles={CATALOG_ROLES}><AdminTaxonomy table="collections" /></RequireRole>} />
          <Route path="reviews" element={<RequireRole roles={CATALOG_ROLES}><AdminReviews /></RequireRole>} />
          <Route path="coupons" element={<RequireRole roles={OWNER}><AdminCoupons /></RequireRole>} />
          <Route path="delivery" element={<RequireRole roles={OWNER}><AdminDelivery /></RequireRole>} />
          <Route path="settings" element={<RequireRole roles={OWNER}><AdminSettings /></RequireRole>} />
        </Route>
      </Route>
    </Routes>
  )
}