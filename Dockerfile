# Simple single-stage image. Kept intentionally minimal for a local/dev assessment setup.
FROM node:22-alpine

WORKDIR /app

# Install dependencies first so this layer is cached unless the manifests change.
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy the rest of the source and build the Nest app to /app/dist.
COPY . .
RUN yarn build

EXPOSE 3000

# On container start: apply any pending DB migrations, then launch the compiled app.
# Running migrations here keeps the schema in sync without a manual step.
CMD ["sh", "-c", "yarn migration:run && node dist/main.js"]
