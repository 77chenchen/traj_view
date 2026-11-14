"""Serve the viewer and its local dataset without directory listings."""

import json

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from mimetypes import guess_type
from pathlib import Path
from shutil import copyfileobj
from tempfile import TemporaryDirectory
from urllib.parse import unquote, urlsplit

from .storage import safe_child, export_html, dataset_index


def make_server(host: str, port: int, frontend: Path, dataset: Path, live=None) -> ThreadingHTTPServer:
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            path = urlsplit(self.path).path
            if path == '/api/report.html':
                try:
                    with TemporaryDirectory(prefix='trajviz-report-') as directory:
                        report = Path(directory) / 'trajviz-report.html'
                        export_html(dataset, dataset_index(dataset), frontend, report)
                        payload = report.read_bytes()
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/html; charset=utf-8')
                    self.send_header('Content-Disposition', 'attachment; filename="trajviz-report.html"')
                    self.send_header('Content-Length', str(len(payload)))
                    self.send_header('Cache-Control', 'no-store')
                    self.end_headers()
                    self.wfile.write(payload)
                except (ValueError, OSError, KeyError, TypeError):
                    self.send_error(503, 'Report export unavailable; check the local dataset and frontend build')
                return
            if path == '/api/live/status':
                payload = json.dumps(live.status() if live else {'enabled': False}).encode()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(payload)))
                self.send_header('Cache-Control', 'no-store')
                self.end_headers()
                self.wfile.write(payload)
                return
            if path == '/api/live/events' and live:
                self.send_response(200)
                self.send_header('Content-Type', 'text/event-stream')
                self.send_header('Cache-Control', 'no-store')
                self.end_headers()
                previous = None
                try:
                    while not live.stop_event.is_set():
                        payload = json.dumps(live.status())
                        if payload != previous:
                            previous = payload
                            self.wfile.write(('data: ' + payload + '\n\n').encode())
                        else:
                            self.wfile.write(b': heartbeat\n\n')
                        self.wfile.flush()
                        live.stop_event.wait(1)
                except (BrokenPipeError, ConnectionResetError):
                    pass
                return
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
