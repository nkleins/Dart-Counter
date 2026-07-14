import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import './theme.css';
import { CreatePage } from './pages/CreatePage.js';
import { GamePage } from './pages/GamePage.js';

const router = createBrowserRouter([
  { path: '/', element: <CreatePage /> },
  { path: '/g/:slug', element: <GamePage /> },
]);

createRoot(document.getElementById('root')!).render(<StrictMode><RouterProvider router={router} /></StrictMode>);
