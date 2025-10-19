import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import cors from 'cors';
import express from 'express';
import { getConfig } from './config.js';
import { lookupNumber } from './lookup.js';
import { getAllPosts, getPost } from './posts.js';
import { LookupError } from './veriphone.js';

if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/lookup', async (req, res) => {
  const number = String(req.query.number ?? '').trim();
  if (!number) {
    res.status(400).json({ detail: 'Query parameter "number" is required' });
    return;
  }

  try {
    const payload = await lookupNumber(number, getConfig());
    res.json(payload);
  } catch (error: unknown) {
    if (error instanceof LookupError) {
      res.status(error.status).json({ detail: error.message });
      return;
    }
    if (error instanceof Error) {
      if (error.message === 'Invalid phone number' || error.message === 'Phone number is required') {
        res.status(400).json({ detail: error.message });
        return;
      }
      res.status(500).json({ detail: error.message });
      return;
    }
    res.status(500).json({ detail: 'Unknown error' });
  }
});

app.get('/posts', async (_req, res) => {
  try {
    const posts = await getAllPosts(getConfig());
    res.json(posts);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unable to load posts';
    res.status(500).json({ detail });
  }
});

app.get('/posts/:slug', async (req, res) => {
  try {
    const post = await getPost(getConfig(), req.params.slug);
    res.json(post);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Post not found';
    const status = detail === 'Post not found' ? 404 : 500;
    res.status(status).json({ detail });
  }
});

app.get('/healthz', async (_req, res) => {
  let cacheStatus: 'ok' | 'unavailable' = 'ok';
  try {
    await admin.database().ref('.info/serverTimeOffset').get();
  } catch (_error) {
    cacheStatus = 'unavailable';
  }

  res.json({ status: 'ok', cache: cacheStatus });
});

export const api = functions.region('us-central1').https.onRequest(app);
