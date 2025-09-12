# Build stage
FROM golang:1.22 AS build
WORKDIR /app
COPY go.mod .
RUN go mod download
COPY . .
# Ensure module graph is complete (generates go.sum) after sources are present
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/api ./cmd/api

# Runtime
FROM scratch
COPY --from=build /out/api /api
EXPOSE 8081
USER 10001:10001
ENTRYPOINT ["/api"]
