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