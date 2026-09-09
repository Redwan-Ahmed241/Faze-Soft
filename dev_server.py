import http.server
import os
import socketserver
import urllib.parse

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Prevent caching of dynamic/html files during development
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        clean_path = parsed.path.rstrip('/')

        # Root rewrite to home-1.html
        if not clean_path or clean_path == '':
            self.path = '/home-1.html' + (f'?{parsed.query}' if parsed.query else '')
            return super().do_GET()

        # If URL has .html extension, redirect to clean URL without .html
        if parsed.path.endswith('.html') and not parsed.path.startswith(('/img', '/css', '/js', '/fonts')):
            redirect_url = parsed.path[:-5]
            if parsed.query:
                redirect_url += f'?{parsed.query}'
            self.send_response(301)
            self.send_header('Location', redirect_url)
            self.end_headers()
            return

        # Check if corresponding .html file exists on disk
        # e.g., /client-portal -> client-portal.html
        local_rel = clean_path.lstrip('/')
        potential_html = os.path.join(DIRECTORY, local_rel + '.html')
        if os.path.isfile(potential_html):
            self.path = '/' + local_rel + '.html' + (f'?{parsed.query}' if parsed.query else '')
            return super().do_GET()

        # Alias /portal -> client-portal.html
        if clean_path in ['/portal']:
            self.path = '/client-portal.html' + (f'?{parsed.query}' if parsed.query else '')
            return super().do_GET()

        return super().do_GET()

if __name__ == '__main__':
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("", PORT), CleanURLHandler) as httpd:
        print(f"Serving with Clean URLs at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
