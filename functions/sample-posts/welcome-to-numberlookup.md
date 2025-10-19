---
title: Welcome to numberlookup on Firebase
date: 2024-08-01
summary: Discover how we rebuilt the lookup platform with Cloud Functions, Firestore, Realtime Database, and Storage.
---

## Why the move?

We migrated from a traditional VPS deployment to Firebase so we can iterate faster, scale instantly, and ship new features without touching servers. The new stack gives us global edge caching, infrastructure-as-code, and zero-downtime deployments.

## What changed

* **Hosting** now runs on Firebase Hosting with CDN-backed edge delivery.
* **APIs** execute inside Cloud Functions for consistent scaling and automatic security updates.
* **Data** is stored in Firestore for durable history and the Realtime Database for low-latency caching.
* **Content** lives in Cloud Storage as Markdown, making publishing a simple upload.

Stay tuned for deep dives into each part of the architecture as we continue migrating advanced features from the legacy stack.
