FROM node:20

WORKDIR /app

# Cài đặt Chromium và các thư viện cần thiết
RUN apt-get update && apt-get install -y \
    wget gpg curl ca-certificates \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# Cấu hình Puppeteer để không tải Chrome
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Cài đặt dependencies
COPY package*.json ./

RUN apt-get update && apt-get install -y ca-certificates

RUN npm install

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]