FROM node:14.2 AS build-fe
WORKDIR /src/
COPY ui/package.json ui/yarn.lock ./
RUN yarn
COPY ui .
RUN yarn build

FROM golang:1.14-alpine AS build-be
WORKDIR /src/
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build ./cmd/...

FROM scratch
WORKDIR /root/
COPY --from=build-fe /src/build ui
COPY --from=build-be /src/goretro .

EXPOSE 80
CMD ["/root/goretro", "-ui=/root/ui/", "-listen=0.0.0.0:80"]
