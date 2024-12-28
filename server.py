import http.server
import socketserver
import sys
import os

def start_server(port=8000):
    try:
        handler = http.server.SimpleHTTPRequestHandler
        handler.extensions_map.update({
            '.js': 'application/javascript',
        })
        
        while True:
            try:
                with socketserver.TCPServer(("", port), handler) as httpd:
                    print(f"Server started at http://localhost:{port}")
                    httpd.serve_forever()
            except OSError as e:
                if e.errno == 48:  # Address already in use
                    port += 1
                    print(f"Port {port-1} is in use, trying port {port}")
                else:
                    raise e
            except KeyboardInterrupt:
                print("\nShutting down server...")
                sys.exit(0)
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_server() 