import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Root } from './Root';
import { Home } from './pages/Home'; 
import { AuthCallback } from './pages/AuthCallback';
import { History } from './pages/History'; 
import { Profile } from './pages/Profile'; 
import { AddBeer } from './pages/AddBeer'; 
import { Privacy } from './pages/Privacy';
import { TOS } from './pages/TOS';
import { SignIn } from './pages/SignIn';

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <BrowserRouter>
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
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}