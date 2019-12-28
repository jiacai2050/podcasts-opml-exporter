"use strict";

window.onload = function () {
  let fileInput = document.getElementById('plistFile');
  fileInput.addEventListener('change', function (e) {
    var file = fileInput.files[0];
    var reader = new FileReader();

    reader.onloadend = function (e) {
      try {
        parsePlist(reader.result);
      } catch(e)  {
        console.error(e);
        let warn = document.getElementById('warn');
        warn.innerText = e;
      }
    };
    reader.readAsText(file);
  });
}

function parsePlist(body) {
  // http://help.dottoro.com/ljbcjfot.php
  var parser = new DOMParser();
  var dom = parser.parseFromString(body, "application/xml");
  var plist = dom.documentElement;
  assert(plist, 'plist');

  var ret = [];
  var array = plist.childNodes[1];
  assert(array, 'array');
  var dict = array.childNodes[1];
  var array = dict.childNodes[3];
  for (var i=0;i<array.childNodes.length;i++) {
    var dict = array.childNodes[i];
    if (dict.nodeName === 'dict') {
      var kvs = dict.childNodes;
      if (kvs[11].firstChild.nodeValue === "Podcasts") {
        var podcasts_array = kvs[3];
        for(var m=0;m<podcasts_array.childNodes.length; m++ ) {
          var current = podcasts_array.childNodes[m];
          if (current.nodeName === 'dict') {
            ret.push(parsePodcastDict(current));
          }
        }
      }
    }
  }
  download(ret);
}

function parsePodcastDict(dict) {
  // feedUrl: "http://www.ximalaya.com/album/4324892.xml"
  // storeId: "1211598895"
  // title: "《赖世雄美语音标》讲解音频"
  // uuid: "55C5D14D-0CCC-4B79-AEA9-17CA3609F522"
  var o = {};
  for (var i=0;i<dict.childNodes.length-1;i+=4) {
    var k = dict.childNodes[i+1];
    k = k.firstChild.nodeValue;
    var v = dict.childNodes[i+3];
    v = v.firstChild.nodeValue;
    o[k] = v;
    // console.log(i, dict.childNodes[i], k ,v);
  }
  return o;
}

function generateOPML(podcasts) {
  var head = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="1.0">',
    `<head><title>macOS Podcast exporter</title><dateCreated>${new Date().toLocaleString()}</dateCreated></head>`,
    '<body>'
  ];

  var body = [];
  
  var tail = [
    '</body>',
    '</opml>'
  ];

  for(var i=0;i<podcasts.length;i++) {
    var current = podcasts[i];
    body.push(`<outline type="rss" text="${current.title}" xmlUrl="${current.feedUrl}" />`);
  }

  return head.join('\n') + body.join('\n') + tail.join('\n');
}

// https://www.bennadel.com/blog/3472-downloading-text-using-blobs-url-createobjecturl-and-the-anchor-download-attribute-in-javascript.htm
function download(podcasts) {
  var opml = generateOPML(podcasts);
  console.log("opml", opml);
  var blob = new Blob(
    [ opml ],
    {
      type : "text/plain;charset=utf-8"
    }
  );
  var downloadUrl = URL.createObjectURL( blob );
  var download = document.getElementById("download");
  download.setAttribute( "href", downloadUrl );
  download.setAttribute( "download", `Podcasts-${new Date().toLocaleString()}.opml` );
  download.click();
}

function assert(e, nodeName) {
  if (e != null && e.nodeName !== nodeName) {
    let warn = document.getElementById('warn');
    warn.innerText = e;
    console.error(e);
    alert(`expected ${nodeName}, current ${e.nodeName}`);
  }
}

