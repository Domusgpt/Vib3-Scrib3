# Claude Plugin Launch Gaps

1. **Publish-ready metadata + distribution path**  
   The plugin manifest still ships with placeholder URLs for the author homepage and repository, and the marketplace references a relative source path for local testing. Before we list this externally, swap in the real marketing site/support contact, confirm the canonical repo URL, and point the marketplace `source` to the hosted package or git tag you intend to distribute. 【F:claude-plugin/.claude-plugin/plugin.json†L1-L11】【F:claude-plugin-marketplace/.claude-plugin/marketplace.json†L1-L13】

2. **Decide on Firestore replication + lock down rules**  
   Signup touches and saved Claude memories automatically mirror into Firestore when credentials are supplied, but the repo doesn’t define the hosting project or security rules. We need to provision the target Firebase project, set least-privilege service account access, and document the read/write rules before enabling this in production so that the mirrored context stays governed. 【F:server/config/firebase.ts†L1-L81】【F:server/modules/plugin-signups/plugin-signup.service.ts†L1-L200】【F:server/modules/memory/memory.service.ts†L1-L200】
