<div align="center">
  <h1>KwaQuiz</h1>
  <p>A self-hosted quiz platform for live events, inspired by the original <a href="https://github.com/Ralex91/Rahoot">Rahoot</a> project.</p>
</div>

## What is KwaQuiz?

KwaQuiz lets you run live quiz shows from your own server. The manager screen controls the flow (start, skip, pause/break, resume), and players join from their devices. Media (images/audio/video) is hosted locally so redeploys don’t wipe questions.

## What’s included

- **Quiz editor**: create/edit quizzes in the UI, delete quizzes, upload media per question.
- **Media library**: browse uploads, see usage, delete unused files.
- **Timing tools**: manual “set timing from media” to align cooldown/answer time to clip length.
- **Gameplay controls**: pause/resume, break/resume game, skip intros, end game, show leaderboard.
- **Resilience**: Redis snapshots keep game state; players/managers reconnect and resume without losing score; username/points hydrate from local storage.
- **Player list**: see connected/disconnected players; reconnect tracking persists across sessions.
- **Branding & themes**: customize brand name and background in the Theme editor.
- **Image zoom**: click to enlarge question images.

## Credits

- Original project: [Ralex91/Rahoot](https://github.com/Ralex91/Rahoot) (MIT).
- KwaQuiz is a customized fork; attribution retained under MIT.

## Quick start

### Docker (build locally)

Use the provided `compose.yml` to run web + socket + Redis (adjust image name as needed):
```bash
docker compose up -d
```

Or build your own image from this repo:
```bash
docker build -t kwaquiz:latest .
docker run -d \
  -p 3000:3000 -p 3001:3001 \
  -v $(pwd)/config:/app/config \
  -e REDIS_URL=redis://localhost:6379 \
  -e MEDIA_MAX_UPLOAD_MB=200 \
  -e WEB_ORIGIN=http://localhost:3000 \
  -e SOCKET_URL=http://localhost:3001 \
  kwaquiz:latest
```

### Local dev

```bash
pnpm install
pnpm --filter @rahoot/socket dev   # socket server on 3001
pnpm --filter @rahoot/web dev      # web on 3000
```

## Configuration & persistence

- Config, quizzes, and media live under `config/` (`config/game.json`, `config/quizz`, `config/media`). Mount `config/` as a volume so redeploys keep data.
- Redis (`REDIS_URL`) stores game snapshots so reconnect/resume works.
- Upload size: `MEDIA_MAX_UPLOAD_MB` (default 50MB).

### config/game.json
```json
{
  "managerPassword": "PASSWORD",
  "music": true
}
```

### Quizzes (UI or files)
- Manage via the in-app editor (`/manager`) or drop JSON in `config/quizz/`.
- Questions support `media` `{type:"image"|"audio"|"video", url:"..."}` and multiple correct answers (`solution` can be a number or an array).

## Gameplay flow

1) Go to `/manager`, enter the manager password.
2) Create or pick a quiz; upload media as needed.
3) Start game; players join via the invite code.
4) Use controls: pause/resume timers, break/resume the whole game, skip intros, show leaderboard, end game.
5) Players/manager can reconnect and resume with scores intact (thanks to Redis snapshots + local hydration).

## Theming/branding

- Theme editor (manager): set brand name and background image (uploads supported).
- Page title and login screens reflect your brand.

## Notes on forking & license

- MIT license retained; original copyright belongs to the Rahoot authors.
- You’re free to brand/deploy as KwaQuiz; please keep attribution in LICENSE/README.

## Support / Issues

- Open issues on this repo: <https://github.com/randyjc/kwaquiz/issues>
- Feature ideas/bugs welcome.
