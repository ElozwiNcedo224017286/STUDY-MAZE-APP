# Study Maze

Study Maze is an Expo / React Native learning app. The mobile app is already expected to be set up on your machine. This README focuses on running the Python Flask backend correctly and making sure the app connects to it.

The Flask backend powers the AI features:

- Maze Mentor chat
- Smart Solver
- Image, audio, and document study help

## Backend Requirements

Install Python first if you do not already have it:

- Python download: https://www.python.org/downloads/
- pip installation guide: https://pip.pypa.io/en/stable/installation/
- Gemini API key guide: https://ai.google.dev/gemini-api/docs/api-key

Python 3.10 or newer is recommended.

Check Python:

```powershell
py --version
```

Check pip:

```powershell
py -m pip --version
```

## 1. Open The Backend Folder

From the project root:

```powershell
cd C:\PROJECTS\github\STUDY-MAZE-APP\backend
```

## 2. Create A Virtual Environment

Create a local Python environment for the backend:

```powershell
py -m venv .venv
```

Activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

After activation, your terminal should show `(.venv)` at the start of the line.

If PowerShell blocks activation, run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Then activate again:

```powershell
.\.venv\Scripts\Activate.ps1
```

## 3. Install Python Dependencies

Install everything listed in `backend/requirements.txt`:

```powershell
pip install -r requirements.txt
```

This installs:

- Flask
- Flask CORS
- Google GenAI SDK
- python-dotenv

## 4. Add The Gemini API Key

Create a file called `.env` inside the `backend` folder:

```text
backend/.env
```

Add your Gemini key:

```env
GEMINI_API_KEY=your-gemini-api-key
```

The backend will not run AI requests correctly without this key.

## 5. Start The Flask Backend

Make sure you are still inside the backend folder:

```powershell
cd C:\PROJECTS\github\STUDY-MAZE-APP\backend
```

Start Flask:

```powershell
py app.py
```

If it starts correctly, you should see something like:

```text
Study Maze Smart Learn backend -> http://0.0.0.0:5000
```

Keep this terminal open while using the app.

## 6. Test The Backend

Open a second terminal and run:

```powershell
curl http://127.0.0.1:5000/health
```

You should get a JSON response saying the Study Maze Smart Learn API is running.

If this works, the Flask backend is running correctly.

## 7. Connect The App To Flask

The app reads the Flask URL from the root `.env` file:

```text
C:\PROJECTS\github\STUDY-MAZE-APP\.env
```

Set this value:

```env
EXPO_PUBLIC_FLASK_API_URL=http://YOUR_COMPUTER_IP:5000
```

Example:

```env
EXPO_PUBLIC_FLASK_API_URL=http://192.168.68.113:5000
```

Important:

- Do not put a space before `http`.
- Your phone and computer must be on the same Wi-Fi.
- Use your computer's IPv4 address, not `localhost`, when testing on a real phone.
- Restart Expo after changing `.env`.

Find your computer IP:

```powershell
ipconfig
```

Use the `IPv4 Address`.

For Android emulator, use:

```env
EXPO_PUBLIC_FLASK_API_URL=http://10.0.2.2:5000
```

For browser/web testing, use:

```env
EXPO_PUBLIC_FLASK_API_URL=http://127.0.0.1:5000
```

## 8. Run The App And Backend Together

Use two terminals.

Terminal 1, run Flask:

```powershell
cd C:\PROJECTS\github\STUDY-MAZE-APP\backend
.\.venv\Scripts\Activate.ps1
py app.py
```

Terminal 2, run Expo:

```powershell
cd C:\PROJECTS\github\STUDY-MAZE-APP
npx expo start --clear
```

Then open the app with Expo Go or an emulator.

The flow is:

```text
Study Maze app -> EXPO_PUBLIC_FLASK_API_URL -> Flask backend -> Gemini API
```

So when a student uses Maze Mentor or Smart Solver:

1. The app sends the message, image, audio, or document to Flask.
2. Flask sends the request to Gemini.
3. Gemini returns the AI response.
4. Flask sends the response back to the app.

## Common Problems

### Flask Starts But AI Does Not Work

Check `backend/.env`:

```env
GEMINI_API_KEY=your-gemini-api-key
```

Restart Flask after editing the file.

### App Says It Cannot Reach Smart Learn

Check that:

- Flask is still running
- The root `.env` has the correct `EXPO_PUBLIC_FLASK_API_URL`
- Your phone and computer are on the same Wi-Fi
- You used your computer IPv4 address
- Windows Firewall is not blocking Python

### Backend Health Check Fails

Make sure Flask is running:

```powershell
py app.py
```

Then test again:

```powershell
curl http://127.0.0.1:5000/health
```

### Environment Changes Are Not Updating

Restart Expo:

```powershell
npx expo start --clear
```

Restart Flask:

```powershell
py app.py
```

## Main Files

- `backend/app.py` - Flask backend
- `backend/requirements.txt` - Python dependencies
- `backend/system_instructions.txt` - AI tutor instructions
- `src/api/ai.js` - Mobile app client that calls Flask
- `.env` - App environment variables
- `backend/.env` - Backend environment variables

## Generate Study Notes From a PDF

The `generate-study-notes` Edge Function sends the validated PDF to Gemini.
Set a Gemini API key in the Supabase project before using this feature. In the
Supabase dashboard, open **Edge Functions → Secrets** and add
`GEMINI_API_KEY`, or use the CLI from the project root:

```powershell
supabase link --project-ref <your-project-ref>
supabase secrets set GEMINI_API_KEY="your-google-ai-studio-api-key"
supabase functions deploy generate-study-notes
```

Keep the key in Supabase secrets; do not add it to the app's public `.env`.
Supabase makes newly set secrets available to Edge Functions immediately. Deploy
the function command above when you need to publish local function code changes.
The app now displays the Edge Function's response message when note generation
fails, which makes missing secrets and provider errors easier to identify.

## Email Important Announcements

Notifications already appear in the app. To also email announcements to
`nelozwi@gmail.com`, the Supabase project needs a Resend account and a database
webhook. Only rows with category `announcement` are emailed; other app notices
are unchanged.

1. Verify a sender domain or sender address in Resend and create a Resend API
   key. Resend requires the sender address to be verified.
2. Generate a long random webhook secret. In PowerShell, you can generate one
   with:

   ```powershell
   [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
   ```

3. From the project root, set the function secrets (replace the placeholders):

   ```powershell
   supabase secrets set RESEND_API_KEY="re_..." ANNOUNCEMENT_EMAIL="nelozwi@gmail.com" ANNOUNCEMENT_FROM_EMAIL="Study Maze <announcements@your-verified-domain.com>" ANNOUNCEMENT_WEBHOOK_SECRET="your-generated-random-secret"
   supabase functions deploy email-announcement --no-verify-jwt
   ```

4. In the Supabase dashboard, create a Database Webhook for `public.notifications`
   on **Insert**. Set its URL to
   `https://<project-ref>.supabase.co/functions/v1/email-announcement`, method
   `POST`, and add the header `x-announcement-secret` with the same generated
   secret. The webhook sends the inserted row as `record`; the function ignores
   rows whose category is not `announcement`.

Once configured, each announcement remains in the app notification list and is
also emailed to the address above. Keep the Resend API key and webhook secret in
Supabase secrets; do not put them in the app's `.env` file.\n
