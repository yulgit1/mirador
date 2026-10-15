Configure mirador so layers are open by default like 

{
"window": {
"sideBarOpen": true,
"defaultSideBarPanel": "layers"
}
}

Try the server with manifest=https://chit-iiif.s3.us-east-1.amazonaws.com/manifests/newark_abbey_overlay.json

modification 1:
configure mirador in layers-open.html to have black background mode

deploy 1:
what is the best way to deploy this npm project for test and prod using AWS infrastructure, create a deployment script for test and prod

modification 2:
When I use my own manifests in the left and right pane The functionality of clicking to make point pairs doesn't work.
Please fix.  Example added resources:
https://manifests.collections.yale.edu/ycba/alma/22664181270008651
https://manifests.collections.yale.edu/ycba/obj/49291

modification 3:
In demo/stitching.html Start with No windows open and "Welcome to Mirador" screen.
Change "Welcome to Mirador" to "Mirador Layering Tool"