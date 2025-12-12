from http.server import HTTPServer, SimpleHTTPRequestHandler
import base64
import os

# Configuration
SHARED_FOLDER = "/home/yeaish/cuet-micro-ops-hackthon-2025"
PORT = 8000

# Authentication credentials (username:password)
AUTHORIZED_USERS = {
    "j": "joyonta",
    "p": "priyanghsu"
}

class AuthHTTPRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Serve files from the shared folder
        super().__init__(*args, directory=SHARED_FOLDER, **kwargs)
    
    def do_AUTHHEAD(self):
        self.send_response(401)
        self.send_header('WWW-Authenticate', 'Basic realm="Secure File Server"')
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(b'Authentication required')
    
    def check_auth(self):
        auth_header = self.headers.get('Authorization')
        if auth_header is None:
            return False
        
        try:
            # Decode the base64 encoded credentials
            auth_decoded = base64.b64decode(auth_header.split(' ')[1]).decode('utf-8')
            username, password = auth_decoded.split(':', 1)
            
            # Check if credentials are valid
            if username in AUTHORIZED_USERS and AUTHORIZED_USERS[username] == password:
                return True
        except Exception as e:
            print(f"Authentication error: {e}")
            return False
        
        return False
    
    def do_GET(self):
        # Check authentication before serving files
        if self.check_auth():
            return SimpleHTTPRequestHandler.do_GET(self)
        else:
            self.do_AUTHHEAD()
    
    def do_HEAD(self):
        if self.check_auth():
            return SimpleHTTPRequestHandler.do_HEAD(self)
        else:
            self.do_AUTHHEAD()

def run_server():
    # Create shared folder if it doesn't exist
    if not os.path.exists(SHARED_FOLDER):
        os.makedirs(SHARED_FOLDER)
        print(f"Created folder: {SHARED_FOLDER}")
    
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, AuthHTTPRequestHandler)
    
    print(f"Starting secure file server on port {PORT}")
    print(f"Serving files from: {os.path.abspath(SHARED_FOLDER)}")
    print(f"Access at: http://localhost:{PORT}")
    print("\nAuthorized users:")
    for username in AUTHORIZED_USERS.keys():
        print(f"  - {username}")
    print("\nPress Ctrl+C to stop the server")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")

if __name__ == '__main__':
    run_server()