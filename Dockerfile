FROM node:14.2 AS build-fe
WORKDIR /src/
COPY ui  .
RUN yarn
RUN yarn build

FROM golang:1.14-alpine AS build-be
WORKDIR /src/
COPY . .
RUN go build ./cmd/...


FROM alpine:latest
WORKDIR /root/
COPY --from=build-fe /src/build ui
COPY --from=build-be /src/goretro .

EXPOSE 80
CMD ["/root/goretro", "-ui=/root/ui/", "-listen=0.0.0.0:80"]
