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
Permit container
Pull permit container
```
docker pull permitio/pdp-v2:latest
```
Run permit container
```
docker run -it -p 7766:7000 --env PDP_DEBUG=True --env PDP_API_KEY=<YOUR_API_KEY> permitio/pdp-v2:latest
```

Then go play on http://localhost:3000

## Automated Testing
Make sure you have run installation instructions first.
### Backend
Lint and unit test
```
cd backend && make check
```