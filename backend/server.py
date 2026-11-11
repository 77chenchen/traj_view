"""Serve the viewer and its local dataset without directory listings."""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from mimetypes import guess_type
from pathlib import Path
from shutil import copyfileobj
from urllib.parse import unquote, urlsplit

from .storage import safe_child


def make_server(host: str, port: int, frontend: Path, dataset: Path) -> ThreadingHTTPServer:
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            self.send_file(body=True)

        def do_HEAD(self) -> None:
            self.send_file(body=False)

        def send_file(self, *, body: bool) -> None:
            try:
                path = unquote(urlsplit(self.path).path)
                if path.startswith("/data/"):
                    target = safe_child(dataset, path.removeprefix("/data/"))
                else:
                    target = safe_child(frontend, path.lstrip("/") or "index.html")
                if not target.is_file():
                    self.send_error(404)
                    return
                with target.open("rb") as handle:
                    self.send_response(200)
                    self.send_header("Content-Type", guess_type(target)[0] or "application/octet-stream")
                    self.send_header("Content-Length", str(target.stat().st_size))
                    self.send_header("Cache-Control", "no-store")
                    self.send_header("X-Content-Type-Options", "nosniff")
                    self.end_headers()
                    if body:
                        copyfileobj(handle, self.wfile)
            except (BrokenPipeError, ConnectionResetError):
                return
            except (ValueError, OSError):
                self.send_error(404)

    return ThreadingHTTPServer((host, port), Handler)
