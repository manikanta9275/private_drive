# Deployment

This project is prepared for a Vercel frontend and Render backend deployment.

## 1. Push the repository

Push the `private-pdf-drive` folder to a private GitHub repository. Do not commit either `.env` file. The local frontend environment file is ignored by Git, and the backend already ignores `.env`.

Because credentials were previously present in the local environment file, rotate the MongoDB user password, Cloudinary API secret, and JWT secret before going live.

## 2. Deploy the backend on Render

1. Create a new Render Web Service from the repository.
2. Set the root directory to `backend`.
3. Use Node as the runtime.
4. Build command: `npm install`
5. Start command: `npm start`
6. Add the variables from `backend/.env.example` in Render Environment.
7. Set `CLIENT_URL` to the final Vercel URL.

The root `render.yaml` can also be used as a Render Blueprint. Render will provide a URL such as `https://private-pdf-drive-api.onrender.com`.

## 3. Deploy the frontend on Vercel

1. Import the same repository into Vercel.
2. Set the project root directory to `frontend`.
3. Framework preset: `Vite`.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Add `VITE_API_URL` with the Render backend URL, without a trailing slash.

The included `frontend/vercel.json` keeps React Router routes working after refresh.

## 4. Complete the CORS connection

After Vercel creates the production URL, copy it into Render as `CLIENT_URL`, then redeploy the backend. Test the Render health URL first:

```text
https://your-backend.onrender.com/
```

It should return the API status JSON. Then open the Vercel URL and test login, upload, preview, download, folders, rename, and administrator controls.

## Environment variables

Use `backend/.env.example` and `frontend/.env.example` as key lists only. Never paste real secrets into committed files or deployment documentation.