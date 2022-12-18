"use strict";

function log(text) {
  let info = document.getElementById('info');
  info.append(text + '\n');
}

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
        log("🛑 " + e);
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
      if (kvs.length < 11) { continue; }
      if (kvs[11].firstChild.nodeValue === "Podcasts") {
        var podcasts_array = kvs[3];
        for(var m=0;m<podcasts_array.childNodes.length; m++ ) {
          var current = podcasts_array.childNodes[m];
          if (current.nodeName === 'dict') {
            let podcast = parsePodcastDict(current)
            if (podcast) {
              ret.push(parsePodcastDict(current));
            }
          }
        }
      }
    }
  }
  download(ret);
  log(`✅ Exported ${ret.length} podcasts`);
}

function parsePodcastDict(dict) {
  // feedUrl: "http://www.ximalaya.com/album/4324892.xml"
  // storeId: "1211598895"
  // title: "《赖世雄美语音标》讲解音频"
  // uuid: "55C5D14D-0CCC-4B79-AEA9-17CA3609F522"
  var o = {};
  for (var i=0;i<dict.children.length-1;i=i+=2) {
    var k = dict.children[i];
    k = k.textContent;
    var v = dict.children[i+1];
    v = v.textContent;
    o[k] = v;
    // console.log(i, dict.childNodes[i], k ,v);
    if (k==='title') {
      o.title = v.replace(/&/g, ' and ').replace(/\s{2,}/g, ' ');
    } else if (k==='feedUrl') {
      o.feedUrl = v.replace( /&/g, '&amp;' );
    }
  }
  if (!o.feedUrl) {
    log(`⚠️ Exclude podcast "${o.title}" due to missing feed url`)
    return null;
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

