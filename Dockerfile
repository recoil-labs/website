# Static hosting for the Recoil Labs marketing site on Cloud Run.
#
# Cloud Run needs a container listening on $PORT, so the built Vite
# bundle is served by nginx rather than uploaded to a bucket. With
# min-instances=0 an idle site costs nothing; the only penalty is a ~1s
# cold start on the first request after a quiet period.
#
# Alpine is fine here — every dependency is pure JavaScript, so there is
# no node-gyp step needing python3/make/g++.

FROM node:22-alpine AS build
WORKDIR /app

# Install against the lockfile first so dependency layers cache across
# source-only changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# `npm run build` is `tsc -b && vite build` — a type error fails the
# image build rather than shipping a broken bundle.
RUN npm run build

FROM nginx:1.27-alpine

# The nginx config lives in its own file rather than a Dockerfile
# heredoc: heredocs require BuildKit, and Cloud Build's default builder
# is the legacy one, which fails to parse them.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

COPY --from=build /app/dist /usr/share/nginx/html

ENV PORT=8080
EXPOSE 8080
