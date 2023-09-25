# NSP Pro

## Local Dev
Start a Mongo instance via
```
docker compose up -d
```
Backend
```
cd backend && poetry install
poetry shell
python src/main.py
```
Frontend
```
cd frontend && npm install
npm run dev
```

Then go play on http://localhost:3000