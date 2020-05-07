package main

import (
	"flag"
	"log"
	"net/http"
	"os"
	"path"
	"time"

	"github.com/abustany/goretro/retro"
	"github.com/abustany/goretro/sseconn"
)

const apiPrefix = "/api/"

func main() {
	listenAddress := flag.String("listen", "127.0.0.1:1407", "address on which to listen")

	mux := http.NewServeMux()

	apiHandler := sseconn.NewHandler(apiPrefix)
	mux.Handle(apiPrefix, apiHandler)

	// Starts the listening on new connections
	retro.NewManager(apiHandler)

	wd, err := os.Getwd()
	if err != nil {
		log.Fatalf("error getting current directory: %s", err)
	}

	mux.Handle("/", http.FileServer(http.Dir(path.Join(wd, "ui-react/build"))))

	log.Printf("Starting server on %s", *listenAddress)
	http.ListenAndServe(*listenAddress, loggingHandler(mux))
}

func loggingHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		spy := spyingResponseWriter{ResponseWriter: w}

		h.ServeHTTP(&spy, r)
		log.Printf("%s %s - %d (%s)", r.Method, r.URL.Path, spy.code, time.Since(start))
	})
}

type spyingResponseWriter struct {
	http.ResponseWriter

	code int
}

func (s *spyingResponseWriter) WriteHeader(code int) {
	if s.code == 0 {
		s.code = code
	}

	s.ResponseWriter.WriteHeader(code)
}

func (s *spyingResponseWriter) Write(data []byte) (int, error) {
	if s.code == 0 {
		s.code = http.StatusOK
	}

	return s.ResponseWriter.Write(data)
}
func (s *spyingResponseWriter) Flush() {
	if flusher, ok := s.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func (s *spyingResponseWriter) CloseNotify() <-chan bool {
	if notifier, ok := s.ResponseWriter.(http.CloseNotifier); ok {
		return notifier.CloseNotify()
	}

	return make(<-chan bool)
}
