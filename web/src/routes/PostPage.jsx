import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { getPost } from '../apiClient.js';

function PostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPost() {
      try {
        const payload = await getPost(slug);
        if (!cancelled) {
          setPost(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load post');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPost();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="page post-page">
        <p className="muted">Loading post…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page post-page">
        <p className="form-error">{error}</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="page post-page">
        <p className="muted">Post not found.</p>
      </div>
    );
  }

  return (
    <article className="page post-page">
      <header className="post-header">
        <h1>{post.title}</h1>
        {post.date && <p className="post-meta">{new Date(post.date).toLocaleDateString()}</p>}
      </header>
      <div className="post-content">
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </div>
    </article>
  );
}

export default PostPage;
