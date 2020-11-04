
 var trustSealsBase = "https://hektorcommerce.com/apps/trustseals"; 

var reda = 0;
var elementpicked = "";
var elementEmpty = "";
  let datainject = "";
let POS = ""
 url = new URL(window.location.href);
 if (url.searchParams.get('tknsalbimy')) {
   $(document).ready(function(){
		myDomOutline.start();
     
     $('<div id="token-valid"> <div id="pos-editor-instruction-container" class="picking"> <div id="pos-editor-instruction-box"> <div id="pos-editor-loading">Loading editor...</div><div id="pos-editor-instructions">Move your cursor to find where you d like to place Icons—then click to place it.</div></div></div><div id="pos-editor-actions"> <div> <a href="/"><button data-pos-editor-button="true"    >Cancel</button></a> <button data-pos-editor-button="true" class="deferent">Select different position</button> </div><div class="pos-editor-save-button"> <button data-pos-editor-button="true" id="sendplaceToServer" >Save position</button> </div></div><style>#pos-editor-instruction-container { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; z-index: 2147483647; /* max 32-bit signed */ } #pos-editor-instruction-box { display: inline-block; font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 20px; width: auto; max-width: 100%; padding: 12px; background: rgba(250, 250, 250, 0.65); color: #222; border-radius: 4px 4px 0 0; -webkit-backdrop-filter: blur(5px); backdrop-filter: blur(5px); box-shadow: 0 -1px 50px rgba(0, 0, 0, 0.5); } #pos-editor-actions > div { display: inline-block; } #pos-editor-actions .pos-editor-save-button { flex: 1; align-items: center; text-align: right; } #pos-editor-actions button { font: inherit; font-size: 16px; position: relative; display: inline-flex; align-items: center; justify-content: center; min-height: 36px; min-width: 36px; margin: 0 4px; padding: 7px 16px; background: linear-gradient(180deg,#fff,#f9fafb); border: 1px solid #c4cdd5; box-shadow: 0 1px 0 0 rgba(22,29,37,.05); border-radius: 3px; line-height: 1; color: #212b36; text-align: center; cursor: pointer; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; text-decoration: none; transition-property: background, border, box-shadow; transition-duration: .2s; transition-timing-function: cubic-bezier(.64,0,.35,1); -webkit-tap-highlight-color: transparent; } #pos-editor-actions button:hover { background: linear-gradient(180deg,#f9fafb,#f4f6f8); border-color: #c4cdd5; } #pos-editor-actions .pos-editor-save-button button { background: linear-gradient(180deg,#6371c7,#5563c1); box-shadow: inset 0 1px 0 0 #6774c8,0 1px 0 0 rgba(22,29,37,.05),0 0 0 0 transparent; } #pos-editor-actions .pos-editor-save-button button, #pos-editor-actions .pos-editor-save-button button:hover { border-color: #3f4eae; color: #fff; } #pos-editor-actions .pos-editor-save-button button:hover { background: linear-gradient(180deg,#5c6ac4,#4959bd); text-decoration: none } #pos-editor-actions .pos-editor-save-button button:focus { border-color: #202e78; box-shadow: inset 0 1px 0 0 #6f7bcb,0 1px 0 0 rgba(22,29,37,.05),0 0 0 1px #202e78; } #pos-editor-loading { display: none; } #pos-editor-instructions { display: none; } #pos-editor-status { display: none; } #pos-editor-error { display: none; } #pos-editor-instruction-container.loading #pos-editor-loading { display: block; animation: 0.5s flipInX; } #pos-editor-instruction-container.pending-choice #pos-editor-actions { display: flex; align-items: center; animation: 0.5s flipInX; } #pos-editor-instruction-container.picking #pos-editor-instructions { display: block; animation: 0.5s flipInX; } #pos-editor-instruction-container.status #pos-editor-status { display: block; animation: 0.5s flipInX; } #pos-editor-instruction-container.error #pos-editor-error { display: block; animation: 0.5s flipInX; } @keyframes flipInX { 0% { -webkit-transform: perspective(400px) rotateX(90deg); transform: perspective(400px) rotateX(90deg); -webkit-animation-timing-function: ease-in; animation-timing-function: ease-in; opacity: 0 } 40% { -webkit-transform: perspective(400px) rotateX(-20deg); transform: perspective(400px) rotateX(-20deg); -webkit-animation-timing-function: ease-in; animation-timing-function: ease-in } 60% { -webkit-transform: perspective(400px) rotateX(10deg); transform: perspective(400px) rotateX(10deg); opacity: 1 } 80% { -webkit-transform: perspective(400px) rotateX(-5deg); transform: perspective(400px) rotateX(-5deg) } to { -webkit-transform: perspective(400px); transform: perspective(400px) } }  div#pos-editor-actions { position: fixed!important; bottom: 0!important; left: 0!important; right: 0!important; text-align: center!important; } </style></div>').appendTo('body')
     checkpath()

  $('#sendplaceToServer').on('click',function(){
    sendplaceToServer(POS)
  });   
     
  });

var decodedString = selectPosition()
var data = makeTrustBadge(decodedString)
datainject = data

 } 
    else {
	console.log('run here')

    }  
  
  
  
function selectPosition() {
    var currentLocation = window.location
    var url = new URL(currentLocation);
    var c = url.searchParams.get("tknsalbimy");
    var decodedString = atob(c);
              
    console.log(decodedString)
    decodedString = JSON.parse(decodedString)

 var newURL = location.href.split("?")[0];
    window.history.pushState('object', document.title, newURL);	

  return decodedString;
}
  
  
function makeTrustBadge(recommendations) {
    var aligner = element("div");
    aligner.id = "trust-seals-content-div";
    aligner.className = "trust-seals-preview";
    setStyles(aligner, {
        "text-align": recommendations.trust_badge_alignment,
        "width": "100%"
    });
    var container = element("div");
    setStyles(container, {
        "display": "inline-block"
    });
    aligner.appendChild(container);
    var badgeWrapper = element("div");
    var badges = makeBadges(recommendations);
    badges.forEach(function(badge) {
        setStyles(badge, {
            "display": "inline-block",
            "margin": "0 7px",
            "vertical-align": "top"
        });
        badgeWrapper.appendChild(badge);
       ;
    });
    container.appendChild(badgeWrapper);
    return aligner;
}
  
  
    function element(tag) {
    return document.createElement(tag);
}
  
  
  function setStyles(element, styles) {
    Object.keys(styles).forEach(function(key) {
        element.style[key] = styles[key];
    });
}
  
  function makeBadges(recommendations) {
    var recommendedBadges = recommendations.trust_badges || [];
    var badgeElements = [];
    var elementWidth = Math.max(recommendations.trust_badge_element_width, recommendations.trust_badge_icon_size);
    recommendedBadges.forEach(function(badge) {
        var badgeElement = element("div");
        setStyles(badgeElement, {
            "width": elementWidth + "px"
        });
        var icon = element("img");
        icon.setAttribute("src", getBadgeImageURL(recommendations, badge));
        icon.setAttribute("alt", badge.label);
        setStyles(icon, {
            "width": recommendations.trust_badge_icon_size + "px",
            "height": recommendations.trust_badge_icon_size + "px"
        });
        badgeElement.appendChild(icon);
        badgeElements.push(badgeElement);
    });
    return badgeElements;
}
  
  function getBadgeImageURL(recommendations, badge) {
    var color1 = recommendations.trust_badge_color_1;
    color1 = color1.replace(/^#/, "");
    var color1URLParameter = ("&color-1=" + color1);
    var color2URLParameter = "";
    if (!/^[0]/.test(badge.icon)) {
        var color2 = recommendations.trust_badge_color_2;
        color2 = color2.replace(/^#/, "");
        color2URLParameter = ("&color-2=" + color2);
    }
    var color3URLParameter = "";
    if (!/^[0]/.test(badge.icon)) {
        var color3 = recommendations.trust_badge_color_3;
        color3 = color3.replace(/^#/, "");
        color3URLParameter = ("&color-3=" + color3);
    }
    return (trustSealsBase + "/svg_images/?image=" + badge.icon +
        color1URLParameter + color2URLParameter + color3URLParameter);
}
  

function getElementXPath(element) {
        if (element && element.id)
            return '//*[@id="' + element.id + '"]';
        else
            return getElementTreeXPath(element);
    }  
  
  function getElementTreeXPath(element) {
        var paths = [];
        for (; element && element.nodeType == Node.ELEMENT_NODE;
               element = element.parentNode)
        {
            var index = 0;
            var hasFollowingSiblings = false;
            for (var sibling = element.previousSibling; sibling;
                 sibling = sibling.previousSibling)
            {
                if (sibling.nodeType == Node.DOCUMENT_TYPE_NODE)
                    continue;

                if (sibling.nodeName == element.nodeName)
                    ++index;
            }

            for (var sibling = element.nextSibling;
                 sibling && !hasFollowingSiblings;
                 sibling = sibling.nextSibling)
            {
                if (sibling.nodeName == element.nodeName)
                    hasFollowingSiblings = true;
            }

            var tagName = (element.prefix ? element.prefix + ":" : "")
                + element.localName;
            var pathIndex = (index || hasFollowingSiblings ? "["
                + (index + 1) + "]" : "");
            paths.splice(0, 0, tagName + pathIndex);
        }

        return paths.length ? "/" + paths.join("/") : null;
    }  
  
  
  function checkpath(){
  var path = window.location.pathname.split('/')[1]
if(path ==='')
  path = 'homepage'
  
 
  var position = path
  return position;
  }
  
  
 function sendplaceToServer(pos){
 var posistion = getElementXPath(pos)
 var dataString = JSON.stringify(decodedString);
   var path = checkpath()
   var shop =window.location.host
   $.ajax({
       type: "POST",
        url:"https://13aea0d0a27b.ngrok.io/setposition",
     data:{ 'position' : posistion ,'path' : path,'statu': 1,'shop': shop  },
        success: function(data) {
        if (data) {
         console.log(data);
		window.close()

    }
   },
 error: function(error) {
       console.log("Error:" + error);
  }
  })


}
   
  
  
var DomOutline = function (options) {
  
    options = options || {};

    var pub = {};
    var self = {
        opts: {
            namespace: options.namespace || 'DomOutline',
            borderWidth: options.borderWidth || 2,
            onClick: options.onClick || false,
            filter: options.filter || false
        },
        keyCodes: {
            BACKSPACE: 8,
            ESC: 27,
            DELETE: 46
        },
        active: false,
        initialized: false,
        elements: {}
    };




 
    function removeOutlineElements() {
        jQuery.each(self.elements, function(name, element) {
            element.remove();
        });
    }
 
    function compileLabelText(element, width, height) {
        var label = element.tagName.toLowerCase();

        console.log(element)
        if (element.id) {
            label += '#' + element.id;
        }
        if (element.className) {
            label += ('.' + jQuery.trim(element.className).replace(/ /g, '.')).replace(/\.\.+/g, '.');
        }
        return element;
    }
    function getScrollTop() {
        if (!self.elements.window) {
            self.elements.window = jQuery(window);
        }
        return self.elements.window.scrollTop();
    }

 
 function clickHandler(e) {

        $('#pos-editor-instruction-container').css("display" ,"none");
        $('#pos-editor-actions').css("display" ,"block");
        $('#trust-seals-content-div').css("opacity","unset");
         pub.stop();
        return false;
    }
   
    function updateOutlinePosition(e) {
        if (e.target.className.indexOf(self.opts.namespace) !== -1) {
            return;
        }
        if (self.opts.filter) {
            if (!jQuery(e.target).is(self.opts.filter)) {
                return;
            }
        }
        pub.element = e.target;
        var b = self.opts.borderWidth;
        var scroll_top = getScrollTop();
        var pos = pub.element.getBoundingClientRect();
        var top = pos.top + scroll_top;
   var label_text = compileLabelText(pub.element, pos.width, pos.height);

 if (label_text!=reda) {

 
 reda = label_text;
 var er=  getElementTreeXPath(reda)
elementEmpty=reda;
         
   if(reda.className=="")  {
      POS=label_text;

    if (reda.className!="trust-seals-preview" && elementpicked !=er ) {
   var re= document.getElementsByClassName("ingore")
   if(re && re.length>0){
    for (var i =re.length-1; i >-1; i--) {
          re[i].remove()

    }
   }

 var cp=document.createElement("p")
    cp.className="ingore"
    cp.innerHTML='<div id="trust-seals-content-div" class="trust-seals-preview" style="text-align: center; width: 100%;">'+datainject.innerHTML+'</div>'
    elementEmpty.appendChild(cp)
    console.log(cp)
// jQuery('<p class="ingore"><p id="re222"  class="text-center12333" ><a href="#" class="btn btn-primary">Buy Now</a></p> </p>').appendTo(""+reda);
//console.log("afte"+elementpicked)
elementpicked= er;


//console.log("before"+elementpicked)
} } else{
   POS=label_text;
   if (reda.className!="trust-seals-preview" && elementpicked !=er ) {
   var re= document.getElementsByClassName("ingore")
   if(re && re.length>0){
    for (var i =re.length-1; i >-1; i--) {
          re[i].remove()
    }
   }

 var cp=document.createElement("p")
    cp.className="ingore"
    cp.innerHTML='<div id="trust-seals-content-div" class="trust-seals-preview" style="text-align: center; width: 100%;">'+datainject.innerHTML+'</div>';
    reda.appendChild(cp)
// jQuery('<p class="ingore"><p id="re222"  class="text-center12333" ><a href="#" class="btn btn-primary">Buy Now</a></p> </p>').appendTo(""+reda);
  elementpicked= er;
  elementEmpty=reda.className;

   }
   }
  //  jQuery('<div  class="ingore"><div  class="text-center"><a href="#" class="btn btn-primary">Buy Now</a></div></div>').appendTo(""+reda);

        }
            }

    function stopOnEscape(e) {
        if (e.keyCode === self.keyCodes.ESC || e.keyCode === self.keyCodes.BACKSPACE || e.keyCode === self.keyCodes.DELETE) {
        $('body').off('mouseover.' + self.opts.namespace).off('keyup.' + self.opts.namespace).off('click.' + self.opts.namespace);
        }

        return false;
    }



    pub.start = function () {
        if (self.active !== true) {
            self.active = true;
            $('body').on('mouseover.' + self.opts.namespace, updateOutlinePosition);
            $('body').on('keyup.' + self.opts.namespace, stopOnEscape);
            if (self.opts.onClick) {
                setTimeout(function () {
                    $('body').on('click.' + self.opts.namespace, function(e){
                        if (self.opts.filter) {
                            if (!$(e.target).is(self.opts.filter)) {
                                return false;
                            }
                        }
                        clickHandler.call(this, e);
                    });
                }, 50);
            }
        }
    };

 
  
    pub.stop = function () {
        self.active = false;
        $('body').off('mouseover.' + self.opts.namespace).off('keyup.' + self.opts.namespace).off('click.' + self.opts.namespace);
    };

    return pub;
};  


 var myExampleClickHandler = function (element) { console.log('Clicked element:', element); }
 var myDomOutline = DomOutline({ mouseover: myExampleClickHandler, filter: 'div' });
  
  
