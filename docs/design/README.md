# Some design notes for the app

## Logo

The logo uses a shader rendered using WebGL. WebGL only allows loading images
as textures when the page is being served by a server, not if you open the file
directly. You can start a local server using on port 9090 by running the
following command in this directory: `python -mhttp.server 9090` (or `python -m SimpleHTTPServer 9090`) and then
accessing [http://127.0.0.1:9090](http://127.0.0.1:9090).
