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

modification 2:
In demo/stitching.html add an "upload to s3", that take an AWS URL https://chit-iiif.s3.us-east-1.amazonaws.com and uplooads the stitched-manifest to AWS s3 with a prompted name 