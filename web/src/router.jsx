import { createBrowserRouter } from 'react-router-dom';
import Layout from './Layout.jsx';
import LookupPage from './routes/LookupPage.jsx';
import BlogPage from './routes/BlogPage.jsx';
import PostPage from './routes/PostPage.jsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />, 
    children: [
      { index: true, element: <LookupPage /> },
      { path: 'blog', element: <BlogPage /> },
      { path: 'blog/:slug', element: <PostPage /> },
    ],
  },
]);

export default router;
