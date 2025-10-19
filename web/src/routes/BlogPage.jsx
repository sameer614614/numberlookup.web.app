import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo.jsx';
import { listPosts } from '../apiClient.js';

function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadPosts() {
      try {
        const payload = await listPosts();
        if (!cancelled) {
          setPosts(Array.isArray(payload) ? payload : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load posts');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPosts();
    return () => {
      cancelled = true;
    };
  }, []);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'CallerID Insights',
    description: 'Guides and product updates for verifying phone numbers and managing caller intelligence.',
    url: 'https://callerid.web.app/blog',
  };

  return (
    <div className="page blog-page">
      <Seo
        title="Insights & updates"
        description="Guides, feature updates, and phone intelligence tips from the CallerID team."
        canonical="/blog"
        schema={schema}
      />
      <header className="hero">
        <h1>Insights &amp; updates</h1>
        <p>Guides and feature drops that help you verify phone numbers responsibly and efficiently.</p>
      </header>

      {loading && <p className="muted">Loading posts…</p>}
      {error && <p className="form-error">{error}</p>}

      <ul className="post-list">
        {posts.map((post) => (
          <li key={post.slug} className="post-list-item">
            <Link to={`/blog/${post.slug}`} className="post-link">
              <h2>{post.title}</h2>
              {post.summary && <p className="post-summary">{post.summary}</p>}
              {post.date && <p className="post-meta">{new Date(post.date).toLocaleDateString()}</p>}
            </Link>
          </li>
        ))}
      </ul>

      {!loading && !error && posts.length === 0 && <p className="muted">No posts published yet.</p>}
    </div>
  );
}

export default BlogPage;
