// tools/firestore.mjs — Firebase Admin helper for updating live content.
//
// Used by local Node scripts (run by Claude) to read/modify the Firestore `site/content`
// document directly, without the browser admin page. NOT shipped to the website.
//
// Auth: uses gcloud Application Default Credentials (key-less) — no secret file needed.
// One-time setup on this machine:
//   gcloud auth application-default login --project project-686d62b7-14f5-43c7-acc
//
// Usage from another script:
//   import { getContent, patchContent, setPeople } from "./firestore.mjs";
//   const data = await getContent();
//   ...modify data.people...
//   await patchContent({ people: data.people });

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const PROJECT_ID = "project-686d62b7-14f5-43c7-acc";

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });

export const db = getFirestore();
export const contentRef = db.doc("site/content");

// Read the current live content (people, chapters, gallery, fundraisers, ...).
export async function getContent() {
    const snap = await contentRef.get();
    return snap.exists ? snap.data() : {};
}

// Merge a partial update into site/content WITHOUT clobbering other fields.
// Pass whole arrays you intend to replace (e.g. { people: [...] }).
export async function patchContent(partial) {
    await contentRef.set(
        { ...partial, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
    );
}

// Convenience: replace just the people array.
export async function setPeople(people) {
    await patchContent({ people });
}
