import admin from 'firebase-admin';
if (!admin.apps.length) {
    admin.initializeApp();
}
export const firestore = admin.firestore();
export const realtimeDb = admin.database();
export const storage = admin.storage();
export default admin;
