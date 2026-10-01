FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG EXPO_PUBLIC_API_URL=/api
ARG EXPO_PUBLIC_BRAND_THEME=red
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_BRAND_THEME=$EXPO_PUBLIC_BRAND_THEME
RUN npm run build:web
RUN node scripts/exercise-library.mjs requirements /app/exercise-library-required.txt

FROM nginx:1.27-alpine
COPY deployment/nginx.conf /etc/nginx/conf.d/default.conf
COPY deployment/40-check-exercise-library.sh /docker-entrypoint.d/40-check-exercise-library.sh
RUN chmod +x /docker-entrypoint.d/40-check-exercise-library.sh
COPY --from=build /app/exercise-library-required.txt /etc/nginx/exercise-library-required.txt
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
