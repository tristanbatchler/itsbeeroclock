import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
// Bug G fix: next-themes removed — theme toggle managed via localStorage in AppMenu.tsx
import { Root } from './Root';
import { AuthCallback } from './pages/AuthCallback';
import { InitialLoading } from './components/InitialLoading';

const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const History = lazy(() => import('./pages/History').then(m => ({ default: m.History })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const AddBeer = lazy(() => import('./pages/AddBeer').then(m => ({ default: m.AddBeer })));
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const TOS = lazy(() => import('./pages/TOS').then(m => ({ default: m.TOS })));
const SignIn = lazy(() => import('./pages/SignIn').then(m => ({ default: m.SignIn })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

export default function App() {
  return (
    <BrowserRouter>
        <Suspense fallback={<InitialLoading />}>
          <Routes>
            <Route path="/" element={<Root />}>
              <Route index element={<Home />} />
              <Route path="history" element={<History />} />
              <Route path="profile" element={<Profile />} />
              <Route path="add-beer" element={<AddBeer />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="tos" element={<TOS />} />
              <Route path="auth/callback" element={<AuthCallback />} />
              <Route path="sign-in" element={<SignIn />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
  );
}