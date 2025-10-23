# Route Protection & Data Initialization

This document explains how authentication, route protection, and data initialization work in the OneCart application.

## Architecture Overview

### 1. **App Initialization** (`AppInitializer.tsx`)

The `AppInitializer` component runs on app load and:
- Fetches the latest user profile from the backend
- Loads the user's active cart
- Synchronizes cached data with the server
- Handles offline scenarios gracefully

**Location**: `frontend/src/components/AppInitializer.tsx`

**Integration**: Wrapped in the root layout (`frontend/src/app/layout.tsx`)

```tsx
<AppInitializer>
  {children}
</AppInitializer>
```

### 2. **Protected Routes** (`ProtectedRoute.tsx`)

The `ProtectedRoute` component provides route-level authentication:
- Checks if user is authenticated
- Redirects unauthenticated users to `/register`
- Shows loading state during auth check
- Prevents rendering of protected content to unauthorized users

**Location**: `frontend/src/components/ProtectedRoute.tsx`

### 3. **Route Group Structure**

Protected pages are organized under the `(protected)` route group:

```
frontend/src/app/
├── (protected)/
│   ├── layout.tsx          # Wraps all protected routes with ProtectedRoute
│   ├── cart/
│   │   └── page.tsx        # Cart page (requires auth)
│   └── search-items/
│       └── page.tsx        # Search items page (requires auth)
├── register/
│   └── page.tsx            # Registration page (public)
└── page.tsx                # Home page (public)
```

**Important**: The `(protected)` folder name doesn't affect URLs. Routes are still accessed as:
- `/cart` → Protected cart page
- `/search-items` → Protected search page
- `/register` → Public registration page

### 4. **Data Flow**

#### On App Load:
1. **Layout** mounts `AppInitializer`
2. `AppInitializer` checks if user exists in Zustand store
3. If user exists, fetch fresh data from backend:
   - User profile via `apiService.getUserProfile(userId)`
   - Active cart via `fetchCart(userId)`
4. Update Zustand stores with fresh data
5. Persist to localStorage

#### On Protected Route Access:
1. `ProtectedRoute` checks `isAuthenticated` and `user` from store
2. If not authenticated → redirect to `/register`
3. If authenticated → render page content
4. Show loading spinner during auth check

#### On Cart Operations:
1. User adds/removes items
2. API call to backend
3. On success, refresh cart from backend
4. Update Zustand store
5. Persist to localStorage
6. UI updates automatically (reactive)

## State Management

### User Store (`frontend/src/lib/store.ts`)

```typescript
interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // ...
}
```

**Persisted**: Yes (localStorage with key `onecart-store`)

**Initialized with**: Default test user data

### Cart Store (`frontend/src/lib/cartStore.ts`)

```typescript
interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
  // ...
}
```

**Persisted**: Yes (localStorage with key `cart-store`)

**Initialized with**: `null` (loaded on app init)

## Key Features

### ✅ Offline Support
- User and cart data cached in localStorage
- App works with stale data if backend is unreachable
- Automatic sync when connection restored

### ✅ Route Protection
- Automatic redirection for unauthenticated users
- Protected pages don't render without auth
- Clean loading states

### ✅ Data Synchronization
- Fresh data fetched on app load
- Cart updated after every mutation
- Optimistic UI updates with backend validation

### ✅ Performance
- Preconnect to auth services
- Cached data for instant page loads
- Shallow equality checks prevent unnecessary re-renders

## API Integration

All API calls go through `apiService` (`frontend/src/lib/api.ts`):

```typescript
// User operations
await apiService.getUserProfile(userId);
await apiService.registerUser(userData);

// Cart operations
await apiService.getActiveCart(userId);
await apiService.addToCart(cartRequest);
await apiService.removeFromCart(userId, productId);
await apiService.clearCart(userId);
```

**Base URL**: `http://localhost:4000/api`

## Security Considerations

1. **Client-Side Only**: Current implementation uses client-side state management
2. **No Auth Tokens**: User ID is stored directly (suitable for development)
3. **Public API**: Backend endpoints not protected (dev environment)

### For Production:
- [ ] Add JWT token authentication
- [ ] Implement server-side session management
- [ ] Add API route protection middleware
- [ ] Implement CSRF protection
- [ ] Add rate limiting
- [ ] Use secure cookies for tokens

## Debugging

### Check User State:
```javascript
// In browser console
JSON.parse(localStorage.getItem('onecart-store'))
```

### Check Cart State:
```javascript
// In browser console
JSON.parse(localStorage.getItem('cart-store'))
```

### Clear All Data:
```javascript
// In browser console
localStorage.clear()
```

### Enable Debug Logs:
Check browser console for:
- `🔄 Fetching user profile for: {userId}`
- `✅ User profile fetched`
- `🔄 Fetching active cart for user: {userId}`
- `✅ Cart data loaded`
- `🚫 Unauthorized access - redirecting to: /register`

## Common Issues

### Issue: "Invalid ObjectId format: 1"
**Cause**: Using number `1` instead of valid MongoDB ObjectId  
**Fix**: Ensure user ID is a valid ObjectId string (e.g., "68f74f252122160e209f4c89")

### Issue: Cart not loading
**Cause**: User ID mismatch or backend not running  
**Fix**: 
1. Check backend is running on port 4000
2. Verify user ID in localStorage matches backend user
3. Check network tab for failed API calls

### Issue: Redirected to /register unexpectedly
**Cause**: User state cleared or invalid  
**Fix**: Check localStorage for `onecart-store` data

## Testing

### Test Protected Route:
1. Clear localStorage
2. Navigate to `/cart` or `/search-items`
3. Should redirect to `/register`
4. Register/login
5. Should access protected pages

### Test Data Sync:
1. Open app
2. Check console for initialization logs
3. Verify user and cart data loaded
4. Add item to cart
5. Refresh page
6. Verify cart persisted

## File Structure

```
frontend/src/
├── components/
│   ├── AppInitializer.tsx      # Data initialization on app load
│   ├── ProtectedRoute.tsx      # Route protection wrapper
│   └── Navbar.tsx              # Shows cart badge
├── lib/
│   ├── store.ts                # User state management (Zustand)
│   ├── cartStore.ts            # Cart state management (Zustand)
│   └── api.ts                  # API service layer
└── app/
    ├── layout.tsx              # Root layout with AppInitializer
    ├── (protected)/
    │   ├── layout.tsx          # Protected routes layout
    │   ├── cart/page.tsx
    │   └── search-items/page.tsx
    └── register/page.tsx       # Public registration
```

