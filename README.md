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

Run localstack:
ACTIVATE_PRO=0 localstack start

To run tests in local:
docker-compose -f docker-compose.tests.local.yml up

Run playwright in UI mode:
npx playwright test --ui


Delete all docker containers:
docker rm -f $(docker ps -aq)

Delete all docker images:
docker rmi $(docker images -q)

Delete all docker builds:
docker buildx prune -a

Other clean up docker commands:
docker system prune -a --volumes -f
docker builder prune -a -f