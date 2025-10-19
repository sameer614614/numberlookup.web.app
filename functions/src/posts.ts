import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import matter from 'gray-matter';
import { promises as fs } from 'fs';
import path from 'path';
import { AppConfig } from './config.js';

const storage = admin.storage();

export interface PostSummary {
  slug: string;
  title: string;
  date?: string;
  summary?: string;
}

export interface PostPayload extends PostSummary {
  content: string;
}

function parsePost(slug: string, raw: Buffer | string): PostPayload {
  const file = matter(raw);
  const title = (file.data.title as string) || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const summary = (file.data.summary as string) || undefined;
  const date = file.data.date ? new Date(file.data.date as string).toISOString() : undefined;

  return {
    slug,
    title,
    summary,
    date,
    content: file.content,
  };
}

async function loadFromStorage(config: AppConfig): Promise<PostPayload[]> {
  const bucket = storage.bucket();
  const [files] = await bucket.getFiles({ prefix: config.postsPrefix });
  const posts: PostPayload[] = [];

  for (const file of files) {
    if (!file.name.endsWith('.md')) {
      continue;
    }
    const slug = file.name
      .replace(config.postsPrefix, '')
      .replace(/\.md$/, '')
      .trim();
    if (!slug) {
      continue;
    }
    const [raw] = await file.download();
    posts.push(parsePost(slug, raw));
  }

  return posts;
}

async function loadFromLocal(): Promise<PostPayload[]> {
  const localDir = path.resolve(__dirname, '../sample-posts');
  let entries: string[] = [];
  try {
    entries = await fs.readdir(localDir);
  } catch (error) {
    return [];
  }

  const posts: PostPayload[] = [];
  for (const entry of entries) {
    if (!entry.endsWith('.md')) {
      continue;
    }
    const slug = entry.replace(/\.md$/, '');
    const raw = await fs.readFile(path.join(localDir, entry));
    posts.push(parsePost(slug, raw));
  }
  return posts;
}

export async function getAllPosts(config: AppConfig): Promise<PostSummary[]> {
  try {
    const posts = await loadFromStorage(config);
    if (posts.length) {
      return posts
        .map(({ content, ...summary }) => summary)
        .sort((a, b) => (a.date && b.date ? b.date.localeCompare(a.date) : 0));
    }
  } catch (error) {
    logger.warn('Failed to load posts from storage, falling back to local samples', error);
  }

  const fallback = await loadFromLocal();
  return fallback
    .map(({ content, ...summary }) => summary)
    .sort((a, b) => (a.date && b.date ? b.date.localeCompare(a.date) : 0));
}

export async function getPost(config: AppConfig, slug: string): Promise<PostPayload> {
  if (!slug || slug.includes('/') || slug.startsWith('.')) {
    throw new Error('Post not found');
  }

  try {
    const bucket = storage.bucket();
    const file = bucket.file(`${config.postsPrefix}${slug}.md`);
    const [exists] = await file.exists();
    if (exists) {
      const [raw] = await file.download();
      return parsePost(slug, raw);
    }
  } catch (error) {
    logger.warn('Failed to load post from storage, checking local fallback', error);
  }

  const localPath = path.resolve(__dirname, '../sample-posts', `${slug}.md`);
  const raw = await fs.readFile(localPath, 'utf-8').catch(() => {
    throw new Error('Post not found');
  });
  return parsePost(slug, raw);
}
