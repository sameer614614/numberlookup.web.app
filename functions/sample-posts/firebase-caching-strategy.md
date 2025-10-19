---
title: Building a multi-layer cache with Firebase
date: 2024-09-12
summary: How Firestore, Realtime Database, and Cloud Storage keep lookups fast and fresh.
---

Caching the results of expensive phone intelligence calls keeps the experience instant for returning users. The Firebase edition of numberlookup layers multiple storage products to deliver resilience and speed.

### Firestore for history
We persist every lookup in Firestore with normalized metadata so we can surface trends, audit usage, and drive analytics dashboards.

### Realtime Database for hot data
The Realtime Database stores the freshest responses with an explicit TTL. Cloud Functions checks this cache before calling any third-party providers.

### Cloud Storage for content
Long-form documentation, like this very article, lives in Markdown files inside Storage. That keeps the CMS simple while enabling CDN-backed delivery.

This approach gives us transparent persistence, high availability, and predictable costs without maintaining bespoke infrastructure.
