# Adding Firebase Service Account to Vercel

The backend API requires the Firebase Admin SDK to be authenticated with a Service Account to verify tokens and access the database. This is different from the frontend `VITE_FIREBASE_...` keys.

If you are seeing `500 FUNCTION_INVOCATION_FAILED` or errors related to "Firebase Admin not initialized", you likely need to add the Service Account credentials to Vercel.

## Step 1: Generate a New Private Key

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. Click the ⚙️ **Settings** icon (gear) next to "Project Overview" in the sidebar and select **Project settings**.
4. Navigate to the **Service accounts** tab.
5. Ensure "Node.js" is selected.
6. Click the **Generate new private key** button.
7. Confirm by clicking **Generate key**.
8. A JSON file will be downloaded to your computer (e.g., `snipshift-firebase-adminsdk-xyz.json`).

## Step 2: Prepare the Key for Vercel

Vercel environment variables are strings. You need to convert the contents of the JSON file into a single-line string or ensure it's pasted correctly.

1. Open the downloaded JSON file in a text editor (VS Code, Notepad, etc.).
2. Copy the **entire content** of the file.
3. (Optional but recommended) Minify the JSON to remove newlines and spaces. You can use an online tool or just ensure you copy it as-is. The backend is set up to parse the JSON string.

## Step 3: Add to Vercel Environment Variables

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and select the project.
2. Navigate to **Settings** > **Environment Variables**.
3. Add a new variable:
   - **Key**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: Paste the content of the JSON file you copied in Step 2.
4. Select the environments where this is needed (usually **Production** and **Preview**, maybe **Development**).
5. Click **Save**.

## Step 4: Redeploy

Environment variables are applied at build/deployment time (or runtime for serverless functions).

1. Go to the **Deployments** tab in Vercel.
2. Redeploy your latest commit (or push a new empty commit) to ensure the new environment variable is picked up by the serverless functions.

## Verification

The backend `api/src/config/firebase.ts` is configured to look for `process.env.FIREBASE_SERVICE_ACCOUNT` first:

```typescript
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    // ...
  } catch (e) {
    // ...
  }
}
```

Once redeployed, the backend should be able to initialize Firebase Admin correctly.

