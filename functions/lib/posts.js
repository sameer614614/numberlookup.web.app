import { storage } from './firebase.js';
import { logger } from 'firebase-functions';
import matter from 'gray-matter';
import { promises as fs } from 'fs';
import path from 'path';
function parsePost(slug, raw) {
    const file = matter(raw);
    const title = file.data.title || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const summary = file.data.summary || undefined;
    const date = file.data.date ? new Date(file.data.date).toISOString() : undefined;
    return {
        slug,
        title,
        summary,
        date,
        content: file.content,
    };
}
async function loadFromStorage(config) {
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({ prefix: config.postsPrefix });
    const posts = [];
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
        try {
            const [raw] = await file.download();
            posts.push(parsePost(slug, raw));
        }
        catch (error) {
            logger.warn(`Failed to download post ${file.name}`, error);
        }
    }
    return posts;
}
async function loadFromLocal() {
    const localDir = path.resolve(__dirname, '../sample-posts');
    let entries = [];
    try {
        entries = await fs.readdir(localDir);
    }
    catch (_error) {
        return [];
    }
    const posts = [];
    for (const entry of entries) {
        if (!entry.endsWith('.md')) {
            continue;
        }
        const slug = entry.replace(/\.md$/, '');
        try {
            const raw = await fs.readFile(path.join(localDir, entry), 'utf-8');
            posts.push(parsePost(slug, raw));
        }
        catch (error) {
            logger.warn(`Failed to load local post ${entry}`, error);
        }
    }
    return posts;
}
export async function getAllPosts(config) {
    try {
        const posts = await loadFromStorage(config);
        if (posts.length) {
            return posts
                .map(({ content: _content, ...summary }) => summary)
                .sort((a, b) => (a.date && b.date ? b.date.localeCompare(a.date) : 0));
        }
    }
    catch (error) {
        logger.warn('Failed to load posts from storage, falling back to local samples', error);
    }
    const fallback = await loadFromLocal();
    return fallback
        .map(({ content: _content, ...summary }) => summary)
        .sort((a, b) => (a.date && b.date ? b.date.localeCompare(a.date) : 0));
}
export async function getPost(config, slug) {
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
    }
    catch (error) {
        logger.warn('Failed to load post from storage, checking local fallback', error);
    }
    const localPath = path.resolve(__dirname, '../sample-posts', `${slug}.md`);
    const raw = await fs.readFile(localPath, 'utf-8').catch(() => {
        throw new Error('Post not found');
    });
    return parsePost(slug, raw);
}
