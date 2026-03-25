import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Root } from './Root';
import { Home } from './pages/Home'; 
import { History } from './pages/History'; 
import { Profile } from './pages/Profile'; 
import { AddBeer } from './pages/AddBeer'; 

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
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}